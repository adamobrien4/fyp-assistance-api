const router = require('express').Router()
const passport = require('passport')

const {
  Proposal,
  CustomProposal,
  TopicProposal
} = require('../models/Proposal')
const permit = require('../middleware/authorization')

router.get(
  '/me',
  passport.authenticate('oauth-bearer', { session: false }),
  permit('Student'),
  async (req, res) => {
    console.log({ student: req.authInfo.oid })

    let customProposals
    let supervisorProposals

    try {
      supervisorProposals = await TopicProposal.find({
        student: req.authInfo.oid
      }).populate('topic')
    } catch (err) {
      console.log(err)
      return res.status(404).json('could not retrieve proposals')
    }

    try {
      customProposals = await CustomProposal.find({ student: req.authInfo.oid })
    } catch (e) {
      console.log(e)
    }

    return res.json({ proposals: supervisorProposals })
  }
)

router.post(
  '/add',
  passport.authenticate('oauth-bearer', { session: false }),
  permit('Student'),
  async (req, res) => {
    // TODO: Validate proposal data

    // TODO: Check that the user does not have a proposal sent for this tpoic already

    let topicData = {
      title: req.body.title,
      description: req.body.description,
      additionalNotes: req.body.additionalNotes,
      chooseMessage: req.body.chooseMessage,
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

    if (req.body?.isCustomProposal) {
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

router.post(
  '/edit/:id',
  passport.authenticate('oauth-bearer', { session: false }),
  permit('Student'),
  (req, res) => {
    console.log(req.body)

    // TODO: Validate input from user
    // Data which will be used to update the requested proposal

    // Check that the requesting user owns the proposal they are trying to edit
    Proposal.findOne({ _id: req.params.id, student: req.authInfo.oid }).exec(
      (err, docs) => {
        if (err) {
          return res.status(500).json('please try again')
        }

        if (docs) {
          Proposal.findByIdAndUpdate(req.params.id, { $set: req.body }).exec(
            (err, doc) => {
              if (err) {
                return res.status(500).json('could not update proposal')
              }

              console.log(doc)

              return res.json('proposal updated')
            }
          )
        } else {
          return res
            .status(403)
            .json('your requested proposal could not be found')
        }
      }
    )
  }
)

module.exports = router
