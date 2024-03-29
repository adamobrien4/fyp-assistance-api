const router = require('express').Router()
const passport = require('passport')

const NotificationService = require('../services/NotificationService')

const validateResourceMW = require('../middleware/validateResource')
const schema = require('../schemas/routes/notificationSchema')

// GET: Retrieve all unread notifications for the requesting user
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

// POST: Mark Notification as Read
router.post(
  '/read',
  passport.authenticate('oauth-bearer', { session: false }),
  validateResourceMW(schema.markAsRead),
  (req, res) => {
    NotificationService.markAsRead(req.body.id)
      .then(notifications => {
        return res.json({ notifications: notifications })
      })
      .catch(err => {
        return res.status(500).json(err.message)
      })
  }
)

module.exports = router
