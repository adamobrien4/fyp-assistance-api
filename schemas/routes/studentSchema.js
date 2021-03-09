const yup = require('yup')

const assignStudentSchema = yup.object({
  students: yup
    .array(
      yup.object({
        email: yup
          .string()
          .required('Each to be assigned student must have a supplied email')
      })
    )
    .required('Must supply list of students to be assigned')
})

const deleteStudentSchema = yup.object({
  studentId: yup
    .string()
    .trim()
    .matches(/^[{]?[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}[}]?$/)
    .required()
})

module.exports = {
  assignStudentSchema,
  deleteStudentSchema
}
