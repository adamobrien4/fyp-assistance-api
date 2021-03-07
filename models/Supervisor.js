const mongoose = require('mongoose')
const { Schema } = mongoose

const supervisorSchema = new Schema({
  _id: String,
  email: {
    type: String,
    unique: true,
    require: true
  },
  firstName: String,
  lastName: String,
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

module.exports = mongoose.model('Supervisor', supervisorSchema)
