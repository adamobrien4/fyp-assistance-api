const yup = require('yup')

const addTopicSchema = yup.object({
  title: yup.string().required('Topic must include a title'),
  description: yup.string().required('Topic must include a description'),
  tags: yup
    .array(yup.string())
    .min(1, 'Topic must have at least one associated tag'),
  additionalNotes: yup.string(),
  chooseMessage: yup.string(),
  targetCourses: yup.array(yup.string()),
  environment: yup.string(),
  languages: yup.string(),
  ownerType: yup
    .string()
    .oneOf(['supervisor', 'coordinator'], 'ownerType is invalid')
})

const searchTopicSchema = yup.object({
  tags: yup.array(yup.string()).nullable(),
  // TODO: Add matches for GUID format on supervisor field
  supervisor: yup.string().nullable(),
  topicType: yup.string().oneOf(['all', 'regular', 'studentTopic']).nullable()
})

module.exports = {
  addTopicSchema,
  searchTopicSchema
}
