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

/**
 * @swagger
 *  /supervisor:
 *    get:
 *      summary: Retrieve a list of all supervisors
 *      tags:
 *        - Supervisor
 */
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

/**
 * @swagger
 *  /supervisor/me:
 *    get:
 *      summary: Retrieves the requesting supervisors account
 *      tags:
 *        - Supervisor
 */
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

/**
 * @swagger
 *  /supervisor/assign:
 *    post:
 *      summary: Assign new supervisors to the system by passed emails
 *      tags:
 *        - Supervisor
 */
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

/**
 * @swagger
 *  /supervisor/me/edit:
 *    post:
 *      summary: Allow a supervisor to edit their account details
 *      tags:
 *        - Supervisor
 */
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

/**
 * @swagger
 *  /supervisor/me/studentProjectAvailibility:
 *    post:
 *      summary: Make supervisor available to supervise student defined topics or not
 *      tags:
 *        - Supervisor
 */
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

/**
 * @swagger
 *  /supervisor/me/studentProjectAvailibility:
 *    get:
 *      summary: Retrieve whether a supervisor is available to supervise student projects or not
 *      tags:
 *        - Supervisor
 */
router.get(
  '/me/studentProjectAvailibility',
  passport.authenticate('oauth-bearer', { session: false }),
  isPhase(null),
  permit('Supervisor'),
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

/**
 * @swagger
 *  /supervisor/delete:
 *    post:
 *      summary: Removes a supervisor from the system
 *      tags:
 *        - Supervisor
 */
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

/**
 * @swagger
 *  /supervisor/list:
 *    get:
 *      summary: Returns a list of supervisors with only their displayName
 *      tags:
 *        - Supervisor
 */
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
