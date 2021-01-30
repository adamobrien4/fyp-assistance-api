const express = require('express')
const passport = require('passport')
const axios = require('axios')

const config = require('./config/config')

const studentRouter = require('./routes/students')
const supervisorRouter = require('./routes/supervisors')
const coordinatorRouter = require('./routes/coordinators')
const topicRouter = require('./routes/topic')
const tagRouter = require('./routes/tags')
const proposalRouter = require('./routes/proposals')

axios.interceptors.request.use(request => {
  // console.log('Starting Request', JSON.stringify(request, null, 2))
  return request
})

const BearerStrategy = require('passport-azure-ad').BearerStrategy

const options = {
  identityMetadata: `https://${config.azure.metadata.authority}/${config.azure.tenantID}/${config.azure.metadata.version}/${config.azure.metadata.discovery}`,
  issuer: `https://${config.azure.metadata.issuer}/${config.azure.tenantID}/`,
  clientID: config.azure.clientID,
  audience: config.azure.audience,
  validateIssuer: config.azure.settings.validateIssuer,
  passReqToCallback: config.azure.settings.passReqToCallback,
  loggingNoPII: false
}

let bearerStrategy = new BearerStrategy(options, function (token, done) {
  done(null, {}, token)
})

let app = express()
app.use(express.json())
app.use(passport.initialize())
passport.use(bearerStrategy)

// Enable CORS for * because this is a demo project
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header(
    'Access-Control-Allow-Headers',
    'Authorization, Origin, X-Requested-With, Content-Type, Accept'
  )
  next()
})

app.use('/student', studentRouter)
app.use('/supervisor', supervisorRouter)
app.use('/coordinator', coordinatorRouter)
app.use('/topic', topicRouter)
app.use('/tag', tagRouter)
app.use('/proposal', proposalRouter)

module.exports = app
