const router = require('express').Router()
const passport = require('passport')

const Phase = require('../models/Phase')
const permit = require('../middleware/authorization')
const validateResourceMW = require('../middleware/validateResource')
const checkPhase = require('../middleware/phaseCheck')

const { editPhaseSchema } = require('../schemas/routes/phaseSchema')

/**
 * @swagger
 *  /phases:
 *    get:
 *      summary: Retrieve the current phase
 */
router.get(
  '/',
  passport.authenticate('oauth-bearer', { session: false }),
  (req, res) => {
    Phase.findOne({
      start_date: { $lte: new Date() },
      end_date: { $gte: new Date() }
    })
      .select('start_date end_date')
      .exec((err, doc) => {
        if (err) {
          return res.status(500).json('could not find phase')
        }

        return res.json({ phase: doc })
      })
  }
)

/**
 * @swagger
 *  /phases/all:
 *    get:
 *      summary: Retrieve all phases for the system
 */
router.get(
  '/all',
  passport.authenticate('oauth-bearer', { session: false }),
  (req, res) => {
    Phase.find({})
      .sort('_id')
      .exec((err, docs) => {
        if (err) {
          return res.status(500).json('could not retrieve phases')
        }

        return res.json({ phases: docs })
      })
  }
)

/**
 * @swagger
 *  /phases/edit:
 *    post:
 *      summary: Edit the current system phases
 */
router.post(
  '/edit',
  passport.authenticate('oauth-bearer', { session: false }),
  permit('Administrator'),
  validateResourceMW(editPhaseSchema),
  async (req, res) => {
    let query = []

    // Check that each phase;s date follows the previous
    for (var i = 0; i < req.body.phases.length; i++) {
      let p = req.body.phases[i]
      if (
        i < req.body.phases.length - 1 &&
        p.date > req.body.phases[i + 1].date
      ) {
        return res
          .status(400)
          .json(
            `Phase ${p.phase}'s start date must be before Phase ${
              p.phase + 1
            }'s start date`
          )
      }

      // Prepare the query to insert to DB
      query.push({
        phase: p.phase,
        start_date: p.date,
        end_date:
          p.phase === req.body.phases.length
            ? new Date(p.date).getTime() + 1000 * 60 * 60 * 24 * 365
            : new Date(req.body.phases[i + 1].date).getTime() - 1000 * 60 * 5
      })
    }

    for (var phase of query) {
      try {
        await Phase.updateOne(
          { _id: phase.phase },
          { start_date: phase.start_date, end_date: phase.end_date }
        ).exec()
      } catch (err) {
        console.log(err)
        return res.status(500).json('could not update phase')
      }
    }

    return res.json('phases updated')
  }
)

module.exports = router
