const permit = appRole => {
  return (req, res, next) => {
    const { authInfo } = req

    // Skip this middleware if we are in test environment
    if (process.env.NODE_ENV === 'test') {
      return next()
    }

    if (!authInfo?.roles || authInfo?.roles?.length === 0) {
      return res.status(403).json('user role not found')
    }

    if (Array.isArray(appRole)) {
      const found = authInfo.roles.some(r => appRole.includes(r))
      if (found) {
        return next()
      }
    }

    if (typeof appRole === 'string') {
      if (authInfo.roles.includes(appRole)) {
        return next()
      }
    }

    res.status(403).json('user is not authorized to view this resource')
  }
}

module.exports = permit
