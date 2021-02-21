const pick = require('lodash/pick')

const validateResourceMW = resourceSchema => async (req, res, next) => {
  const resource = req.body
  try {
    await resourceSchema.validate(resource)

    // Remove any fields which are not specified in the resource schema
    req.body = pick(req.body, resourceSchema._nodes)

    next()
  } catch (e) {
    res.status(400).json({ error: e.errors.join(', ') })
  }
}

module.exports = validateResourceMW
