const router = require('express').Router()
const passport = require('passport')

const TopicService = require('../services/TopicService')

const permit = require('../middleware/authorization')
const validateResourceMW = require('../middleware/validateResource')
const isPhase = require('../middleware/phaseCheck')

const schema = require('../schemas/routes/topicsSchema')

// GET: Users owned Topics
router.get(
  '/me',
  passport.authenticate('oauth-bearer', { session: false }),
  permit(['Supervisor', 'Coordinator']),
  async (req, res) => {
    TopicService.getOwned(req.authInfo.oid)
      .then(resp => {
        return res.json(resp)
      })
      .catch(err => {
        return res.status(500).json(err.message)
      })
  }
)

// GET: Topic by topic id
router.get(
  '/:id',
  passport.authenticate('oauth-bearer', { session: false }),
  permit(['Student', 'Supervisor', 'Coordinator']),
  (req, res) => {
    TopicService.get(req.params.id, req.authInfo)
      .then(resp => {
        return res.json(resp)
      })
      .catch(err => {
        return res.status(500).json(err.message)
      })
  }
)

// GET: Proposals related to a topic
router.get(
  '/proposals/:id',
  passport.authenticate('oauth-bearer', { session: false }),
  permit(['Supervisor', 'Coordinator']),
  isPhase(4),
  (req, res) => {
    TopicService.getTopicProposals(req.params.id)
      .then(resp => {
        return res.json(resp)
      })
      .catch(err => {
        return res.status(500).json(err.message)
      })
  }
)

// POST: Search for topics by criteria
router.post(
  '/search',
  passport.authenticate('oauth-bearer', { session: false }),
  validateResourceMW(schema.search),
  async (req, res) => {
    TopicService.search(req)
      .then(resp => {
        return res.json(resp)
      })
      .catch(err => {
        return res.status(500).json(err.message)
      })
  }
)

// POST: Add a new topic
router.post(
  '/add',
  passport.authenticate('oauth-bearer', { session: false }),
  isPhase(2),
  permit(['Supervisor', 'Coordinator']),
  validateResourceMW(schema.add),
  async (req, res) => {
    TopicService.add(req)
      .then(resp => {
        return res.json(resp)
      })
      .catch(err => {
        return res.status(500).json(err.message)
      })
  }
)

// POST: Edit an existing topic
router.post(
  '/edit/:id',
  passport.authenticate('oauth-bearer', { session: false }),
  permit(['Supervisor', 'Coordinator']),
  validateResourceMW(schema.edit),
  (req, res) => {
    TopicService.edit(req)
      .then(resp => {
        return res.json(resp)
      })
      .catch(err => {
        return res.status(500).json(err.message)
      })
  }
)

module.exports = router
