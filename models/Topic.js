const mongoose = require('mongoose')
const { Schema } = mongoose

const topicSchema = new Schema({
  supervisor: {
    type: Schema.Types.ObjectId,
    required: true
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

module.exports = mongoose.model('topic', topicSchema)
