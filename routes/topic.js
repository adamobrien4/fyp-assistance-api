const router = require('express').Router()
const passport = require('passport')

const Topic = require('../models/Topic')

const permit = require('../middleware/authorization')

router.get(
  '/',
  passport.authenticate('oauth-bearer', { session: false }),
  async (req, res) => {
    Topic.find({ status: { $in: ['active', 'assigned'] } })
      .populate('supervisor')
      .exec((err, docs) => {
        if (err) {
          console.log(err)
          return res
            .status(500)
            .json({ message: 'could not retrieve topics at this time' })
        }

        res.status(200).json({ topics: docs })
      })
  }
)

router.get(
  '/search',
  passport.authenticate('oauth-bearer', { session: false }),
  (req, res) => {
    let query = req.body.map(elem => {
      return { tags: elem }
    })
    Topic.find({ $or: [query] }).exec((err, docs) => {
      if (err) {
        return res.status(500).json('could not retrieve topics at this time')
      }

      return res.json({ topics: docs })
    })
  }
)

router.get(
  '/me',
  passport.authenticate('oauth-bearer', { session: false }),
  permit(['Supervisor', 'Coordinator']),
  async (req, res) => {
    Topic.find({ supervisor: req.authInfo.oid })
      .select('-supervisor -__v')
      .exec((err, docs) => {
        if (err) return res.status(404).json('could not retrieve proposals')

        return res.json({ topics: docs })
      })
  }
)

router.get(
  '/:code',
  passport.authenticate('oauth-bearer', { session: false }),
  (req, res) => {
    console.log(req.params)
    Topic.findOne({ code: req.params.code })
      .populate('supervisor')
      .exec((err, doc) => {
        if (err) {
          return res.status(500).json('could not retrieve topic at this time')
        }

        return res.json({ topic: doc })
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

    if (req.body?.additionalNotes) {
      topicData.additionalNotes = req.body.additionalNotes
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

router.post(
  '/submit',
  passport.authenticate('oauth-bearer', { session: false }),
  permit('Supervisor'),
  (req, res) => {
    // TODO: Sanatise req.body before updating topic
    Topic.find({ supervisor: req.authInfo.oid, status: 'suggestion' })
      .populate('supervisor')
      .exec((err, docs) => {
        if (err) {
          return res.status(500).json('could not find topics')
        }

        docs.forEach((doc, i) => {
          let index = i + 1
          doc.status = 'active'
          let padToTwo = index <= 9999 ? `000${index}`.slice(-2) : index
          doc.code = doc.supervisor.abbr + '-' + padToTwo
          doc.save()
        })

        return res.json('topics submitted')
      })
  }
)

module.exports = router
