const router = require('express').Router()
const passport = require('passport')
const axios = require('axios')
const _pick = require('lodash/pick')
const permit = require('../middleware/authorization')
const validateResourceMW = require('../middleware/validateResource')
const studentSchemas = require('../schemas/studentSchema')

const Student = require('../models/Student')

const getAccessTokenOnBehalfOf = require('../graph/graph')

const {
  setupHeader,
  assignUser
} = require('../utils/userAssignment/assignUser')

router.get(
  '/',
  passport.authenticate('oauth-bearer', { session: false }),
  permit(['Coordinator', 'Supervisor']),
  (req, res) => {
    var query = Student.find().select({ email: 1, _id: 1 })
    query.exec((err, docs) => {
      if (err) {
        return res.status(500).json('error_retrieving_students')
      }
      res.json({ students: docs })
    })
  }
)

router.post(
  '/get_profiles',
  passport.authenticate('oauth-bearer', { session: false }),
  async (req, res) => {
    let requests = {
      requests: []
    }

    if (req.body.students.length > 0) {
      console.log(req.body.students)

      let students = req.body.students

      let i = 0
      for (let email of students) {
        requests.requests.push({
          id: i,
          method: 'GET',
          url: `/users/${email}`
        })
        i++
      }

      getAccessTokenOnBehalfOf(
        req.headers.authorization.substring(7),
        'https://graph.microsoft.com/user.read',
        accessToken => {
          axios
            .post(
              'https://graph.microsoft.com/v1.0/$batch',
              requests,
              setupHeader(accessToken)
            )
            .then(resp => {
              console.log(resp.data)

              let data = []

              for (let response of resp.data.responses) {
                if (response.status === 200) {
                  data.push(
                    _pick(response.body, [
                      'id',
                      'userPrincipalName',
                      'displayName'
                    ])
                  )
                } else {
                  data.push('Email had error')
                }
              }

              res.json(data)
            })
            .catch(err => {
              console.log(err)
              res.json('Error')
            })
        }
      )
    }
  }
)

router.post(
  '/assign',
  passport.authenticate('oauth-bearer', { session: false }),
  permit('Coordinator'),
  async (req, res) => {
    console.log(req.body.students)

    if (req.body.students && req.body.students.length > 0) {
      // Add a status of unknown to all recieved students
      let students = req.body.students
      for (let i = 0; i < students.length; i++) {
        students[i].status = 'unknown'
      }

      let query = {
        email: {
          $in: students.map(student => {
            return student.email.toLowerCase()
          })
        }
      }

      console.log('Query:', query)

      // Query database to see if any of these students already exist
      let existingEmails = await Student.find(query)
        .select({ email: 1, displayName: 1, _id: 0 })
        .catch(err => {
          console.log(err.message)
          return res
            .status(500)
            .json('An error occurred. Please try again later')
        })

      console.log('ExistingEmails:', existingEmails)

      // Set any existing students status to 'exists'
      for (let student of existingEmails) {
        var elemIndex = students.map(std => std.email).indexOf(student.email)
        if (elemIndex > -1) {
          students[elemIndex].status = 'exists'
        }
      }

      // Try to get access token for microsoft graph
      const assignResult = await assignUser(
        'student',
        req.headers.authorization,
        students
      )

      console.log('AssignResult', assignResult)

      if (assignResult instanceof Error) {
        return res.status(assignResult.status).json(assignResult.message)
      } else {
        return res.json({ students: assignResult })
      }
    } else {
      res.status(400).json('No student emails provided')
    }
  }
)

router.post(
  '/delete',
  passport.authenticate('oauth-bearer', { session: false }),
  permit('Coordinator'),
  validateResourceMW(studentSchemas.deleteStudentSchema),
  (req, res) => {
    // TODO: Validate student id
    let studentId = req.body.studentId

    Student.findById(studentId).exec((err, studentDoc) => {
      if (err) {
        return res.status(500).json('could not retrieve student at this time')
      }

      if (studentDoc) {
        // Try to get access token for microsoft graph
        getAccessTokenOnBehalfOf(
          req.headers.authorization.substring(7),
          'https://graph.microsoft.com/user.read+offline_access+AppRoleAssignment.ReadWrite.All+Directory.AccessAsUser.All+Directory.ReadWrite.All+Directory.Read.All',
          async accessToken => {
            axios
              .delete(
                `https://graph.microsoft.com/v1.0/users/${studentId}/appRoleAssignments/${studentDoc.appRoleAssignmentId}`,
                setupHeader(accessToken)
              )
              .then(() => {
                Student.findByIdAndRemove(studentId, (err, doc) => {
                  if (err) {
                    return res.status(500).json('error_retrieving_student')
                  }

                  return res.json('removed')
                })
              })
              .catch(err => {
                if (err?.response?.data) {
                  switch (err.response.data.error.code) {
                    case 'Request_ResourceNotFound':
                      // appRoleAssignmentId could not be found, remove student from DB
                      Student.deleteOne({ _id: studentId }).exec((err, doc) => {
                        if (err) {
                          return res
                            .status(500)
                            .json('error_while_retrieving_student')
                        }

                        return res.json('removed')
                      })
                      break
                    default:
                      console.log(err.response.data)
                      res.status(500).json('an_error_occurred')
                  }
                }
              })
          }
        )
      } else {
        return res.status(400).json('student_not_found')
      }
    })

    // Remove app role from student in Azure AD

    // On success remove student from database
  }
)

module.exports = router
