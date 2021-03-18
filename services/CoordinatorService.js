const axios = require('axios')

const Coordinator = require('../models/Coordinator')

const getAccessTokenOnBehalfOf = require('../graph/graph')
const {
  setupHeader,
  assignUser
} = require('../utils/userAssignment/assignUser')

const getAll = () => {
  return new Promise((resolve, reject) => {
    Coordinator.find({})
      .select('displayName email')
      .exec((err, docs) => {
        if (err) {
          return reject(new Error('could not retrieve coordinators'))
        }

        return resolve({ coordinators: docs })
      })
  })
}

const remove = req => {
  return new Promise((resolve, reject) => {
    const coordinatorId = req.body.coordinatorId

    Coordinator.findById(coordinatorId, async (err, coordinator) => {
      if (err) {
        return reject(new Error('error_while_retrieving_coordinator'))
      }
      // Ask MS Graph to remove appRoleAssignments from this user
      // Try to get access token for microsoft graph

      if (coordinator) {
        const accessToken = await getAccessTokenOnBehalfOf(
          req.headers.authorization.substring(7),
          'https://graph.microsoft.com/user.read+offline_access+AppRoleAssignment.ReadWrite.All+Directory.AccessAsUser.All+Directory.ReadWrite.All+Directory.Read.All'
        ).catch(err => {
          console.error(err)
          return reject(new Error('error_access_token'))
        })

        if (accessToken) {
          axios
            .delete(
              `https://graph.microsoft.com/v1.0/users/${coordinator._id}/appRoleAssignments/${coordinator.appRoleAssignmentId}`,
              setupHeader(accessToken)
            )
            .then(() => {
              Coordinator.findByIdAndRemove(coordinatorId, (err, doc) => {
                if (err) {
                  return reject(new Error('unable_to_remove'))
                }

                return resolve('coordinator removed')
              })
            })
            .catch(err => {
              console.log('delete error', err)
              console.log(err.response.data)
              if (err?.response?.data) {
                switch (err.response.data.error.code) {
                  case 'Request_ResourceNotFound':
                    // Users appRoleAssignmentId could not be found
                    // Delete user from database
                    Coordinator.findByIdAndRemove(coordinatorId, (err, doc) => {
                      if (err) {
                        return reject(new Error('unable_to_remove'))
                      }

                      return resolve('removed')
                    })
                    break
                  default:
                    return reject(new Error('an_error_occurred'))
                }
              }
            })
        } else {
          return reject(new Error('error_no_access_token'))
        }
      }
    })
  })
}

const assign = req => {
  return new Promise((resolve, reject) => {
    // TODO: Verify that email is valid format
    let coordinator = req.body.coordinator
    // Query database to see if the coordinator already exists
    Coordinator.findOne({
      email: coordinator
    })
      .then(async coordinatorDoc => {
        if (coordinatorDoc) {
          // Coordinator already exists in database
          return resolve({
            coordinator: { email: coordinator, status: 'exists' }
          })
        }

        // Try to get access token for microsoft graph
        const assignResult = await assignUser(
          'coordinator',
          req.headers.authorization,
          [{ email: coordinator, status: 'unknown' }]
        )

        if (assignResult instanceof Error) {
          return reject(new Error(assignResult.message))
        } else {
          return resolve({ coordinator: assignResult })
        }
      })
      .catch(err => {
        console.log(err.message)
        return reject(new Error('An error occurred. Please try again later'))
      })
  })
}

module.exports = {
  getAll,
  assign,
  remove
}
