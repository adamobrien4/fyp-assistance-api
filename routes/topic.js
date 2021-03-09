const router = require('express').Router()
const passport = require('passport')
const { ObjectId } = require('mongoose').Types

const Topic = require('../models/Topic')
const Tag = require('../models/Tag')
const { Proposal } = require('../models/Proposal')

const permit = require('../middleware/authorization')
const validateResourceMW = require('../middleware/validateResource')
const isPhase = require('../middleware/phaseCheck')

const schema = require('../schemas/routes/topicsSchema')

// GET: Users owned Topics
/**
 * @swagger
 *  /topic/me:
 *   get:
 *     summary: Retrieve a list of topics which the current user owns
 *     tags:
 *      - Topic
 */
router.get(
  '/me',
  passport.authenticate('oauth-bearer', { session: false }),
  permit(['Supervisor', 'Coordinator']),
  async (req, res) => {
    console.log(req.authInfo)
    Topic.find({ supervisor: req.authInfo.oid })
      .select('-supervisor -__v')
      .exec(async (err, docs) => {
        if (err) return res.status(500).json('could not retrieve proposals')

        if (docs) {
          let topicIds = docs.map(d => d._id)

          let proposalInfo = await Proposal.aggregate([
            {
              $match: { topic: { $in: [...topicIds] }, status: 'submitted' }
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

// GET: Topic by topic id
/**
 * @swagger
 *  /topic/{id}:
 *   get:
 *     summary: Retrieve a list of topics which the current user owns
 *     tags:
 *       - Topic
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           example: 123-abdfc-grjkr
 *         required: true
 */
router.get(
  '/:id',
  passport.authenticate('oauth-bearer', { session: false }),
  permit(['Student', 'Supervisor', 'Coordinator']),
  (req, res) => {
    Topic.findOne({ _id: req.params.id }).exec(async (err, doc) => {
      if (err) {
        return res.status(500).json('could not retrieve topic at this time')
      }

      if (doc) {
        if (doc.ownerType === 'supervisor') {
          doc = await Topic.populate(doc, {
            path: 'supervisor',
            model: 'Supervisor'
          })
        } else {
          doc = await Topic.populate(doc, {
            path: 'supervisor',
            model: 'Coordinator'
          })
        }
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

/**
 * @swagger
 *  /topic/proposals/{id}:
 *    get:
 *      summary: Retrieve all proposals for a specific topic of type [submittted, accepted]
 *      tags:
 *       - Topic
 */
router.get(
  '/proposals/:id',
  passport.authenticate('oauth-bearer', { session: false }),
  permit(['Supervisor', 'Coordinator']),
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

/**
 * @swagger
 *  /topic/search:
 *   post:
 *    summary: Retrieve a list of topics which match some specified search criteria
 *    description: Description of the endpoint
 *    tags:
 *      - Topic
 *    responses:
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
  validateResourceMW(schema.search),
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

    Topic.find(query).exec(async (err, docs) => {
      if (err) {
        return res.status(500).json('could not retrieve topics at this time')
      }

      if (docs) {
        for (let i = 0; i < docs.length; i++) {
          if (docs[i].ownerType === 'supervisor') {
            docs[i] = await Topic.populate(docs[i], {
              path: 'supervisor',
              model: 'Supervisor'
            })
          } else {
            docs[i] = await Topic.populate(docs[i], {
              path: 'supervisor',
              model: 'Coordinator'
            })
          }
        }
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

      console.log(docs)

      return res.json({ topics: docs })
    })
  }
)

/**
 * @swagger
 *  /topic/add:
 *    post:
 *      summary: Create a new topic for the requesting supervisor
 *      tags:
 *        - Topic
 */
router.post(
  '/add',
  passport.authenticate('oauth-bearer', { session: false }),
  isPhase(2),
  permit(['Supervisor', 'Coordinator']),
  validateResourceMW(schema.add),
  async (req, res) => {
    let topicData = {
      title: req.body.title,
      description: req.body.description,
      tags: req.body.tags,
      status: 'active'
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

/**
 * @swagger
 *  /topic/edit/{id}:
 *    post:
 *      summary: Update an existing topic with the supplied data
 *      tags:
 *        - Topic
 */
router.post(
  '/edit/:id',
  passport.authenticate('oauth-bearer', { session: false }),
  permit(['Supervisor', 'Coordinator']),
  validateResourceMW(schema.edit),
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

module.exports = router
