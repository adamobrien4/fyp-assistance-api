const yup = require('yup')

const editProposalSchema = yup.object({
  title: yup.string(),
  description: yup.string(),
  chooseMessage: yup.string(),
  additionalNotes: yup.string(),
  environment: yup.string(),
  languages: yup.string()
})

module.exports = {
  editProposalSchema
}
