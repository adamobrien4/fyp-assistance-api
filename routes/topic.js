const router = require('express').Router()
const passport = require('passport')
const { ObjectId } = require('mongoose').Types

const Topic = require('../models/Topic')
const Tag = require('../models/Tag')
const { Proposal, SupervisorProposal } = require('../models/Proposal')

const permit = require('../middleware/authorization')
const validateResourceMW = require('../middleware/validateResource')

const { searchTopicSchema } = require('../schemas/routes/topicsSchema')

router.get(
  '/',
  passport.authenticate('oauth-bearer', { session: false }),
  async (req, res) => {
    Topic.find({ status: { $in: ['active', 'assigned'] } })
      .populate('supervisor')
      .exec((err, docs) => {
        if (err) {
          console.log(err)
          return res
            .status(500)
            .json({ message: 'could not retrieve topics at this time' })
        }

        docs.map(async document => {
          await Proposal.find({ topic: document._id })
        })

        res.status(200).json({ topics: docs })
      })
  }
)

// TODO: Make search more efficient + clean code
router.post(
  '/search',
  passport.authenticate('oauth-bearer', { session: false }),
  validateResourceMW(searchTopicSchema),
  (req, res) => {
    // No Supervisor and No Tags
    if (req.body.tags === null && req.body.supervisor === null) {
      Topic.find({}).exec((err, docs) => {
        if (err) {
          return res.status(500).json('could not retrieve topics at this time')
        }

        return res.json({ topics: docs })
      })
      return
    }

    // Supervisor and no tags
    let query

    if (req.body.tags) {
      query = req.body.tags.map(tag => {
        return { ancestors: tag }
      })
    }

    if (req.body?.supervisor && !req.body?.tags) {
      Topic.find({ supervisor: req.body.supervisor })
        .populate('supervisor')
        .exec((err, docs) => {
          if (err) {
            return res.status(500).json('could not retrieve topics at this')
          }

          return res.json({ topics: docs })
        })
      return
    }

    // Tags and no supervisor

    if (!req.body?.supervisor && req.body?.tags) {
      // Find tags related to queried tags
      Tag.find({ $or: [...query] })
        .select({ _id: 1 })
        .exec((err, docs) => {
          if (err) {
            return res
              .status(500)
              .json('could not retrieve topics at this time')
          }

          let tags = [...docs.map(tag => tag._id), ...req.body.tags]

          // Search topics related to related query tags
          let query = tags.map(tag => ({
            tags: tag
          }))

          Topic.find({
            $or: [...query]
          })
            .populate('supervisor')
            .exec((err, docs) => {
              if (err) {
                return res
                  .status(500)
                  .json('could not retrieve topics at this time')
              }
              return res.json({ topics: docs })
            })
        })
      return
    }

    // Tags and supervisor

    if (req.body?.supervisor && req.body?.tags) {
      // Find tags related to queried tags
      Tag.find({ $or: [...query] })
        .select({ _id: 1 })
        .exec((err, docs) => {
          if (err) {
            return res.status(500).json('could not retrieve tags at this time')
          }

          let tags = [...docs.map(tag => tag._id), ...req.body.tags]

          Topic.find({ supervisor: req.body.supervisor })
            .populate('supervisor')
            .exec((err2, docs2) => {
              if (err2) {
                return res
                  .status(500)
                  .json('could not retrieve topics at this time')
              }

              const result = docs2.filter(doc =>
                doc.tags.some(r => tags.includes(r))
              )

              return res.json({ topics: result })
            })
        })
      return
    }

    return res.status(400).json('must supply either supervisor or tags fields')
  }
)

// GET: Users owned Topics
router.get(
  '/me',
  passport.authenticate('oauth-bearer', { session: false }),
  permit(['Supervisor', 'Coordinator']),
  async (req, res) => {
    Topic.find({ supervisor: req.authInfo.oid })
      .select('-supervisor -__v')
      .exec((err, docs) => {
        if (err) return res.status(404).json('could not retrieve proposals')

        return res.json({ topics: docs })
      })
  }
)

// GET: Topic by topicCode
router.get(
  '/:code',
  passport.authenticate('oauth-bearer', { session: false }),
  (req, res) => {
    console.log(req.params)
    Topic.findOne({ code: req.params.code })
      .populate('supervisor', 'displayName')
      .exec((err, doc) => {
        if (err) {
          return res.status(500).json('could not retrieve topic at this time')
        }

        return res.json({ topic: doc })
      })
  }
)

// POST: Add Topic
router.post(
  '/add',
  passport.authenticate('oauth-bearer', { session: false }),
  permit('Supervisor'),
  async (req, res) => {
    // TODO: Validate topic data before using it
    let topicData = {
      title: req.body.title,
      description: req.body.description,
      tags: req.body.tags
    }

    topicData.supervisor = req.authInfo.oid

    if (req.body?.additionalNotes) {
      topicData.additionalNotes = req.body.additionalNotes
    }

    if (req.body?.targetedCourses) {
      topicData.targetedCourses = req.body.targetedCourses
    }

    // Validate the data passed in the request body

    // Required fields

    // TODO: Validate data coming from request

    new Topic(topicData).save((err, _) => {
      if (err) {
        console.log(err)
        return res.status(500).json('error saving to database')
      }
      res.json('success')
    })
  }
)

router.post(
  '/edit/:id',
  passport.authenticate('oauth-bearer', { session: false }),
  permit('Supervisor'),
  (req, res) => {
    // TODO: Sanatise req.body before updating topic
    Topic.findByIdAndUpdate(req.params.id, { $set: req.body }).exec(
      (err, doc) => {
        if (err) {
          return res.status(500).json('could not update topic')
        }
        console.log(doc)

        return res.json('topic updated')
      }
    )
  }
)

router.post(
  '/submit',
  passport.authenticate('oauth-bearer', { session: false }),
  permit('Supervisor'),
  (req, res) => {
    // TODO: Sanatise req.body before updating topic
    Topic.find({ supervisor: req.authInfo.oid, status: 'suggestion' })
      .populate('supervisor')
      .exec((err, docs) => {
        if (err) {
          return res.status(500).json('could not find topics')
        }

        docs.forEach((doc, i) => {
          let index = i + 1
          doc.status = 'active'
          let padToTwo = index <= 9999 ? `000${index}`.slice(-2) : index
          doc.code = doc.supervisor.abbr + '-' + padToTwo
          doc.save()
        })

        return res.json('topics submitted')
      })
  }
)

router.get(
  '/proposals/:id',
  passport.authenticate('oauth-bearer', { session: false }),
  permit('Supervisor'),
  (req, res) => {
    // TODO: Only find proposals with specific type (submitted, accepted, rejected)
    Proposal.find({
      topic: ObjectId(req.params.id),
      status: { $in: ['submitted', 'accepted', 'rejected'] }
    })
      .select({ student: 1, _id: 1, title: 1, status: 1 })
      .populate('student', 'displayName')
      .exec((err, docs) => {
        if (err) {
          return res.status(500).json('could not retrieve topic proposals')
        }

        return res.json({ proposals: docs })
      })
  }
)

module.exports = router
