const router = require('express').Router()
const passport = require('passport')
const axios = require('axios')

const permit = require('../middleware/authorization')
const isPhase = require('../middleware/phaseCheck')
const validateResourceMW = require('../middleware/validateResource')

const Supervisor = require('../models/Supervisor')
const Topic = require('../models/Topic')

const {
  assignSupervisorSchema,
  editSupervisorSchema,
  studentProjectAvailibilitySchema,
  deleteSupervisorSchema
} = require('../schemas/routes/supervisorSchema')

const getAccessTokenOnBehalfOf = require('../graph/graph')
const { assignUser } = require('../utils/userAssignment/assignUser')

const setupHeader = accessToken => {
  return {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  }
}

// GET: List of all supervisors
router.get(
  '/',
  passport.authenticate('oauth-bearer', { session: false }),
  permit(['Administrator', 'Coordinator']),
  (req, res) => {
    var query = Supervisor.find().select({ email: 1, _id: 1 })
    query.exec((err, docs) => {
      if (err) {
        return res.status(500).json('could not retrieve supervisors')
      }
      res.json({ supervisors: docs })
    })
  }
)

// GET: Supervisors own account
router.get(
  '/me',
  passport.authenticate('oauth-bearer', { session: false }),
  isPhase(null),
  permit('Supervisor'),
  (req, res) => {
    Supervisor.findOne({ _id: req.authInfo.oid }).exec((err, doc) => {
      if (err) {
        return res.status(500).json('could not find supervisor account')
      }
      return res.json({ supervisor: doc })
    })
  }
)

// POST: Assign new supervisor
router.post(
  '/assign',
  passport.authenticate('oauth-bearer', { session: false }),
  isPhase(null),
  permit('Coordinator'),
  validateResourceMW(assignSupervisorSchema),
  async (req, res) => {
    console.log(req.body.supervisors)

    // Add a status of unknown to all recieved supervisors
    let supervisors = req.body.supervisors
    for (let i = 0; i < supervisors.length; i++) {
      supervisors[i].status = 'unknown'
    }

    // Query database to see if any of these supervisors already exist
    let existingEmails = await Supervisor.find({
      email: {
        $in: supervisors.map(supervisor => {
          return supervisor.email.toLowerCase()
        })
      }
    })
      .select('email displayname')
      .catch(err => {
        console.log(err.message)
        return res.status(500).json('An error occurred. Please try again later')
      })

    // Set any existing supervisors status to 'exists'
    for (let supervisor of existingEmails) {
      var elemIndex = supervisors
        .map(spvsr => spvsr.email)
        .indexOf(supervisor.email)
      if (elemIndex > -1) {
        supervisors[elemIndex].status = 'exists'
      }
    }

    // Try to get access token for microsoft graph
    let assignResult = await assignUser(
      'supervisor',
      req.headers.authorization,
      supervisors
    )

    console.log('AssignResult', assignResult)

    if (assignResult instanceof Error) {
      return res.status(assignResult.status).json(assignResult.message)
    } else {
      return res.json({ supervisors: assignResult })
    }
  }
)

// POST: Edit the supervisors own account
router.post(
  '/me/edit',
  passport.authenticate('oauth-bearer', { session: false }),
  isPhase(null),
  permit('Supervisor'),
  validateResourceMW(editSupervisorSchema),
  (req, res) => {
    Supervisor.updateOne({ _id: req.authInfo.oid }, { $set: req.body }).exec(
      err => {
        if (err) {
          console.log(err)
          return res.status(500).json('could not updated supervisor account')
        }

        return res.json('update successful')
      }
    )
  }
)

// POST: Toggle the supervisors availibility to supervisor student defined topics
router.post(
  '/me/studentProjectAvailibility',
  passport.authenticate('oauth-bearer', { session: false }),
  // isPhase(3),
  permit(['Supervisor', 'Coordinator']),
  validateResourceMW(studentProjectAvailibilitySchema),
  async (req, res) => {
    if (req.body.active) {
      // Check if custom studen topic exists
      Topic.findOne({
        supervisor: req.authInfo.oid,
        type: 'studentTopic'
      }).exec((err, doc) => {
        if (err) {
          return res.status(500).json('could not retrieve topic')
        }

        if (doc === null) {
          let ownerType = req.authInfo.roles.includes('Coordinator')
            ? 'coordinator'
            : 'supervisor'
          try {
            new Topic({
              supervisor: req.authInfo.oid,
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
            return res
              .status(500)
              .json('could not create student project topic')
          }

          return res.json('topic created')
        } else {
          Topic.updateOne(
            { supervisor: req.authInfo.oid, type: 'studentTopic' },
            { status: 'active' }
          ).exec((err, doc) => {
            if (err) {
              console.errror(err)
              return res.status(500).json('could not update topic')
            }

            return res.json('update successful')
          })
        }
      })
    } else {
      Topic.updateOne(
        { supervisor: req.authInfo.oid, type: 'studentTopic' },
        { status: 'archived' }
      ).exec((err, doc) => {
        if (err) {
          console.errror(err)
          return res.status(500).json('could not update topic')
        }

        return res.json('update successful')
      })
    }
  }
)

// GET: Whether the supervisor is available to supervise student defined topics
router.get(
  '/me/studentProjectAvailibility',
  passport.authenticate('oauth-bearer', { session: false }),
  isPhase(null),
  permit('Supervisor'),
  async (req, res) => {
    Topic.findOne({
      supervisor: req.authInfo.oid,
      type: 'studentTopic'
    }).exec((err, doc) => {
      if (err) {
        return res.status(500).json('could not retrieve topic')
      }

      if (doc) {
        return res.json({ topic: doc })
      } else {
        return res.json({ topic: null })
      }
    })
  }
)

// DELETE: Delete a supervisor
router.post(
  '/delete',
  passport.authenticate('oauth-bearer', { session: false }),
  isPhase(null),
  permit('Coordinator'),
  validateResourceMW(deleteSupervisorSchema),
  (req, res) => {
    // TODO: Validate supervisor id
    let supervisorId = req.body.supervisorId

    Supervisor.findById(supervisorId).exec(async (err, supervisorDoc) => {
      if (err) {
        return res
          .status(500)
          .json('could not retrieve supervisor at this time')
      }

      if (supervisorDoc) {
        // Try to get access token for microsoft graph
        const accessToken = await getAccessTokenOnBehalfOf(
          req.headers.authorization.substring(7),
          'https://graph.microsoft.com/user.read+offline_access+AppRoleAssignment.ReadWrite.All+Directory.AccessAsUser.All+Directory.ReadWrite.All+Directory.Read.All'
        ).catch(err => {
          console.error(err)
          return res.status(500).json('error_access_token')
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
                  return res
                    .status(500)
                    .json('could not remove supervisor from database')
                }

                // TODO: Remove/Archive all linked topics/proposals etc

                return res.json('supervisor removed')
              })
            })
            .catch(err => {
              console.log(err.response.data)
              res.status(500).json('an_error_occurred')
            })
        } else {
          return res.status(500).json('error_no_access_token')
        }
      }
    })
  }
)

// GET: List of supervisors for dropdown / select etc
router.get(
  '/list',
  passport.authenticate('oauth-bearer', { session: false }),
  isPhase(null),
  (req, res) => {
    Supervisor.find()
      .select('displayName')
      .exec((err, docs) => {
        if (err) {
          return res
            .status(500)
            .json('could not retrieve list of available supervisors')
        }

        return res.json({ supervisors: docs })
      })
  }
)

module.exports = router
