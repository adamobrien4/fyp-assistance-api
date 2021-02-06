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
  // abbr: The supervisors abbreviation Annette McElligott = AMg
  abbr: {
    type: String,
    unique: true,
    required: true
  },
  appRoleAssignmentId: {
    type: String,
    unqiue: true,
    required: true
  },
  superviseStudentTopics: {
    type: Boolean,
    default: false
  }
})

module.exports = mongoose.model('Supervisor', supervisorSchema)
