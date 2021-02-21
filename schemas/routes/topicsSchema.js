const yup = require('yup')

const searchTopicSchema = yup.object({
  tags: yup.array(yup.string()).nullable(),
  // TODO: Add matches for GUID format on supervisor field
  supervisor: yup.string().nullable()
})

module.exports = {
  searchTopicSchema
}
