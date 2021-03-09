const Notification = require('../models/Notification')

const add = (userId, title, path) => {
  return new Promise((resolve, reject) => {
    new Notification({
      user: userId,
      title,
      path
    }).save((err, notification) => {
      if (err) {
        return reject(err)
      }

      return resolve()
    })
  })
}

module.exports = {
  add
}
