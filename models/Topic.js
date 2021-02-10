const mongoose = require('mongoose')
const { Schema } = mongoose

const topicSchema = new Schema({
  supervisor: {
    type: String,
    required: true,
    ref: 'Supervisor'
  },
  code: {
    type: String,
    required: true,
    default: '<unset>'
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
    default: 'draft'
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
  }
})

module.exports = mongoose.model('Topic', topicSchema)
