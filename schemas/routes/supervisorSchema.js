const yup = require('yup')

const editSupervisorSchema = yup.object({
  abbr: yup.string(),
  superviseStudentTopics: yup.boolean()
})

const studentProjectAvailibilitySchema = yup.object({
  active: yup
    .boolean()
    .required('Supervisor availibility status must be supplied')
})

module.exports = {
  editSupervisorSchema,
  studentProjectAvailibilitySchema
}
