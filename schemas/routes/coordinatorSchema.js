const yup = require('yup')

const removeCoordinatorSchema = yup.object({
  coordinatorId: yup.string().required('Must supply a coordinator id to remove')
})

const assignCoordinatorSchema = yup.object({
  coordinator: yup
    .string()
    .required('Must supply a coordinator email to assign')
})

module.exports = {
  removeCoordinatorSchema,
  assignCoordinatorSchema
}
