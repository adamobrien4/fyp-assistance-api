const mongoose = require('mongoose')
const { Schema } = mongoose

const proposalSchema = new Schema(
  {
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    additionalNotes: {
      type: String
    },
    chooseMessage: {
      type: String
    },
    student: {
      ref: 'Student',
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: [
        'draft',
        'submitted',
        'under_review',
        'pending_edits',
        'accepted',
        'declined'
      ],
      default: 'draft'
    },
    topic: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Topic'
    },
    type: {
      type: String,
      enum: ['supervisorDefined', 'studentDefined'],
      default: 'supervisorDefined'
    },
    supervisorMessage: {
      type: String
    }
  },
  { discriminatorKey: 'type' }
)

const Proposal = mongoose.model('Proposal', proposalSchema)

const customProposalSchema = new Schema({
  environment: {
    type: String,
    required: true
  },
  languages: {
    type: String,
    required: true
  }
})

const CustomProposal = Proposal.discriminator(
  'studentDefined',
  customProposalSchema
)

module.exports = {
  Proposal,
  CustomProposal
}
