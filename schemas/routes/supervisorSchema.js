const yup = require('yup')

const assignSupervisorSchema = yup.object({
  supervisors: yup
    .array(
      yup.object({
        email: yup
          .string()
          .required('Each to be assigned supervisor must have a supplied email')
      })
    )
    .required('Must supply list of superviors to be assigned')
})

const editSupervisorSchema = yup.object({
  abbr: yup.string(),
  firstName: yup.string(),
  lastName: yup.string(),
  displayName: yup.string()
})

const studentProjectAvailibilitySchema = yup.object({
  active: yup
    .boolean()
    .required('Supervisor availibility status must be supplied')
})

const deleteSupervisorSchema = yup.object({
  supervisorId: yup
    .string()
    .required('Must supply the id of the supervisor being removed')
})

module.exports = {
  assignSupervisorSchema,
  editSupervisorSchema,
  studentProjectAvailibilitySchema,
  deleteSupervisorSchema
}
