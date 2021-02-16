const router = require('express').Router()
const passport = require('passport')

const {
  Proposal,
  CustomProposal,
  SupervisorProposal
} = require('../models/Proposal')
const permit = require('../middleware/authorization')
const validateResourceMW = require('../middleware/validateResource')

const { editProposalSchema } = require('../schemas/routes/proposalSchema')

const _ = require('lodash')

router.get(
  '/me',
  passport.authenticate('oauth-bearer', { session: false }),
  permit('Student'),
  async (req, res) => {
    console.log({ student: req.authInfo.oid })

    Proposal.find({}).exec((err, docs) => {
      if (err) {
        return res.status(500).json('could not retrieve proposals at this time')
      }

      return res.json({ proposals: docs })
    })
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
      proposal = new SupervisorProposal(topicData)
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
  validateResourceMW(editProposalSchema),
  (req, res) => {
    let editableFields = [
      'title',
      'description',
      'additionalNotes',
      'chooseMessage'
    ]

    // Check that the requesting user owns the proposal they are trying to edit
    Proposal.findOne({
      _id: req.params.id,
      student: req.authInfo.oid
    }).exec((err, doc) => {
      if (err) {
        return res.status(500).json('could not retrieve proposal at this time')
      }

      if (!doc) {
        return res.status(500).json('could not retrieve proposal at this time')
      }

      // Restrict the fields of a proposal that can be edited based on its status
      if (doc.type === 'studentDefined') {
        editableFields.push('environment', 'languages')
      }

      switch (doc.status) {
        case 'draft':
          // All fields can be edited
          break
        case 'pending_edits':
          editableFields = editableFields.splice(
            editableFields.indexOf('title'),
            1
          )
          break
        case 'submitted':
        case 'under_review':
        case 'accepted':
        case 'declined':
          return res.status(400).json('proposal cannot be edited at this time')
      }

      const query = _.pick(req.body, editableFields)

      if (doc) {
        let proposalQuery
        if (doc.type === 'studentDefined') {
          proposalQuery = CustomProposal.updateOne(
            { _id: req.params.id, student: req.authInfo.oid },
            { $set: query }
          )
        } else {
          proposalQuery = SupervisorProposal.updateOne(
            { _id: req.params.id, student: req.authInfo.oid },
            { $set: query }
          )
        }

        proposalQuery.exec((err, doc) => {
          if (err) {
            return res.status(500).json('could not update proposal')
          }

          return res.json('proposal updated')
        })
      } else {
        return res
          .status(500)
          .json('your requested proposal could not be found')
      }
    })
  }
)

module.exports = router
