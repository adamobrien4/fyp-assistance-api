const router = require('express').Router()
const passport = require('passport')

const treeData = require('../utils/tagsTree')

router.get(
  '/',
  //passport.authenticate('oauth-bearer', { session: false }),
  async (req, res) => {
    return res.json(treeData)
  }
)

module.exports = router
