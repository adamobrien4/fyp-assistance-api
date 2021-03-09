const mongoose = require('mongoose')
const { Schema } = mongoose

const coordinatorSchema = new Schema({
  _id: String,
  email: {
    type: String,
    unique: true,
    required: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  displayName: {
    type: String,
    required: true
  },
  appRoleAssignmentId: {
    type: String,
    unqiue: true,
    required: true
  }
})

module.exports = mongoose.model('Coordinator', coordinatorSchema)
