const router = require('express').Router()
const passport = require('passport')

const {
  Proposal,
  CustomProposal,
  SupervisorProposal
} = require('../models/Proposal')
const Topic = require('../models/Topic')
const permit = require('../middleware/authorization')
const validateResourceMW = require('../middleware/validateResource')

const {
  addProposalSchema,
  editProposalSchema,
  proposalResponseSchema
} = require('../schemas/routes/proposalSchema')

const _ = require('lodash')

// GET: /me
router.get(
  '/me',
  passport.authenticate('oauth-bearer', { session: false }),
  permit('Student'),
  async (req, res) => {
    console.log({ student: req.authInfo.oid })

    Proposal.find({ student: req.authInfo.oid })
      .populate('topic', 'code title')
      .exec((err, docs) => {
        if (err) {
          return res
            .status(500)
            .json('could not retrieve proposals at this time')
        }

        return res.json({ proposals: docs })
      })
  }
)

// GET: A proposal on its ID
router.get(
  '/:proposalId',
  passport.authenticate('oauth-bearer', { session: false }),
  (req, res) => {
    // Get proposal for both custom and supervisor defined topics

    // If student is trying to view
    if (req.authInfo.roles.includes('Student')) {
      Proposal.findOne({
        _id: req.params.proposalId,
        student: req.authInfo.oid
      }).exec((err, proposal) => {
        if (err) {
          return res.status(500).json('could not retrieve proposal')
        }

        if (proposal) {
          console.log('Student viewing their own proposal')
          return res.json({ proposal: proposal })
        }

        return res.status(403).json('Unauthorised')
      })
    } else if (req.authInfo.roles.includes('Supervisor')) {
      Proposal.findOne({ _id: req.params.proposalId })
        .populate('topic')
        .exec((err, proposal) => {
          if (err) {
            return res.status(500).json('could not retrieve proposal')
          }

          if (proposal?.topic?.supervisor === req.authInfo.oid) {
            return res.json({ proposal: proposal })
          } else {
            return res.status(403).json('Unauthorised')
          }
        })
    }
  }
)

// POST: Add a new proposal
router.post(
  '/add',
  passport.authenticate('oauth-bearer', { session: false }),
  permit('Student'),
  validateResourceMW(addProposalSchema),
  async (req, res) => {
    // Check that the user does not have a proposal sent for this topic already
    let hasExistingProposalForTopic = await Proposal.findOne({
      student: req.authInfo.oid,
      topic: req.body.topic
    }).exec()

    if (hasExistingProposalForTopic) {
      // Student already has a proposal sent for this topic
      return res.status(400).json('existing_topic_proposal')
    }

    let topicDocument = await Topic.findOne({ _id: req.body.topic }).exec()

    if (topicDocument === null) {
      return res
        .status(400)
        .json('related topic id could not be linked to existing topic')
    }

    let topicData = {
      title: req.body.title,
      description: req.body.description,
      additionalNotes: req.body.additionalNotes,
      chooseMessage: req.body.chooseMessage,
      student: req.authInfo.oid,
      topic: req.body.topic,
      type:
        topicDocument.type === 'regular'
          ? 'supervisorDefined'
          : 'studentDefined',
      status: req.body.saveAsDraft ? 'draft' : 'submitted'
    }

    if (req.body.isCustomProposal) {
      let prev = { ...topicData }
      topicData = {
        ...prev,
        environment: req.body.environment,
        languages: req.body.languages
      }
    }

    let proposal = null

    if (req.body?.isCustomProposal) {
      proposal = new CustomProposal(topicData)
    } else {
      proposal = new Proposal(topicData)
    }

    proposal.save((err, doc) => {
      if (err) {
        console.log(err)
        return res.json('could not add proposal')
      }

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
    // TODO: Only allow edit when it is a speciic status

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

router.post(
  '/:id/nextStep',
  passport.authenticate('oauth-bearer', { session: false }),
  permit('Student'),
  validateResourceMW(editProposalSchema),
  (req, res) => {
    Proposal.findOne({ _id: req.params.id }).exec((err, doc) => {
      if (err) {
        return res.status(500).json('could not retrieve proposal')
      }

      if (doc) {
        switch (doc.status) {
          case 'draft':
            doc.status = 'submitted'
            // TODO: Create notification for supervisor
            break
          case 'pending_edits':
            doc.status = 'submitted'
            // TODO: Create notification for supervisor
            break
          default:
            return res
              .status(400)
              .json('cannot take next step for this proposal')
        }

        try {
          doc.save()
        } catch (err) {
          return res.status(500).json('could not update proposal')
        }
        return res.json('proposal updated')
      }

      return res.status(404).json('could not find proposal')
    })
  }
)

router.post(
  '/respond/:id',
  passport.authenticate('oauth-bearer', { session: false }),
  permit(['Supervisor', 'Coordinator']),
  validateResourceMW(proposalResponseSchema),
  async (req, res) => {
    let proposalDoc = await Proposal.findOne({ _id: req.params.id }).exec()

    if (proposalDoc) {
      proposalDoc.status = req.body.responseType
      proposalDoc.supervisorMessage = req.body.message

      try {
        await proposalDoc.save()
        return res.json('update successful')
      } catch (err) {
        return res.status(500).json('could not update proposal status')
      }
    } else {
      return res.status(400).json('could not find proposal')
    }
  }
)

module.exports = router
