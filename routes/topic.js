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

router.post('/test', async (req, res) => {
  let topics = await Topic.find({})
    .select('title description code supervisor type tags targetCourses')
    .exec()
  let topicIds = []

  topics.forEach(t => {
    topicIds.push(t._id)
  })

  let proposals = await Proposal.aggregate([
    {
      $match: { topic: { $in: [...topicIds] } }
    },
    {
      $group: { _id: '$topic', count: { $sum: 1 } }
    }
  ])

  let result = {}

  proposals.forEach(el => {
    result[el._id] = { count: el.count }
  })

  console.log(result)

  let s = topics.map(t => ({
    ...t._doc,
    proposalCount: result[t._id]?.count ? result[t._id]?.count : 0
  }))

  res.json(s)
})

// TODO: Make search more efficient + clean code
/**
 * @swagger
 *  /topic/search:
 *   post:
 *     summary: Retrieve a list of topics which match some specified search criteria
 *     description: Description of the endpoint
 *     responses:
 *       200:
 *         description: A list of topics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                topics:
 *                  type: array
 *                  items:
 *                    type: object
 *                    properties:
 *                      title:
 *                        type: string
 *                      description:
 *                        type: string
 *                      code:
 *                        type: string
 */
router.post(
  '/search',
  passport.authenticate('oauth-bearer', { session: false }),
  validateResourceMW(searchTopicSchema),
  async (req, res) => {
    let query = { status: 'active' }

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
      query.$or = tags.map(tag => ({
        tags: tag
      }))
    }

    Topic.find(query)
      .populate('supervisor')
      .exec(async (err, docs) => {
        if (err) {
          return res.status(500).json('could not retrieve topics at this time')
        }

        if (docs) {
          let topicIds = docs.map(d => d._id)

          let proposalInfo = await Proposal.aggregate([
            {
              $match: { topic: { $in: [...topicIds] } }
            },
            {
              $group: { _id: '$topic', count: { $sum: 1 } }
            }
          ])

          let countInfo = {}

          proposalInfo.forEach(el => (countInfo[el._id] = { count: el.count }))

          let result = docs.map(t => ({
            ...t._doc,
            proposalCount: countInfo[t._id]?.count ? countInfo[t._id]?.count : 0
          }))

          docs = result
        }

        return res.json({ topics: docs })
      })
  }
)

// GET: Users owned Topics
/**
 * @swagger
 *  /topic/me:
 *   get:
 *     summary: Retrieve a list of topics which the current user owns
 */
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
/**
 * @swagger
 *  /topic/{code}:
 *   get:
 *     summary: Retrieve a list of topics which the current user owns
 *     parameters:
 *       - in: path
 *         name: code
 *         schema:
 *           type: string
 *           example: 123-abdfc-grjkr
 *         required: true
 */
router.get(
  '/:code',
  passport.authenticate('oauth-bearer', { session: false }),
  permit(['Student', 'Supervisor', 'Coordinator']),
  (req, res) => {
    Topic.findOne({ code: req.params.code })
      .populate('supervisor', 'displayName')
      .exec(async (err, doc) => {
        if (err) {
          return res.status(500).json('could not retrieve topic at this time')
        }

        if (req.authInfo.roles.includes('Student')) {
          // Check if student has created proposal for this topic or not already
          let hasProposal = await Proposal.findOne({
            topic: doc._id,
            student: req.authInfo.oid
          })
            .select('_id')
            .exec()

          if (hasProposal) {
            doc._doc.hasProposal = true
          }
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
