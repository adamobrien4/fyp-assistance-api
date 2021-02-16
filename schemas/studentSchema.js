const yup = require('yup')

const deleteStudentSchema = yup.object({
  studentId: yup
    .string()
    .trim()
    .matches(/^[{]?[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}[}]?$/)
    .required()
})

module.exports = {
  deleteStudentSchema
}
