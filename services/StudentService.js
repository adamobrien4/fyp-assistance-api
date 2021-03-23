const Student = require('../models/Student')
const axios = require('axios')

const getAccessTokenOnBehalfOf = require('../graph/graph')
const {
  setupHeader,
  assignUser
} = require('../utils/userAssignment/assignUser')

const getAll = () =>
  new Promise((resolve, reject) => {
    Student.find({})
      .select('email')
      .exec((err, docs) => {
        if (err) {
          return reject(new Error('error_retrieving_students'))
        }

        return resolve({ students: docs })
      })
  })

const assign = req => {
  return new Promise((resolve, reject) => {
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

    // Query database to see if any of these students already exist
    Student.find(query)
      .select('email displayName')
      .exec(async (err, existingEmails) => {
        if (err) {
          return reject(new Error('Could not retrieve students at this time'))
        }

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

        if (assignResult instanceof Error) {
          return reject(new Error(assignResult.message))
        } else {
          return resolve({ students: assignResult })
        }
      })
  })
}

const remove = req => {
  return new Promise((resolve, reject) => {
    const studentId = req.body.studentId
    Student.findById(studentId).exec(async (err, studentDoc) => {
      if (err) {
        return reject(new Error('could not retrieve student at this time'))
      }

      if (studentDoc) {
        // Try to get access token for microsoft graph
        let accessToken = await getAccessTokenOnBehalfOf(
          req.headers.authorization.substring(7),
          'https://graph.microsoft.com/user.read+offline_access+AppRoleAssignment.ReadWrite.All+Directory.AccessAsUser.All+Directory.ReadWrite.All+Directory.Read.All'
        ).catch(err => {
          console.error(err)
          return reject(new Error('error_access_token'))
        })

        if (accessToken) {
          axios
            .delete(
              `https://graph.microsoft.com/v1.0/users/${studentId}/appRoleAssignments/${studentDoc.appRoleAssignmentId}`,
              setupHeader(accessToken)
            )
            .then(() => {
              Student.findByIdAndRemove(studentId, (err, doc) => {
                if (err) {
                  return reject(new Error('error_retrieving_student'))
                }

                return resolve('student removed')
              })
            })
            .catch(err => {
              if (err?.response?.data) {
                switch (err.response.data.error.code) {
                  case 'Request_ResourceNotFound':
                    // appRoleAssignmentId could not be found, remove student from DB
                    Student.deleteOne({ _id: studentId }).exec((err, doc) => {
                      if (err) {
                        return reject(
                          new Error('error_while_retrieving_student')
                        )
                      }

                      return resolve(doc)
                    })
                    break
                  default:
                    console.log(err.response.data)
                    return reject(new Error('an_error_occurred'))
                }
              }
            })
        } else {
          return reject(new Error('error_no_access_token'))
        }
      } else {
        return reject(new Error('error_retrieving_student'))
      }
    })
  })
}

module.exports = {
  getAll,
  assign,
  remove
}
