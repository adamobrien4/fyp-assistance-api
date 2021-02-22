const router = require('express').Router()
const passport = require('passport')
const { ObjectId } = require('mongoose').Types

const Topic = require('../models/Topic')
const Tag = require('../models/Tag')
const { Proposal, SupervisorProposal } = require('../models/Proposal')

const permit = require('../middleware/authorization')
const validateResourceMW = require('../middleware/validateResource')
const isPhase = require('../middleware/phaseCheck')

const {
  addTopicSchema,
  searchTopicSchema
} = require('../schemas/routes/topicsSchema')

// TODO: Make search more efficient + clean code
router.post(
  '/search',
  passport.authenticate('oauth-bearer', { session: false }),
  validateResourceMW(searchTopicSchema),
  async (req, res) => {
    let query = { status: 'active' }
    let error = null

    // Check topicType
    switch (req.body?.topicType) {
      case 'regular':
      case 'studentTopic':
        query.type = req.body.topicType
        break
      default:
        break
    }

    // Check supervisor
    if (req.body?.supervisor) {
      query.supervisor = req.body.supervisor
    }

    // Check tags
    if (req.body?.tags) {
      let tagsQuery = req.body.tags.map(tag => {
        return { ancestors: tag }
      })

      let tagDocs
      try {
        tagDocs = await Tag.find({ $or: [...tagsQuery] })
          .select('_id')
          .exec()
      } catch (err) {
        return res.status(500).json('could not retrieve tags')
      }

      let tags = [...tagDocs.map(tag => tag._id), ...req.body.tags]

      // Search topics related to related query tags
      query['$or'] = tags.map(tag => ({
        tags: tag
      }))
    }

    Topic.find(query)
      .populate('supervisor')
      .exec((err, docs) => {
        if (err) {
          return res.status(500).json('could not retrieve topics at this time')
        }
        return res.json({ topics: docs })
      })

    // if (error) {
    //   return res.status(500).json(error)
    // }

    // // Supervisor and no tags
    // let query

    // let topicType = req.body.topicType === 'all' ? false : req.body.topicType

    // if (req.body.tags) {
    //   query = req.body.tags.map(tag => {
    //     return { ancestors: tag }
    //   })
    // }

    // if (req.body?.supervisor && !req.body?.tags) {
    //   Topic.find({ status: 'active', supervisor: req.body.supervisor })
    //     .populate('supervisor')
    //     .exec((err, docs) => {
    //       if (err) {
    //         return res.status(500).json('could not retrieve topics at this')
    //       }

    //       return res.json({ topics: docs })
    //     })
    //   return
    // }

    // // Tags and no supervisor

    // if (!req.body?.supervisor && req.body?.tags) {
    //   // Find tags related to queried tags
    //   Tag.find({ $or: [...query] })
    //     .select('_id')
    //     .exec((err, docs) => {
    //       if (err) {
    //         return res
    //           .status(500)
    //           .json('could not retrieve topics at this time')
    //       }

    //       let tags = [...docs.map(tag => tag._id), ...req.body.tags]

    //       // Search topics related to related query tags
    //       let query = tags.map(tag => ({
    //         tags: tag
    //       }))

    //       Topic.find({
    //         status: 'active',
    //         $or: [...query]
    //       })
    //         .populate('supervisor')
    //         .exec((err, docs) => {
    //           if (err) {
    //             return res
    //               .status(500)
    //               .json('could not retrieve topics at this time')
    //           }
    //           return res.json({ topics: docs })
    //         })
    //     })
    //   return
    // }

    // // Tags and supervisor

    // if (req.body?.supervisor && req.body?.tags) {
    //   // Find tags related to queried tags
    //   Tag.find({ $or: [...query] })
    //     .select({ _id: 1 })
    //     .exec((err, docs) => {
    //       if (err) {
    //         return res.status(500).json('could not retrieve tags at this time')
    //       }

    //       let tags = [...docs.map(tag => tag._id), ...req.body.tags]

    //       Topic.find({ supervisor: req.body.supervisor })
    //         .populate('supervisor')
    //         .exec((err2, docs2) => {
    //           if (err2) {
    //             return res
    //               .status(500)
    //               .json('could not retrieve topics at this time')
    //           }

    //           const result = docs2.filter(doc =>
    //             doc.tags.some(r => tags.includes(r))
    //           )

    //           return res.json({ topics: result })
    //         })
    //     })
    //   return
    // }

    // Topic.find({ status: 'active' })
    //   .populate('supervisor')
    //   .exec((err, docs) => {
    //     if (err) {
    //       return res.status(500).json('could not retrieve topics at this time')
    //     }

    //     return res.json({ topics: docs })
    //   })
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
        if (err) return res.status(500).json('could not retrieve proposals')

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
  isPhase(2),
  permit('Supervisor'),
  validateResourceMW(addTopicSchema),
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

// GET: Proposals related to a topic
router.get(
  '/proposals/:id',
  passport.authenticate('oauth-bearer', { session: false }),
  permit('Supervisor'),
  isPhase(4),
  (req, res) => {
    // TODO: Only find proposals with specific type (submitted, accepted, rejected)
    Proposal.find({
      topic: ObjectId(req.params.id),
      status: { $in: ['submitted', 'accepted'] }
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
