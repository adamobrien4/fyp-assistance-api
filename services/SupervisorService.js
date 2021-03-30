const axios = require('axios')

const Supervisor = require('../models/Supervisor')
const Coordinator = require('../models/Coordinator')
const Topic = require('../models/Topic')

const getAccessTokenOnBehalfOf = require('../graph/graph')
const {
  assignUser,
  setupHeader
} = require('../utils/userAssignment/assignUser')

const getAll = () =>
  new Promise((resolve, reject) => {
    var query = Supervisor.find().select({ email: 1, _id: 1 })
    query.exec((err, docs) => {
      if (err) {
        return reject(new Error('could not retrieve supervisors'))
      }

      return resolve({ supervisors: docs })
    })
  })

const getProfile = supervisorId =>
  new Promise((resolve, reject) => {
    Supervisor.findOne({ _id: supervisorId }).exec((err, doc) => {
      if (err) {
        return reject(new Error('could not find supervisor account'))
      }
      return resolve({ supervisor: doc })
    })
  })

const assign = req =>
  new Promise((resolve, reject) => {
    // Add a status of unknown to all recieved supervisors
    let supervisors = req.body.supervisors
    for (let i = 0; i < supervisors.length; i++) {
      supervisors[i].status = 'unknown'
    }

    // Query database to see if any of these supervisors already exist
    Supervisor.find({
      email: {
        $in: supervisors.map(supervisor => {
          return supervisor.email.toLowerCase()
        })
      }
    })
      .select('email displayname')
      .exec(async (err, existingEmails) => {
        if (err) {
          return reject(new Error('An error occurred. Please try again later'))
        }

        // Set any existing supervisors status to 'exists'
        for (let supervisor of existingEmails) {
          var elemIndex = supervisors
            .map(spvsr => spvsr.email)
            .indexOf(supervisor.email)
          if (elemIndex > -1) {
            supervisors[elemIndex].status = 'exists'
          }
        }

        let assignResult = await assignUser(
          'supervisor',
          req.headers.authorization,
          supervisors
        )

        if (assignResult instanceof Error) {
          return reject(new Error(assignResult.message))
        } else {
          return resolve({ supervisors: assignResult })
        }
      })
  })

const edit = req =>
  new Promise((resolve, reject) => {
    Supervisor.updateOne({ _id: req.authInfo.oid }, { $set: req.body }).exec(
      err => {
        if (err) {
          console.log(err)
          return reject(new Error('could not updated supervisor account'))
        }

        return resolve('update successful')
      }
    )
  })

const updateCustomTopicAvailibility = (value, authInfo) =>
  new Promise((resolve, reject) => {
    if (value) {
      // Check if custom studen topic exists
      Topic.findOne({
        supervisor: authInfo.oid,
        type: 'studentTopic'
      }).exec(async (err, doc) => {
        if (err) {
          return reject(new Error('could not retrieve topic'))
        }

        if (doc === null) {
          let ownerType = authInfo.roles.includes('Coordinator')
            ? 'coordinator'
            : 'supervisor'
          try {
            await new Topic({
              supervisor: authInfo.oid,
              status: 'active',
              title: 'Student Proposal Topic',
              description: '<UNSET>',
              tags: [],
              additionalNotes: '',
              targetCourses: [],
              type: 'studentTopic',
              ownerType: ownerType
            }).save()
          } catch (err) {
            return reject(new Error('could not create student project topic'))
          }

          return resolve('topic created')
        } else {
          Topic.updateOne(
            { supervisor: authInfo.oid, type: 'studentTopic' },
            { status: 'active' }
          ).exec((err, doc) => {
            if (err) {
              console.errror(err)
              return reject(new Error('could not update topic'))
            }

            return resolve('update successful')
          })
        }
      })
    } else {
      Topic.updateOne(
        { supervisor: authInfo.oid, type: 'studentTopic' },
        { status: 'archived' }
      ).exec((err, doc) => {
        if (err) {
          console.errror(err)
          return reject(new Error('could not update topic'))
        }

        return resolve('update successful')
      })
    }
  })

const getCustomTopicAvailibility = supervisorId =>
  new Promise((resolve, reject) => {
    // TODO: Ensure that having status: active is correct here
    Topic.findOne({
      supervisor: supervisorId,
      type: 'studentTopic',
      status: 'active'
    }).exec((err, doc) => {
      if (err) {
        return reject(new Error('could not retrieve topic'))
      }

      return resolve({ topic: doc })
    })
  })

const remove = req =>
  new Promise((resolve, reject) => {
    const supervisorId = req.body.supervisorId

    Supervisor.findById(supervisorId).exec(async (err, supervisorDoc) => {
      if (err) {
        return reject(new Error('could not retrieve supervisor at this time'))
      }

      if (supervisorDoc) {
        // Try to get access token for microsoft graph
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
              `https://graph.microsoft.com/v1.0/users/${supervisorId}/appRoleAssignments/${supervisorDoc.appRoleAssignmentId}`,
              setupHeader(accessToken)
            )
            .then(() => {
              Supervisor.findByIdAndRemove(supervisorId, (err, doc) => {
                if (err) {
                  return reject(
                    new Error('could not remove supervisor from database')
                  )
                }

                // TODO: Remove/Archive all linked topics/proposals etc

                return resolve('supervisor removed')
              })
            })
            .catch(err => {
              console.log(err.response.data)
              return reject(new Error('an_error_occurred'))
            })
        } else {
          return reject(new Error('error_no_access_token'))
        }
      } else {
        return reject(new Error('supervisor_doesnt_exist'))
      }
    })
  })

const list = () =>
  new Promise((resolve, reject) => {
    Coordinator.find()
      .select('displayName')
      .exec((err, coordinators) => {
        if (err) {
          return reject(new Error('could not find coordinators'))
        }
        Supervisor.find()
          .select('displayName')
          .exec((err, supervisors) => {
            if (err) {
              return reject(
                new Error('could not retrieve list of available supervisors')
              )
            }

            let list = [...coordinators, ...supervisors]

            return resolve({ supervisors: list })
          })
      })
  })

module.exports = {
  getProfile,
  edit,
  getAll,
  assign,
  remove,
  list,
  updateCustomTopicAvailibility,
  getCustomTopicAvailibility
}
