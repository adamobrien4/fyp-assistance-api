const yup = require('yup')

const editPhaseSchema = yup.object({
  phases: yup
    .array(
      yup.object({
        phase: yup.number().required('Must supply the phase number'),
        date: yup
          .date('phase.date must be a valid date')
          .required('Must supply a date')
      })
    )
    .required('Must supply phase details')
    .length(4)
})

module.exports = {
  editPhaseSchema
}
