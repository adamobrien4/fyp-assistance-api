const config = require('../../config/config')
const axios = require('axios')
const MUUID = require('uuid-mongodb')
const getAccessTokenOnBehalfOf = require('../../graph/graph')

const Student = require('../../models/Student')
const Supervisor = require('../../models/Supervisor')
const Coordinator = require('../../models/Coordinator')

const setupHeader = accessToken => {
  return {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  }
}

const assignUser = async (userType, authorizationHeader, users) => {
  console.log('users', users)

  // Try to get access token for microsoft graph
  let accessToken = await getAccessTokenOnBehalfOf(
    authorizationHeader.substring(7),
    'https://graph.microsoft.com/user.read+offline_access+AppRoleAssignment.ReadWrite.All+Directory.AccessAsUser.All+Directory.ReadWrite.All+Directory.Read.All'
  ).catch(err => {
    console.error(err)
  })
  let allUserData = []

  // The remaining users who's status is 'unknown' are either not yet assigned (added to system) or the emails do not match an existing user
  for (let userData of users) {
    console.log('Looping:', userData)
    if (userData.status === 'unknown') {
      console.log('Status is unknown')
      // Get users microsoft profile
      let profileData = await axios
        .get(
          `https://graph.microsoft.com/v1.0/users/${userData.email}`,
          setupHeader(accessToken)
        )
        .catch(err => {
          console.log('Could not retrieve users profiledata')
          console.log(err.response.status)
          userData.status = 'not_found'
        })

      console.log('Profile Data from Graph:', profileData?.data)
      if (profileData) {
        // User profile was found

        console.log('User has ProfileData', profileData.data)

        userData.email = profileData.data.userPrincipalName.toLowerCase()
        userData.azureId = profileData.data.id
        userData.firstName = profileData.data?.givenName
          ? profileData.data.givenName.charAt(0).toUpperCase() +
            profileData.data.givenName.substring(1)
          : '<FirstName>'
        userData.lastName = profileData.data?.surname
          ? profileData.data.surname.charAt(0).toUpperCase() +
            profileData.data.surname.substring(1)
          : '<LastName>'
        userData.displayName = `${userData.firstName} ${userData.lastName}`

        // Take additional actions depending on the user type
        if (userType === 'student') {
          userData.studentId = userData.email.split('@')[0]
        } else if (userType === 'supervisor') {
          // TODO: Generate or have coordinator supply an abbreviuation for the supervisors name
          var characters =
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
          let charLen = characters.length
          let abbr = ''
          for (let i = 0; i < 4; i++) {
            abbr += characters.charAt(Math.floor(Math.random() * charLen))
          }
          userData.abbr = abbr
        } else if (userType === 'coordinator') {
          // Coordinator
        } else {
          return new Error({
            message: 'unknown_user_type',
            statusCode: 500
          })
        }

        console.log('Users UserData:', userData)

        let data = {
          principalId: userData.azureId,
          principalType: 'User',
          resourceId: `${config.azure.applicationResourceId}`,
          appRoleId: config.azure.appRoles[userType]
        }

        console.log('Assign Role Query:', data)

        // Assign app role to user
        let appRoleResponse = await axios
          .post(
            `https://graph.microsoft.com/v1.0/users/${data.principalId}/appRoleAssignments`,
            data,
            setupHeader(accessToken)
          )
          .catch(async err => {
            console.log('Error assigning role', err)
            console.log(err.response.data)
            if (err?.response?.data?.error?.code === 'Request_BadRequest') {
              console.log('User already is assigned')
              // User already has permission assigned to them
              userData.status = 'assigned'
              // Get user's appRoleAssignmentId
              console.log('Get user assignment id')
              let getAppRoleAssignments = await axios
                .get(
                  `https://graph.microsoft.com/v1.0/users/${data.principalId}/appRoleAssignments`,
                  setupHeader(accessToken)
                )
                .catch(err => {
                  console.log('Could not get user asignment id')
                  console.log(err.response)
                  userData.status = 'error_retrieving_appRoleAssignmentId'
                })
              let appRoleId
              for (let assignment of getAppRoleAssignments.data.value) {
                if (assignment.appRoleId === config.azure.appRoles.student) {
                  appRoleId = assignment.id
                  break
                }
              }

              console.log('user is ', appRoleId)

              if (appRoleId) {
                userData.appRoleAssignmentId = appRoleId
              } else {
                userData.status = 'no_assignment'
              }
            } else {
              return new Error({
                message: 'an_error_occurred',
                statusCode: 500
              })
            }
          })
        if (appRoleResponse) {
          userData.status = 'assigned'
          userData.appRoleAssignmentId = appRoleResponse.data.id
        }
      }
      allUserData.push(userData)

      console.log('UserData:', userData)

      if (userData.status === 'assigned') {
        console.log('User has type of assigned')
        // TODO: Student or Supervisor
        switch (userType) {
          case 'student':
            console.log('User is student type')
            new Student({
              _id: MUUID.from(userData.azureId).toString('D'),
              studentId: userData.studentId,
              email: userData.email,
              firstName: userData.firstName,
              lastName: userData.lastName,
              displayName: userData.displayName,
              appRoleAssignmentId: userData.appRoleAssignmentId
            }).save((err, _) => {
              if (err) {
                switch (err.code) {
                  case 11000:
                    console.error(userData, 'Exists in db and has assignment')
                    // Student already has role assigned and exists in database, nothing to do
                    userData.status = 'exists'
                    break
                  default:
                    console.error(err)
                }
              }
            })
            break
          case 'supervisor':
            console.log('User is supervisor type')
            new Supervisor({
              _id: MUUID.from(userData.azureId).toString('D'),
              email: userData.email,
              firstName: userData.firstName,
              lastName: userData.lastName,
              displayName: userData.displayName,
              abbr: userData.abbr,
              appRoleAssignmentId: userData.appRoleAssignmentId
            }).save((err, _) => {
              if (err) {
                switch (err.code) {
                  case 11000:
                    // Supervisor already has role assigned and exists in database, nothing to do
                    userData.status = 'exists'
                    break
                  default:
                    console.error(err)
                }
              }
            })
            break
          case 'coordinator':
            console.log('User is coordinator type')
            new Coordinator({
              _id: MUUID.from(userData.azureId).toString('D'),
              email: userData.email,
              firstName: userData.firstName,
              lastName: userData.lastName,
              displayName: userData.displayName,
              appRoleAssignmentId: userData.appRoleAssignmentId
            }).save((err, _) => {
              if (err) {
                switch (err.code) {
                  case 11000:
                    // Coordinator already has role assigned and exists in database, nothing to do
                    userData.status = 'exists'
                    break
                  default:
                    console.error(err)
                }
              }
            })
            break
          default:
            return new Error({ message: 'unknown_user_type', status: 500 })
        }
      }
    } else {
      // User's status is 'unknown'
      allUserData.push(userData)
    }
  }
  console.log('Returning', allUserData)
  return allUserData
}

module.exports = {
  assignUser,
  setupHeader
}
