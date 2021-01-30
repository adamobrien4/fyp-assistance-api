const router = require('express').Router()
const passport = require('passport')

const { CustomProposal, TopicProposal } = require('../models/Proposal')
const permit = require('../middleware/authorization')

router.post(
  '/add',
  passport.authenticate('oauth-bearer', { session: false }),
  permit('Student'),
  async (req, res) => {
    // TODO: Validate proposal data

    let topicData = {
      title: req.body.title,
      description: req.body.description,
      additionalNotes: req.body.additionalNotes,
      isCustomProposal: req.body.isCustomProposal,
      student: req.authInfo.oid
    }

    if (req.body.isCustomProposal) {
      let prev = { ...topicData }
      topicData = {
        ...prev,
        environment: req.body.environment,
        languages: req.body.languages
      }
    } else {
      let prev = { ...topicData }
      topicData = {
        ...prev,
        topic: req.body.topic
      }
    }

    let proposal = null

    if (topicData.isCustomProposal) {
      proposal = new CustomProposal(topicData)
    } else {
      proposal = new TopicProposal(topicData)
    }

    proposal.save((err, doc) => {
      if (err) {
        console.log(err)
        return res.json('could not add proposal')
      }

      console.log(doc)
      return res.json('Proposal added')
    })
  }
)

module.exports = router
