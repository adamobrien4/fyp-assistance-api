const router = require('express').Router()
const passport = require('passport')
const config = require('../config/config')
const axios = require('axios')
const MUUID = require('uuid-mongodb')
const permit = require('../middleware/authorization')

const Coordinator = require('../models/Coordinator')

const {} = require('../schemas/routes/coordinatorSchema.js')

const getAccessTokenOnBehalfOf = require('../graph/graph')
const { assignUser } = require('../utils/userAssignment/assignUser')

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
  permit(['Administrator', 'Coordinator']),
  async (req, res) => {
    await Coordinator.find()
      .select('displayName email')
      .exec((err, docs) => {
        if (err) return res.status(500).json('could not retrieve coordinators')

        // Return an empty array if no coordinators could be found
        if (docs === [] || docs.length === 0) {
          return res.json({ message: 'no coordinators found' })
        }
        return res.json({ coordinators: docs })
      })
  }
)

router.post(
  '/remove',
  passport.authenticate('oauth-bearer', { session: false }),
  permit('Administrator'),
  async (req, res) => {
    if (!req.body.coordinatorId) {
      return res.status(400).json('no_data_provided')
    }
    let coordinatorId = req.body.coordinatorId

    Coordinator.findById(coordinatorId, (err, coordinator) => {
      if (err) return res.status(500).json('error_while_retrieving_coordinator')
      // Ask MS Graph to remove appRoleAssignments from this user
      // Try to get access token for microsoft graph

      if (coordinator) {
        getAccessTokenOnBehalfOf(
          req.headers.authorization.substring(7),
          'https://graph.microsoft.com/user.read+offline_access+AppRoleAssignment.ReadWrite.All+Directory.AccessAsUser.All+Directory.ReadWrite.All+Directory.Read.All',
          accessToken => {
            axios
              .delete(
                `https://graph.microsoft.com/v1.0/users/${coordinator._id}/appRoleAssignments/${coordinator.appRoleAssignmentId}`,
                setupHeader(accessToken)
              )
              .then(() => {
                Coordinator.findByIdAndRemove(coordinatorId, (err, doc) => {
                  if (err) return res.status(500).json('unable_to_remove')

                  return res.json('removed')
                })
              })
              .catch(err => {
                console.log(err.response.data)
                if (err?.response?.data) {
                  switch (err.response.data.error.code) {
                    case 'Request_ResourceNotFound':
                      // Users appRoleAssignmentId could not be found
                      // Delete user from database
                      Coordinator.findByIdAndRemove(
                        coordinatorId,
                        (err, doc) => {
                          if (err) {
                            return res.status(500).json('unable_to_remove')
                          }

                          return res.json('removed')
                        }
                      )
                      break
                    default:
                      return res.status(500).json('an_error_occurred')
                  }
                }
              })
          }
        )
      } else {
        return res.status(400).json('coordinator_not_found')
      }
    })
  }
)

router.post(
  '/assign',
  passport.authenticate('oauth-bearer', { session: false }),
  permit('Administrator'),
  async (req, res) => {
    console.log(req.body.coordinator)

    // TODO: Verify that email is valid format
    let coordinator = req.body.coordinator
    // Query database to see if the coordinator already exists
    const coordinatorDoc = await Coordinator.findOne({
      email: coordinator
    }).catch(err => {
      console.log(err.message)
      return res.status(500).json('An error occurred. Please try again later')
    })

    if (coordinatorDoc) {
      // Coordinator already exists in database
      return res.json({ coordinator: { email: coordinator, status: 'exists' } })
    }

    // Try to get access token for microsoft graph
    const assignResult = await assignUser(
      'coordinator',
      req.headers.authorization,
      [{ email: coordinator, status: 'unknown' }]
    )

    console.log('AssignResult', assignResult)

    if (assignResult instanceof Error) {
      return res.status(assignResult.status).json(assignResult.message)
    } else {
      return res.json({ coordinator: assignResult })
    }
  }
)

module.exports = router
