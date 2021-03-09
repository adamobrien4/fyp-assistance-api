const env = process.env.NODE_ENV

const azureConfig = {
  tenantID: process.env.AZURE_TENANT_ID,
  clientID: process.env.AZURE_CLIENT_ID,
  audience: process.env.AZURE_AUDIENCE,
  clientSecret: process.env.AZURE_CLIENT_SECRET,
  applicationResourceId: process.env.AZURE_APPLICATION_RESOURCE_ID,
  metadata: {
    authority: process.env.AZURE_METADATA_AUTHORITY,
    issuer: process.env.AZURE_METADATA_ISSUER,
    discovery: process.env.AZURE_METADATA_DISCOVERY,
    version: process.env.AZURE_METADATA_VERSION
  },
  settings: {
    validateIssuer: process.env.AZURE_SETTINGS_VALIDATE_ISSUER === 'true',
    passReqToCallback: process.env.AZURE_SETTINGS_PASSREQTOCALLBACK === 'true'
  },
  appRoles: {
    administrator: process.env.ADMIN_APP_ROLE_ID,
    student: process.env.STUDENT_APP_ROLE_ID,
    supervisor: process.env.SUPERVISOR_APP_ROLE_ID,
    coordinator: process.env.COORDINATOR_APP_ROLE_ID
  }
}

const dev = {
  app: {
    port: parseInt(process.env.APP_DEV_PORT)
  },
  db: {
    url: process.env.MONGO_DEV_URL
  },
  azure: azureConfig
}

const test = {
  app: {
    port: parseInt(process.env.APP_TEST_PORT)
  },
  db: {
    url: process.env.MONGO_DEV_URL
  },
  azure: azureConfig
}

const config = {
  dev,
  test
}

module.exports = config[env.trim()]
