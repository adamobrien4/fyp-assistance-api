const yup = require('yup')

const markAsRead = yup.object({
  id: yup.string().required('Must supply a notification id to mark as read')
})

module.exports = {
  markAsRead
}
