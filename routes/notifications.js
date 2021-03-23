const router = require('express').Router()
const passport = require('passport')

const NotificationService = require('../services/NotificationService')

/**
 * @swagger
 *  /notifications:
 *    get:
 *      summary: Retrieve all unread notifications for the requesting user
 *      tags:
 *        - Notification
 */
router.get(
  '/',
  passport.authenticate('oauth-bearer', { session: false }),
  (req, res) => {
    console.log(req.authInfo.oid)
    NotificationService.findUnread({
      user: req.authInfo.oid
    })
      .then(notifications => {
        return res.json({ notifications: notifications })
      })
      .catch(err => {
        return res.status(500).json(err.message)
      })
  }
)

module.exports = router
