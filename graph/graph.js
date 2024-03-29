const axios = require('axios')
const config = require('../config/config')

const getAccessTokenOnBehalfOf = (accessToken, scopes, callback) => {
  let bodyString = `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&client_id=${config.azure.clientID}&client_secret=${config.azure.clientSecret}&assertion=${accessToken}&scope=${scopes}&requested_token_use=on_behalf_of`

  return new Promise((resolve, reject) => {
    axios
      .post(
        `https://login.microsoftonline.com/${config.azure.tenantID}/oauth2/v2.0/token`,
        bodyString,
        {}
      )
      .then(response => {
        // console.log(response.data.access_token);
        resolve(response.data.access_token)
      })
      .catch(err => {
        reject(err)
        console.log(err.response)
      })
  })
}

module.exports = getAccessTokenOnBehalfOf
