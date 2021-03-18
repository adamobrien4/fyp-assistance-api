const router = require('express').Router()
const passport = require('passport')

const TopicService = require('../services/TopicService')

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
    TopicService.getOwned()
      .then(res => {
        return res.json(res)
      })
      .catch(err => {
        return res.status(500).json(err.message)
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
    TopicService.get(req.params.id, req.authInfo)
      .then(res => {
        return res.json(res)
      })
      .catch(err => {
        return res.status(500).json(err.message)
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
    TopicService.getTopicProposals(req.params.id)
      .then(res => {
        return res.json(res)
      })
      .catch(err => {
        return res.status(500).json(err.message)
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
    TopicService.search()
      .then(res => {
        return res.json(res)
      })
      .catch(err => {
        return res.status(500).json(err.message)
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
    TopicService.add()
      .then(res => {
        return res.json(res)
      })
      .catch(err => {
        return res.status(500).json(err.message)
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
    TopicService.edit()
      .then(res => {
        return res.json(res)
      })
      .catch(err => {
        return res.status(500).json(err.message)
      })
  }
)

module.exports = router
