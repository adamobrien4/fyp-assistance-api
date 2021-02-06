const mongoose = require('mongoose')
const { Schema } = mongoose
const Populate = require('./utils/autoPopulate')

const topicSchema = new Schema({
  supervisor: {
    type: String,
    required: true
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
  desiredSkills: {
    type: Array
  },
  targetedCourses: {
    type: Array
  },
  requirements: {
    type: Array
  }
})

topicSchema
  .pre('findOne', Populate('supervisor'))
  .pre('find', Populate('supervisor'))

module.exports = mongoose.model('Topic', topicSchema)
