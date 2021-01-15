/* eslint-disable no-undef */
const passport = jest.genMockFromModule('passport')

passport.initialize = jest.fn(() => function (req, res, next) {
  next()
})

passport.authenticate = jest.fn(() => function (req, res, next) {
  next()
})

module.exports = passport
