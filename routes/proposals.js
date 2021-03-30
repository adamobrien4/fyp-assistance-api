const router = require('express').Router()
const passport = require('passport')

const ProposalService = require('../services/ProposalService')

const permit = require('../middleware/authorization')
const validateResourceMW = require('../middleware/validateResource')
const isPhase = require('../middleware/phaseCheck')

const {
  addProposalSchema,
  editProposalSchema,
  proposalResponseSchema
} = require('../schemas/routes/proposalSchema')

// GET: Retrieve all proposals for the requesting student
router.get(
  '/me',
  passport.authenticate('oauth-bearer', { session: false }),
  permit('Student'),
  async (req, res) => {
    ProposalService.getOwned(req)
      .then(resp => {
        return res.json(resp)
      })
      .catch(err => {
        return res.status(500).json(err.message)
      })
  }
)

// GET:  Retrieve a proposal based on its id
router.get(
  '/:proposalId',
  passport.authenticate('oauth-bearer', { session: false }),
  isPhase(4),
  (req, res) => {
    ProposalService.get(req)
      .then(resp => {
        return res.json(resp)
      })
      .catch(err => {
        return res.status(500).json(err.message)
      })
  }
)

// POST: Add a new proposal
router.post(
  '/add',
  passport.authenticate('oauth-bearer', { session: false }),
  isPhase([3, 4]),
  permit('Student'),
  validateResourceMW(addProposalSchema),
  async (req, res) => {
    ProposalService.add(req)
      .then(resp => {
        return res.json(resp)
      })
      .catch(err => {
        return res.status(500).json(err.message)
      })
  }
)

// POST: Edit an existing proposal based on its id
router.post(
  '/edit/:id',
  passport.authenticate('oauth-bearer', { session: false }),
  // isPhase([3,4]),
  permit('Student'),
  validateResourceMW(editProposalSchema),
  (req, res) => {
    ProposalService.edit(req)
      .then(resp => {
        return res.json(resp)
      })
      .catch(err => {
        return res.status(500).json(err.message)
      })
  }
)

// POST: Upgrade the status of the supplied proposal
router.post(
  '/:id/upgrade',
  passport.authenticate('oauth-bearer', { session: false }),
  isPhase([3, 4]),
  permit('Student'),
  (req, res) => {
    ProposalService.upgrade(req)
      .then(resp => {
        return res.json(resp)
      })
      .catch(err => {
        return res.status(500).json(err.message)
      })
  }
)

// POST: Downgrade a proposal from submitted to draft status by its id
router.post(
  '/:id/downgrade',
  passport.authenticate('oauth-bearer', { session: false }),
  isPhase([3, 4]),
  permit('Student'),
  isPhase(3),
  (req, res) => {
    ProposalService.downgrade(req)
      .then(resp => {
        return res.json(resp)
      })
      .catch(err => {
        return res.status(500).json(err.message)
      })
  }
)

// POST: Allow a supervisor to respond to a proposal sent to a topic which they proposed
router.post(
  '/respond/:id',
  passport.authenticate('oauth-bearer', { session: false }),
  // isPhase(4),
  permit(['Supervisor', 'Coordinator']),
  validateResourceMW(proposalResponseSchema),
  async (req, res) => {
    ProposalService.respond(req)
      .then(resp => {
        return res.json(resp)
      })
      .catch(err => {
        return res.status(500).json(err.message)
      })
  }
)

module.exports = router
