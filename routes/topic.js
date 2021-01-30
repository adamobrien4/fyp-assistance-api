const router = require('express').Router()
const passport = require('passport')
const MUUID = require('uuid-mongodb')

const ObjectId = require('mongoose').Types.ObjectId

const Topic = require('../models/Topic')

const permit = require('../middleware/authorization')
const Supervisor = require('../models/Supervisor')

router.get(
  '/',
  //passport.authenticate('oauth-bearer', { session: false }),
  async (req, res) => {
    Topic.find()
      .populate('supervisor')
      .exec((err, docs) => {
        if (err) {
          return res
            .status(500)
            .json({ message: 'could not retrieve topics at this time' })
        }

        res.status(200).json({ topics: docs })
      })
  }
)

router.post(
  '/add',
  passport.authenticate('oauth-bearer', { session: false }),
  permit('Supervisor'),
  async (req, res) => {
    let topicData = {
      title: req.body.title,
      description: req.body.description,
      tags: req.body.tags
    }

    console.log(req.authInfo)
    console.log(MUUID.from(req.authInfo.oid).toString('D'))

    let supervisor = await Supervisor.findOne({
      azureId: MUUID.from(req.authInfo.oid).toString('D')
    })

    console.log(supervisor)

    topicData.supervisor = ObjectId(supervisor._id)

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

module.exports = router
