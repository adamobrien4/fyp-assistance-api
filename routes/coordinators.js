const router = require('express').Router()
const passport = require('passport')

const permit = require('../middleware/authorization')
const validateResourceMW = require('../middleware/validateResource')

const CoordinatorService = require('../services/CoordinatorService')

const {
  removeCoordinatorSchema,
  assignCoordinatorSchema
} = require('../schemas/routes/coordinatorSchema')

// GET: List of coordinators
router.get(
  '/',
  passport.authenticate('oauth-bearer', { session: false }),
  permit(['Administrator', 'Coordinator']),
  async (req, res) => {
    CoordinatorService.getAll()
      .then(resp => {
        return res.json(resp)
      })
      .catch(err => {
        return res.status(500).json(err.message)
      })
  }
)

// POST: Delete a coordinator
router.post(
  '/remove',
  passport.authenticate('oauth-bearer', { session: false }),
  permit('Administrator'),
  validateResourceMW(removeCoordinatorSchema),
  async (req, res) => {
    CoordinatorService.remove(req)
      .then(resp => {
        return res.json(resp)
      })
      .catch(err => {
        return res.status(500).json(err.message)
      })
  }
)

// POST: Assign a new coordinator
router.post(
  '/assign',
  passport.authenticate('oauth-bearer', { session: false }),
  permit('Administrator'),
  validateResourceMW(assignCoordinatorSchema),
  async (req, res) => {
    CoordinatorService.assign(req)
      .then(resp => {
        return res.json(resp)
      })
      .catch(err => {
        return res.status(500).json(err.message)
      })
  }
)

module.exports = router
