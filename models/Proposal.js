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
    student: {
      type: String,
      required: true
    }
  },
  { discriminatorKey: 'type' }
)

const Proposal = mongoose.model('Proposal', proposalSchema)

const CustomProposal = Proposal.discriminator(
  'Custom',
  new Schema({
    environment: {
      type: String,
      required: true
    },
    languages: {
      type: String,
      required: true
    }
  })
)

const TopicProposal = Proposal.discriminator(
  'Supervisor',
  new Schema({
    topic: {
      type: Schema.Types.ObjectId,
      required: true
    }
  })
)

module.exports = {
  CustomProposal,
  TopicProposal
}
