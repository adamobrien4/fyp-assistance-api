const yup = require('yup')

const searchTopicSchema = yup.object({
  tags: yup.array().required().min(1)
})

module.exports = {
  searchTopicSchema
}
