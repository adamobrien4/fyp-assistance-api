const express = require('express')
const passport = require('passport')
const axios = require('axios')

const config = require('./config/config')

const studentRouter = require('./routes/students')
const supervisorRouter = require('./routes/supervisors')
const coordinatorRouter = require('./routes/coordinators')

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

var bearerStrategy = new BearerStrategy(options, function (token, done) {
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

app.get('/', (req, res) => {
  res.json('Home')
})

app.get(
  '/protected',
  passport.authenticate('oauth-bearer', { session: false }),
  (req, res) => {
    console.log(req.authInfo)
    var claims = req.authInfo.scp.split(' ')
    var roles = req.authInfo.roles
    console.log(claims)
    console.log(roles)

    if (claims.includes('Suggestions.Read.All')) {
      res.json({ protectedData: 12332 })
    } else {
      res.json({ 'auth-error': 'not authenticated to view this resource' })
    }

    // console.log('User Info: ', req.user)
    // console.log('Validated Claims: ', claims)
  }
)

module.exports = app
