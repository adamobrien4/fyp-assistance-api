const Notification = require('../models/Notification')

const add = data => {
  return new Promise((resolve, reject) => {
    new Notification({
      user: data.user,
      title: data.title,
      path: data.path
    }).save((err, notification) => {
      if (err) {
        // console.error(err)
        return reject(err)
      }

      return resolve(notification)
    })
  })
}

const find = query => {
  return new Promise((resolve, reject) => {
    Notification.find(query).exec((err, notifications) => {
      if (err) {
        console.error(err)
        return reject(err)
      }

      return resolve(notifications)
    })
  })
}

const findUnread = query => {
  return new Promise((resolve, reject) => {
    Notification.find({ ...query, read: false })
      .sort('created_at')
      .exec((err, notifications) => {
        if (err) {
          console.error(err)
          return reject(err)
        }

        return resolve(notifications)
      })
  })
}

const findOne = query => {
  return new Promise((resolve, reject) => {
    console.log('Querying:', query)
    Notification.findOne(query).exec((err, notification) => {
      if (err) {
        console.error(err)
        return reject(err)
      }

      return resolve(notification)
    })
  })
}

const markAsRead = notiId => {
  return new Promise((resolve, reject) => {
    Notification.updateOne(
      { read: false, _id: notiId },
      { read: true, read_at: Date.now() }
    ).exec((err, _) => {
      if (err) {
        return reject(new Error('Could not mark notification as read'))
      }

      return resolve('Notification Updated')
    })
  })
}

module.exports = {
  add,
  find,
  findUnread,
  findOne,
  markAsRead
}
