const yup = require('yup')
const ObjectId = require('mongoose').Types.ObjectId

yup.addMethod(yup.string, 'objectId', function (errorMessage) {
  return this.test('test-is-mongo-object-id', errorMessage, function (value) {
    const { path, createError } = this

    return (
      ObjectId.isValid(value) || createError({ path, message: errorMessage })
    )
  })
})

const addProposalSchema = yup.object({
  isCustomProposal: yup.boolean(),
  title: yup.string().required('Proposal must include a title'),
  description: yup.string().required('Proposal must include a description'),
  additionalNotes: yup.string(),
  chooseMessage: yup.string(),
  topic: yup
    .string()
    .objectId('Topic ID is not valid')
    .required('Proposal must specify a topic ID'),
  saveAsDraft: yup.boolean(),
  environment: yup.string().when('isCustomProposal', {
    is: true,
    then: yup.string().required('Proposal must specify an environment')
  }),
  languages: yup.string().when('isCustomProposal', {
    is: true,
    then: yup.string().required('Proposal must specify languages')
  })
})

const editProposalSchema = yup.object({
  title: yup.string().required('Proposal must include a title'),
  description: yup.string().required('Proposal must include a description'),
  chooseMessage: yup.string(),
  additionalNotes: yup.string(),
  environment: yup.string(),
  languages: yup.string()
})

const proposalResponseSchema = yup.object({
  responseType: yup
    .string()
    .oneOf(
      ['request_edits', 'accept', 'decline'],
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
