require('dotenv').config()
const mongoose = require('mongoose')
const config = require('./config/config')

mongoose.connect(config.db.url, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true
})

const db = mongoose.connection
db.on('error', console.error.bind(console, 'connection error:'))
db.once('open', () => {
  console.log('Connected to mongoDB')
})

const app = require('./app')

const port = process.env.PORT || 5000

app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
