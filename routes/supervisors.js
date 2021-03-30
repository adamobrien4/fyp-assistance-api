const router = require('express').Router()
const passport = require('passport')

const permit = require('../middleware/authorization')
const isPhase = require('../middleware/phaseCheck')
const validateResourceMW = require('../middleware/validateResource')

const SupervisorService = require('../services/SupervisorService')

const {
  assignSupervisorSchema,
  editSupervisorSchema,
  studentProjectAvailibilitySchema,
  deleteSupervisorSchema
} = require('../schemas/routes/supervisorSchema')

// GET: List of all supervisors
router.get(
  '/',
  passport.authenticate('oauth-bearer', { session: false }),
  permit(['Administrator', 'Coordinator']),
  (req, res) => {
    SupervisorService.getAll()
      .then(resp => {
        return res.json(resp)
      })
      .catch(err => {
        console.log(err)
        return res.status(500).json(err.message)
      })
  }
)

// GET: Supervisors profile
router.get(
  '/me',
  passport.authenticate('oauth-bearer', { session: false }),
  isPhase(null),
  permit('Supervisor'),
  (req, res) => {
    SupervisorService.getProfile(req.authInfo.oid)
      .then(resp => {
        return res.json(resp)
      })
      .catch(err => {
        console.log(err)
        return res.status(500).json(err.message)
      })
  }
)

// POST: Assign new supervisor
router.post(
  '/assign',
  passport.authenticate('oauth-bearer', { session: false }),
  isPhase(null),
  permit('Coordinator'),
  validateResourceMW(assignSupervisorSchema),
  async (req, res) => {
    SupervisorService.assign(req)
      .then(resp => {
        return res.json(resp)
      })
      .catch(err => {
        console.log(err)
        return res.status(500).json(err.message)
      })
  }
)

// POST: Edit supervisor
router.post(
  '/me/edit',
  passport.authenticate('oauth-bearer', { session: false }),
  isPhase(null),
  permit('Supervisor'),
  validateResourceMW(editSupervisorSchema),
  (req, res) => {
    SupervisorService.edit(req)
      .then(resp => {
        return res.json(resp)
      })
      .catch(err => {
        console.log(err)
        return res.status(500).json(err.message)
      })
  }
)

// POST: Toggle custom topic supervision status
router.post(
  '/me/studentProjectAvailibility',
  passport.authenticate('oauth-bearer', { session: false }),
  // isPhase(3),
  permit(['Supervisor', 'Coordinator']),
  validateResourceMW(studentProjectAvailibilitySchema),
  async (req, res) => {
    SupervisorService.updateCustomTopicAvailibility(
      req.body.active,
      req.authInfo
    )
      .then(resp => {
        return res.json(resp)
      })
      .catch(err => {
        console.log(err)
        return res.status(500).json(err.message)
      })
  }
)

// GET: Custom topic supervision status
router.get(
  '/me/studentProjectAvailibility',
  passport.authenticate('oauth-bearer', { session: false }),
  isPhase(null),
  permit(['Supervisor', 'Coordinator']),
  async (req, res) => {
    SupervisorService.getCustomTopicAvailibility(req.authInfo.oid)
      .then(topic => {
        return res.json(topic)
      })
      .catch(err => {
        console.log(err)
        return res.status(500).json(err.message)
      })
  }
)

// POST: Remove supervisor from system
router.post(
  '/delete',
  passport.authenticate('oauth-bearer', { session: false }),
  isPhase(null),
  permit('Coordinator'),
  validateResourceMW(deleteSupervisorSchema),
  (req, res) => {
    SupervisorService.remove(req)
      .then(list => {
        return res.json(list)
      })
      .catch(err => {
        console.log(err)
        return res.status(500).json(err.message)
      })
  }
)

// GET: Supervisor list
router.get(
  '/list',
  passport.authenticate('oauth-bearer', { session: false }),
  isPhase(null),
  (req, res) => {
    SupervisorService.list()
      .then(list => {
        return res.json(list)
      })
      .catch(err => {
        console.log(err)
        return res.status(500).json(err.message)
      })
  }
)

module.exports = router
