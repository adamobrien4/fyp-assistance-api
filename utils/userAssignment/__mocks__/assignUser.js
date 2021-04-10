const setupHeader = accessToken => {
  return {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  }
}

const assignUser = (userType, authorizationHeader, users) => {
  users = users.map(user => {
    if (user.status === 'unknown') {
      return { ...user, status: 'assigned' }
    } else {
      return { ...user }
    }
  })

  return users
}

module.exports = {
  assignUser,
  setupHeader
}
