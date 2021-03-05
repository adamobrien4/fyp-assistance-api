const mongoose = require('mongoose')
const { Schema } = mongoose

const topicSchema = new Schema({
  supervisor: {
    type: String,
    required: true,
    ref: 'Supervisor'
  },
  status: {
    type: String,
    enum: [
      'draft',
      'suggestion',
      'active',
      'archived',
      'assigned',
      'prev_term'
    ],
    default: 'active'
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  tags: {
    type: Array,
    required: true
  },
  additionalNotes: {
    type: String
  },
  targetCourses: {
    type: Array
  },
  type: {
    type: String,
    enum: ['regular', 'studentTopic'],
    default: 'regular',
    required: true
  },
  ownerType: {
    type: String,
    enum: ['supervisor', 'coordinator'],
    default: 'supervisor'
  }
})

module.exports = mongoose.model('Topic', topicSchema)
