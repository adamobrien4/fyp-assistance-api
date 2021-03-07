const router = require('express').Router()
const passport = require('passport')

const { Proposal, CustomProposal } = require('../models/Proposal')
const Topic = require('../models/Topic')

const permit = require('../middleware/authorization')
const validateResourceMW = require('../middleware/validateResource')
const isPhase = require('../middleware/phaseCheck')

const {
  addProposalSchema,
  editProposalSchema,
  proposalResponseSchema
} = require('../schemas/routes/proposalSchema')

// GET: Get all requesting student's proposals
router.get(
  '/me',
  passport.authenticate('oauth-bearer', { session: false }),
  //isPhase(4),
  permit('Student'),
  async (req, res) => {
    Proposal.find({ student: req.authInfo.oid })
      .populate('topic', 'title')
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
  //isPhase(4),
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
    } else if (
      req.authInfo.roles.includes('Supervisor') ||
      req.authInfo.roles.includes('Coordinator')
    ) {
      Proposal.findOne({ _id: req.params.proposalId })
        .populate('topic', 'supervisor')
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
  isPhase([3, 4]),
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

// POST: Edit proposal
router.post(
  '/edit/:id',
  passport.authenticate('oauth-bearer', { session: false }),
  // isPhase([3,4]),
  permit('Student'),
  validateResourceMW(editProposalSchema),
  (req, res) => {
    console.log(req.body)

    // Check that the requesting user owns the proposal they are trying to edit
    Proposal.findOne({
      _id: req.params.id,
      student: req.authInfo.oid,
      $or: [{ status: 'draft' }, { status: 'pending_edits' }]
    }).exec((err, doc) => {
      if (err) {
        return res.status(500).json('could not retrieve proposal at this time')
      }

      if (!doc) {
        return res.status(404).json('invalid proposal id')
      }

      if (doc) {
        Proposal.updateOne(
          {
            _id: req.params.id,
            student: req.authInfo.oid
          },
          { $set: req.body }
        ).exec((err, doc) => {
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

// POST: Upgrade proposal to next status
router.post(
  '/:id/upgrade',
  passport.authenticate('oauth-bearer', { session: false }),
  // isPhase([3,4]),
  permit('Student'),
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

// POST: Upgrade proposal to next status
router.post(
  '/:id/downgrade',
  passport.authenticate('oauth-bearer', { session: false }),
  // isPhase([3,4]),
  permit('Student'),
  isPhase(3),
  (req, res) => {
    Proposal.findOne({ _id: req.params.id, status: 'submitted' }).exec(
      (err, doc) => {
        if (err) {
          return res.status(500).json('could not retrieve proposal')
        }

        if (doc) {
          doc.status = 'draft'
          try {
            doc.save()
          } catch (err) {
            return res.status(500).json('could not update proposal')
          }
          return res.json('proposal updated')
        }

        return res.status(404).json('could not find proposal')
      }
    )
  }
)

// POST: Supervisor respond to proposal
router.post(
  '/respond/:id',
  passport.authenticate('oauth-bearer', { session: false }),
  // isPhase(4),
  permit(['Supervisor', 'Coordinator']),
  validateResourceMW(proposalResponseSchema),
  async (req, res) => {
    let proposalDoc = await Proposal.findOne({
      _id: req.params.id,
      status: 'submitted'
    })
      .populate('topic')
      .exec()

    if (proposalDoc) {
      if (proposalDoc.topic.supervisor !== req.authInfo.oid) {
        return res.status(403).json('Unauthorised')
      }

      proposalDoc.status = req.body.responseType
      proposalDoc.supervisorMessage = req.body.message

      try {
        await proposalDoc.save()
      } catch (err) {
        console.error(err)
        return res.status(500).json('could not update proposal status')
      }

      if (
        proposalDoc.topic.type === 'regular' &&
        req.body.responseType === 'accepted'
      ) {
        const topic = await Topic.findOne({ _id: proposalDoc.topic._id }).exec()

        if (topic) {
          topic.status = 'assigned'
          try {
            await topic.save()
            return res.json('update success')
          } catch (e) {
            return res.status(500).json('could not update topic')
          }
        } else {
          return res.status(500).json('could not retrieve topic')
        }
      } else {
        return res.json('update success')
      }
    } else {
      return res.status(400).json('could not find proposal')
    }
  }
)

module.exports = router
