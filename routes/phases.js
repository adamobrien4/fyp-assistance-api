const router = require('express').Router()
const passport = require('passport')

const PhaseService = require('../services/PhaseService')
const permit = require('../middleware/authorization')
const validateResourceMW = require('../middleware/validateResource')

const { editPhaseSchema } = require('../schemas/routes/phaseSchema')

// GET: Retrieve the current phase
router.get(
  '/',
  passport.authenticate('oauth-bearer', { session: false }),
  (req, res) => {
    PhaseService.getCurrentPhase()
      .then(resp => {
        return res.json(resp)
      })
      .catch(err => {
        return res.status(500).json(err.message)
      })
  }
)

// GET: Retrieve all phases for the system
router.get(
  '/all',
  passport.authenticate('oauth-bearer', { session: false }),
  (req, res) => {
    PhaseService.getAll()
      .then(resp => {
        return res.json(resp)
      })
      .catch(err => {
        return res.status(500).json(err.message)
      })
  }
)

// POST: Edit the current system phases
router.post(
  '/edit',
  passport.authenticate('oauth-bearer', { session: false }),
  permit('Administrator'),
  validateResourceMW(editPhaseSchema),
  async (req, res) => {
    PhaseService.edit(req)
      .then(resp => {
        return res.json(resp)
      })
      .catch(err => {
        return res.status(500).json(err.message)
      })
  }
)

module.exports = router
