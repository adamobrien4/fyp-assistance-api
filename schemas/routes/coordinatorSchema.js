// TODO: Make Schema for coordinators endpoiutn

const yup = require('yup')

const addProposalSchema = yup.object({
  isCustomProposal: yup.boolean()
})

const editProposalSchema = yup.object({
  title: yup.string(),
  description: yup.string(),
  chooseMessage: yup.string(),
  additionalNotes: yup.string(),
  environment: yup.string(),
  languages: yup.string()
})

const proposalResponseSchema = yup.object({
  responseType: yup
    .string()
    .oneOf(
      ['pending_edits', 'accepted', 'rejected'],
      'Response type does not match available options'
    )
    .required('Response type is required'),
  message: yup.string()
})

module.exports = {
  addProposalSchema,
  editProposalSchema,
  proposalResponseSchema
}
