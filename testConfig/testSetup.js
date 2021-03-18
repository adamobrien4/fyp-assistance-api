/* eslint-disable no-undef */
const mongoose = require('mongoose')
mongoose.set('useCreateIndex', true)
mongoose.promise = global.Promise

const url = `mongodb://127.0.0.1/${process.env.NODE_ENV}`

// module.exports = async () => {

// }

mongoose.connect(url, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: true
})

// // Cleans up database between each test
// afterEach(async () => {
//   await removeAllCollections()
// })

// // Disconnect Mongoose
// afterAll(async () => {
//   await dropAllCollections()
//   await mongoose.connection.close()
// })
