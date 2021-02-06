const mongoose = require('mongoose')
const { Schema } = mongoose

const tagSchema = new Schema({
  _id: {
    type: String,
    required: true
  },
  ancestors: {
    type: Array,
    required: true,
    default: []
  },
  parent: {
    type: String,
    default: null
  }
})

module.exports = mongoose.model('Tag', tagSchema)
