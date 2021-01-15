const mongoose = require('mongoose')
const { Schema } = mongoose

const coordinatorSchema = new Schema({
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
  azureId: {
    type: String,
    unique: true,
    required: true
  },
  appRoleAssignmentId: {
    type: String,
    unqiue: true,
    required: true
  }
})

module.exports = mongoose.model('coordinator', coordinatorSchema)
