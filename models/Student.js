const mongoose = require('mongoose')
const { Schema } = mongoose

const studentSchema = new Schema({
  studentId: {
    type: String,
    unqiue: true,
    required: true
  },
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

module.exports = mongoose.model('student', studentSchema)
