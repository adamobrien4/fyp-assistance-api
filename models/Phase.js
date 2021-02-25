const mongoose = require('mongoose')
const { Schema } = mongoose

// TODO: Check that start_date is before end_date on update

const phaseSchema = new Schema({
  _id: Number,
  start_date: {
    type: Date,
    required: true
  },
  end_date: {
    type: Date,
    required: true
  }
})

module.exports = mongoose.model('Phase', phaseSchema)
