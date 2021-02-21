const router = require('express').Router()
const passport = require('passport')

const Phase = require('../models/Phase')
const permit = require('../middleware/authorization')
const validateResourceMW = require('../middleware/validateResource')
const checkPhase = require('../middleware/phaseCheck')

const _ = require('lodash')

router.get(
  '/',
  //passport.authenticate('oauth-bearer', { session: false }),
  (req, res) => {
    Phase.findOne({
      start_time: { $lte: new Date() },
      end_time: { $gte: new Date() }
    }).exec((err, doc) => {
      if (err) {
        return res.status(500).json('could not find phase')
      }

      return res.json({ phase: doc })
    })
  }
)

router.get(
  '/all',
  //passport.authenticate('oauth-bearer', { session: false }),
  (req, res) => {
    Phase.find({})
      .sort('phase')
      .exec((err, docs) => {
        if (err) {
          return res.status(500).json('could not retrieve phases')
        }

        return res.json({ phases: docs })
      })
  }
)

router.post(
  '/edit',
  //passport.authenticate('oauth-bearer', { session: false }),
  async (req, res) => {
    // TODO: Validate input
    req.body.phases.forEach(async phase => {
      try {
        await Phase.updateOne(
          { _id: phase._id },
          { start_time: phase.start_time, end_time: phase.end_time }
        )
      } catch (err) {
        return res.status(500).json('could not update phase')
      }
    })

    return res.json('done')
  }
)

router.get(
  '/check',
  //passport.authenticate('oauth-bearer', { session: false }),
  checkPhase([0, 1]),
  async (req, res) => {
    // TODO: Validate input

    return res.json('done')
  }
)

module.exports = router
