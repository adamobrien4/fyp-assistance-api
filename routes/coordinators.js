const router = require('express').Router()
const passport = require('passport')
const config = require('../config/config')
const axios = require('axios')

const Coordinator = require('../models/Coordinator')

const getAccessTokenOnBehalfOf = require('../graph/graph')

const setupHeader = (accessToken) => {
  return {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  }
}

router.get('/', passport.authenticate('oauth-bearer', { session: false }), async (req, res) => {
  await Coordinator.find().select({ _id: 1, displayName: 1, email: 1 }).exec((err, docs) => {
    if (err) return res.status(500).json('could not retrieve coordinators')

    // Return an empty array if no coordinators could be found
    if (docs === [] || docs.length === 0) return res.json([])
    return res.json(docs)
  })
})

router.post('/remove', passport.authenticate('oauth-bearer', { session: false }), async (req, res) => {
  if (!req.body.coordinatorId) {
    return res.status(400).json('no_data_provided')
  }
  let coordinatorId = req.body.coordinatorId

  Coordinator.findById(coordinatorId, (err, coordinator) => {
    if (err) return res.status(500).json('could not find coordinator')
    // Ask MS Graph to remove appRoleAssignments from this user
    // Try to get access token for microsoft graph
    getAccessTokenOnBehalfOf(
      req.headers.authorization.substring(7),
      'https://graph.microsoft.com/user.read+offline_access+AppRoleAssignment.ReadWrite.All+Directory.AccessAsUser.All+Directory.ReadWrite.All+Directory.Read.All',
      (accessToken) => {
        axios.delete(`https://graph.microsoft.com/v1.0/users/${coordinator.azureId}/appRoleAssignments/${coordinator.appRoleAssignmentId}`, setupHeader(accessToken))
          .then(() => {
            Coordinator.findByIdAndRemove(coordinatorId, (err, doc) => {
              if (err) return res.status(500).json('unable_to_remove')

              return res.json('removed')
            })
          })
          .catch((err) => {
            console.log(err.response.data)
            res.status(500).json('an_error_occurred')
          })
      })
  })
})

router.post('/assign', passport.authenticate('oauth-bearer', { session: false }), async (req, res) => {
  // TODO: Check users appRole to se if they have access to this route (Globally)

  if (!req.authInfo.roles || !req.authInfo.roles.includes('Administrator')) {
    console.log(req.authInfo.roles)
    return res.status(401).json('User must be administrator')
  }

  console.log(req.body.coordinator)

  // TODO: Verify that email is valid format
  let coordinator = req.body.coordinator
  let coordinatorProfile = {}

  if (coordinator && coordinator.length > 0) {
    // Query database to see if the coordinator already exists
    Coordinator.findOne({ email: coordinator }, (err, doc) => {
      if (err) {
        console.log(err.message)
        return res.status(500).json('An error occurred. Please try again later')
      }
      // If doc exists
      if (doc) {
        return res.json('exists')
      }

      // Try to get access token for microsoft graph
      getAccessTokenOnBehalfOf(
        req.headers.authorization.substring(7),
        'https://graph.microsoft.com/user.read+offline_access+AppRoleAssignment.ReadWrite.All+Directory.AccessAsUser.All+Directory.ReadWrite.All+Directory.Read.All',
        async (accessToken) => {
          // Get coordinator microsoft profile
          let profileData = await axios.get(`https://graph.microsoft.com/v1.0/users/${coordinator}`, setupHeader(accessToken))
            .catch(err => {
              console.log(err.response.status)
              return res.json('not_found')
            })

          if (profileData) {
            // User profile was found

            console.log(profileData.data)

            coordinatorProfile.email = profileData.data.userPrincipalName
            coordinatorProfile.azureId = profileData.data.id
            coordinatorProfile.firstName = profileData.data.givenName.charAt(0).toUpperCase() + profileData.data.givenName.substring(1)
            coordinatorProfile.lastName = profileData.data.surname.charAt(0).toUpperCase() + profileData.data.surname.substring(1)
            coordinatorProfile.displayName = `${coordinatorProfile.firstName} ${coordinatorProfile.lastName}`

            // Assign the FYP Coordinator custom admin role to the Coordinator account in order to allow them to assign app roles to other users
            // TODO: 

            // TODO: Setup better way to implement the appRoleId in case it needs to be changed in the future
            let data = {
              principalId: coordinatorProfile.azureId,
              principalType: 'User',
              resourceId: `${config.azure.applicationResourceId}`,
              appRoleId: config.azure.appRoles.coordinator
            }

            // Assign app role to coordinator
            let appRoleResponse = await axios.post(`https://graph.microsoft.com/v1.0/users/${data.principalId}/appRoleAssignments`, data, setupHeader(accessToken))
              .catch((err) => {
                console.log(err.response.data)
                if (err.response.data.error.message === 'Permission being assigned already exists on the object') {
                  // User already has the app role assigned to them
                  coordinatorProfile.status = 'already_assigned'
                }
              })

            if (appRoleResponse) {
              coordinatorProfile.status = 'assigned'
              coordinatorProfile.appRoleAssignmentId = appRoleResponse.data.id
            }
          } else {
            console.log('profile_data not found')
            return res.json('not_found')
          }

          console.log(coordinatorProfile)

          // If the coordinator has been assigned or has previously been assigned add them to the database
          // as they are curently not in the database at the moment (somehow, this case shouldnt actualy happen, but just in case)
          if (coordinatorProfile.status === 'assigned' || coordinatorProfile.status === 'already_assigned') {
            new Coordinator({
              email: coordinatorProfile.email,
              firstName: coordinatorProfile.firstName,
              lastName: coordinatorProfile.lastName,
              displayName: coordinatorProfile.displayName,
              azureId: coordinatorProfile.azureId,
              appRoleAssignmentId: coordinatorProfile.appRoleAssignmentId
            }).save((err, _) => {
              if (err) {
                console.log(err)
                return res.status(500).json('error saving to database')
              }
              res.json('success')
            })
          } else {
            console.log('Unknown profile status: ', coordinatorProfile.status)
            res.status(500).json('unknwon profile status')
          }
        })
    })
  } else {
    res.status(400).json('No coordinator email provided')
  }
})

module.exports = router
