const router = require('express').Router()
const passport = require('passport')

const StudentService = require('../services/StudentService')

const permit = require('../middleware/authorization')
const isPhase = require('../middleware/phaseCheck')
const validateResourceMW = require('../middleware/validateResource')

const {
  assignStudentSchema,
  deleteStudentSchema
} = require('../schemas/routes/studentSchema')

/**
 * @swagger
 *  /student:
 *    get:
 *      summary: Retrieve all students from the database
 */
router.get(
  '/',
  passport.authenticate('oauth-bearer', { session: false }),
  permit(['Coordinator', 'Supervisor']),
  (req, res) => {
    StudentService.getAll()
      .then(students => {
        return res.json(students)
      })
      .catch(err => {
        return res.status(500).json(err.message)
      })
  }
)

/**
 * @swagger
 *  /student/assign:
 *    post:
 *      summary: Assign a new student to the system
 */
router.post(
  '/assign',
  passport.authenticate('oauth-bearer', { session: false }),
  isPhase(null),
  permit('Coordinator'),
  validateResourceMW(assignStudentSchema),
  async (req, res) => {
    StudentService.assign(req)
      .then(students => {
        return res.json(students)
      })
      .catch(err => {
        return res.status(500).json(err.message)
      })
  }
)

/**
 * @swagger
 *  /student/delete:
 *    post:
 *      summary: Remove a student from the system
 */
router.post(
  '/delete',
  passport.authenticate('oauth-bearer', { session: false }),
  isPhase(null),
  permit('Coordinator'),
  validateResourceMW(deleteStudentSchema),
  (req, res) => {
    // Get student Id
    StudentService.remove(req)
      .then(() => {
        return res.json('removed')
      })
      .catch(err => {
        console.log(err)
        return res.status(500).json(err.message)
      })
  }
)

module.exports = router
