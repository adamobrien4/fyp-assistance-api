const router = require('express').Router()
const passport = require('passport')
const config = require('../config/config')
const axios = require('axios')
const MUUID = require('uuid-mongodb')
const permit = require('../middleware/authorization')
const validateResourceMW = require('../middleware/validateResource')

const Supervisor = require('../models/Supervisor')
const Topic = require('../models/Topic')

const {
  editSupervisorSchema,
  studentProjectAvailibilitySchema
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

router.get(
  '/',
  passport.authenticate('oauth-bearer', { session: false }),
  (req, res) => {
    var query = Supervisor.find().select({ email: 1, _id: 1 })
    query.exec((err, docs) => {
      if (err) return res.status(404).json('No supervisors found')
      res.json({ supervisors: docs })
    })
  }
)

router.get(
  '/me',
  passport.authenticate('oauth-bearer', { session: false }),
  (req, res) => {
    Supervisor.findOne({ _id: req.authInfo.oid }).exec((err, doc) => {
      if (err) {
        return res.status(500).json('could not find supervisor account')
      }
      return res.json({ supervisor: doc })
    })
  }
)

// GET: Assign new supervisor
router.post(
  '/assign',
  passport.authenticate('oauth-bearer', { session: false }),
  permit('Coordinator'),
  async (req, res) => {
    console.log(req.body.supervisors)

    if (req.body.supervisors && req.body.supervisors.length > 0) {
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
        .select({ email: 1, displayName: 1, _id: 0 })
        .catch(err => {
          console.log(err.message)
          return res
            .status(500)
            .json('An error occurred. Please try again later')
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
    } else {
      res.status(400).json('No supervisor emails provided')
    }
  }
)

router.post(
  '/me/edit',
  passport.authenticate('oauth-bearer', { session: false }),
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

router.post(
  '/me/studentProjectAvailibility',
  passport.authenticate('oauth-bearer', { session: false }),
  permit('Supervisor'),
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
          try {
            new Topic({
              supervisor: req.authInfo.oid,
              status: 'suggestion',
              title: 'Student Proposal Topic',
              description: '<UNSET>',
              tags: ['Student Definable'],
              additionalNotes: '',
              targetCourses: [],
              type: 'studentTopic'
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
            { status: 'suggestion' }
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
  permit('Coordinator'),
  (req, res) => {
    // TODO: Validate supervisor id
    let supervisorId = req.body.supervisorId

    Supervisor.findById(supervisorId).exec((err, supervisorDoc) => {
      if (err) {
        return res
          .status(500)
          .json('could not retrieve supervisor at this time')
      }

      if (supervisorDoc) {
        // Try to get access token for microsoft graph
        getAccessTokenOnBehalfOf(
          req.headers.authorization.substring(7),
          'https://graph.microsoft.com/user.read+offline_access+AppRoleAssignment.ReadWrite.All+Directory.AccessAsUser.All+Directory.ReadWrite.All+Directory.Read.All',
          async accessToken => {
            axios
              .delete(
                `https://graph.microsoft.com/v1.0/users/${supervisorId}/appRoleAssignments/${supervisorDoc.appRoleAssignmentId}`,
                setupHeader(accessToken)
              )
              .then(() => {
                Supervisor.findByIdAndRemove(supervisorId, (err, doc) => {
                  if (err)
                    return res
                      .status(500)
                      .json('could not remove supervisor from database')

                  return res.json('supervisor removed')
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
  }
)

// GET: Supervisors who are available to supervise Custom Student Topics
router.get(
  '/availableCustomTopic',
  passport.authenticate('oauth-bearer', { session: false }),
  permit('Student'),
  (req, res) => {
    Supervisor.find({ superviseStudentTopics: true })
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

// GET: List of supervisors for dropdown / select etc
router.get(
  '/list',
  passport.authenticate('oauth-bearer', { session: false }),
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
