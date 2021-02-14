const router = require('express').Router()
const passport = require('passport')
const config = require('../config/config')
const axios = require('axios')
const MUUID = require('uuid-mongodb')
const _pick = require('lodash/pick')
const permit = require('../middleware/authorization')

const Student = require('../models/Student')

const getAccessTokenOnBehalfOf = require('../graph/graph')

const setupHeader = accessToken => {
  return {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  }
}

router.get(
  '/',
  passport.authenticate('oauth-bearer', { session: false }),
  permit(['Coordinator', 'Supervisor']),
  (req, res) => {
    var query = Student.find().select({ email: 1, _id: 1 })
    query.exec((err, docs) => {
      if (err) {
        return res.status(500).json('No students found')
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
    let allStudentData = []

    // TODO: Ask justin how to handle this correctly
    // Working with promises and functions

    console.log(req.body.students)

    if (req.body.students && req.body.students.length > 0) {
      // Add a status of unknown to all recieved students
      let students = req.body.students
      students.map(function (student) {
        student.status = 'unknown'
      })

      // Query database to see if any of these students already exist
      let existingEmails = await Student.find({
        email: {
          $in: students.map(student => {
            return student.email
          })
        }
      })
        .select({ email: 1, displayName: 1, _id: 0 })
        .catch(err => {
          console.log(err.message)
          return res
            .status(500)
            .json('An error occurred. Please try again later')
        })

      // Set any existing students status to 'exists'
      for (let student of existingEmails) {
        var elemIndex = students.map(std => std.email).indexOf(student.email)
        if (elemIndex > -1) {
          students[elemIndex].status = 'exists'
        }
      }

      // Try to get access token for microsoft graph
      getAccessTokenOnBehalfOf(
        req.headers.authorization.substring(7),
        'https://graph.microsoft.com/user.read+offline_access+AppRoleAssignment.ReadWrite.All+Directory.AccessAsUser.All+Directory.ReadWrite.All+Directory.Read.All',
        async accessToken => {
          // The remaining students who's status is 'unknown' are either not yet assigned (added to system) or the emails do not match a student
          for (let studentData of students) {
            if (studentData.status === 'unknown') {
              // Get student microsoft profile
              let profileData = await axios
                .get(
                  `https://graph.microsoft.com/v1.0/users/${studentData.email}`,
                  setupHeader(accessToken)
                )
                .catch(err => {
                  console.log(err.response.status)
                  studentData.status = 'not_found'
                })

              if (profileData) {
                // User profile was found

                console.log(profileData.data)

                studentData.email = profileData.data.userPrincipalName
                studentData.azureId = profileData.data.id
                studentData.firstName =
                  profileData.data.givenName.charAt(0).toUpperCase() +
                  profileData.data.givenName.substring(1)
                studentData.lastName =
                  profileData.data.surname.charAt(0).toUpperCase() +
                  profileData.data.surname.substring(1)
                studentData.displayName = `${studentData.firstName} ${studentData.lastName}`
                studentData.studentId = studentData.email.split('@')[0]

                let data = {
                  principalId: studentData.azureId,
                  principalType: 'User',
                  resourceId: `${config.azure.applicationResourceId}`,
                  appRoleId: config.azure.appRoles.student
                }

                // Assign app role to student
                let appRoleResponse = await axios
                  .post(
                    `https://graph.microsoft.com/v1.0/users/${data.principalId}/appRoleAssignments`,
                    data,
                    setupHeader(accessToken)
                  )
                  .catch(async err => {
                    console.log(err.response.data)
                    if (
                      err.response.data.error.message ===
                      'Permission being assigned already exists on the object'
                    ) {
                      // User already has the app role assigned to them
                      studentData.status = 'assigned'
                      let getAppRoleAssignments = await axios
                        .get(
                          `https://graph.microsoft.com/v1.0/users/${data.principalId}/appRoleAssignments`,
                          setupHeader(accessToken)
                        )
                        .catch(err => {
                          console.log(err.response)
                          return res.json(
                            'Could not retrieve appRoleAssignments'
                          )
                        })
                      let appRoleId
                      for (let assignment of getAppRoleAssignments.data.value) {
                        if (
                          assignment.appRoleId === config.azure.appRoles.student
                        ) {
                          appRoleId = assignment.id
                          break
                        }
                      }

                      if (appRoleId) {
                        studentData.appRoleAssignmentId = appRoleId
                      } else {
                        studentData.status = 'no_assignment'
                      }
                    }
                  })

                if (appRoleResponse) {
                  studentData.status = 'assigned'
                  studentData.appRoleAssignmentId = appRoleResponse.data.id
                }
              }

              allStudentData.push(studentData)

              console.log(studentData)

              // If the student has been assigned or has previously been assigned add them to the database
              // as they are curently not in the database at the moment (somehow, this case shouldnt actualy happen, but just in case)
              if (studentData.status === 'assigned') {
                new Student({
                  _id: MUUID.from(studentData.azureId).toString('D'),
                  studentId: studentData.studentId,
                  email: studentData.email,
                  firstName: studentData.firstName,
                  lastName: studentData.lastName,
                  displayName: studentData.displayName,
                  appRoleAssignmentId: studentData.appRoleAssignmentId
                }).save((err, _) => {
                  if (err) console.log(err)
                })
              }
            } else {
              // Student's status is not 'unknown'
              allStudentData.push(studentData)
            }
          }
          return res.json({ students: allStudentData })
        }
      )
    } else {
      res.status(400).json('No student emails provided')
    }
  }
)

router.post(
  '/delete',
  passport.authenticate('oauth-bearer', { session: false }),
  permit('Coordinator'),
  (req, res) => {
    console.log('dekete')

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
                  if (err)
                    return res
                      .status(500)
                      .json('could not remove student from database')

                  return res.json('student removed')
                })
              })
              .catch(err => {
                console.log(err.response.data)
                res.status(500).json('an_error_occurred')
              })
          }
        )
      }
    })

    // Remove app role from student in Azure AD

    // On success remove student from database
  }
)

module.exports = router
