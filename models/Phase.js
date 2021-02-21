const mongoose = require('mongoose')
const { Schema } = mongoose

const phaseSchema = new Schema({
  phase: Number,
  active: Boolean,
  start: Date,
  end: Date
})

module.exports = mongoose.model('Phase', phaseSchema)
