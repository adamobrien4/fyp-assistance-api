const mongoose = require('mongoose')
const { Schema } = mongoose
const Populate = require('./utils/autoPopulate')

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

const topicProposalSchema = new Schema({
  topic: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Topic'
  }
})

// Always populate the topic field
topicProposalSchema
  .pre('findOne', Populate('topic'))
  .pre('findOne', Populate('topic'))

const TopicProposal = Proposal.discriminator(
  'supervisorDefined',
  topicProposalSchema
)

module.exports = {
  Proposal,
  CustomProposal,
  TopicProposal
}
