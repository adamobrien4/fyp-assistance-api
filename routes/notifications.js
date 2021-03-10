const router = require('express').Router()
const passport = require('passport')

const NotificationService = require('../services/NotificationService')

const Notification = require('../models/Notification')

/**
 * @swagger
 *  /notifications:
 *    get:
 *      summary: Retrieve all notifications for the requesting user
 */
router.get(
  '/',
  passport.authenticate('oauth-bearer', { session: false }),
  (req, res) => {
    console.log(req.authInfo.oid)
    Notification.find({
      user: req.authInfo.oid,
      read: false
    })
      .sort('created_at')
      .exec((err, docs) => {
        if (err) {
          return res.status(500).json('could not retrieve notifications')
        }

        return res.json({ notifications: docs })
      })
  }
)

router.get('/add', (req, res) => {
  NotificationService.add(
    '84cae2f1-651b-43d1-8056-470f590b1d9b',
    'Sample Title',
    '/sample'
  )
    .then(() => {
      return res.json('Done')
    })
    .catch(err => {
      console.log(err)
    })
})

module.exports = router
