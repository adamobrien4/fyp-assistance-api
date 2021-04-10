const mongoose = require('mongoose')
const { Schema } = mongoose

const notificationSchema = new Schema({
  created_at: {
    type: Date,
    default: Date.now
  },
  title: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  read_at: {
    type: Date,
    nullable: true.valueOf,
    default: null
  },
  user: {
    type: String,
    required: true
  }
})

module.exports = mongoose.model('Notification', notificationSchema)
