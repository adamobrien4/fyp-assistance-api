const router = require('express').Router()
const passport = require('passport')
const MUUID = require('uuid-mongodb')

const ObjectId = require('mongoose').Types.ObjectId

const Topic = require('../models/Topic')

const permit = require('../middleware/authorization')
const Supervisor = require('../models/Supervisor')

router.get(
  '/',
  passport.authenticate('oauth-bearer', { session: false }),
  async (req, res) => {
    Topic.find({ status: { $in: ['active', 'assigned'] } }).exec(
      (err, docs) => {
        if (err) {
          console.log(err)
          return res
            .status(500)
            .json({ message: 'could not retrieve topics at this time' })
        }

        res.status(200).json({ topics: docs })
      }
    )
  }
)

router.get(
  '/me',
  passport.authenticate('oauth-bearer', { session: false }),
  permit('Supervisor'),
  async (req, res) => {
    Topic.find({ supervisor: req.authInfo.oid }).exec((err, docs) => {
      if (err) return res.status(404).json('could not retrieve proposals')

      return res.json({ topics: docs })
    })
  }
)

router.post(
  '/add',
  passport.authenticate('oauth-bearer', { session: false }),
  permit('Supervisor'),
  async (req, res) => {
    // TODO: Validate topic data before using it
    let topicData = {
      title: req.body.title,
      description: req.body.description,
      tags: req.body.tags
    }

    topicData.supervisor = req.authInfo.oid

    if (req.body?.desiredSkills) {
      topicData.desiredSkills = req.body.desiredSkills
    }

    if (req.body?.requirements) {
      topicData.requirements = req.body.requirements
    }

    if (req.body?.targetedCourses) {
      topicData.targetedCourses = req.body.targetedCourses
    }

    // Validate the data passed in the request body

    // Required fields

    // TODO: Validate data coming from request

    new Topic(topicData).save((err, _) => {
      if (err) {
        console.log(err)
        return res.status(500).json('error saving to database')
      }
      res.json('success')
    })
  }
)

router.post(
  '/edit/:id',
  passport.authenticate('oauth-bearer', { session: false }),
  permit('Supervisor'),
  (req, res) => {
    // TODO: Sanatise req.body before updating topic
    Topic.findByIdAndUpdate(req.params.id, { $set: req.body }).exec(
      (err, doc) => {
        if (err) {
          return res.status(500).json('could not update topic')
        }
        console.log(doc)

        return res.json('topic updated')
      }
    )
  }
)

module.exports = router
