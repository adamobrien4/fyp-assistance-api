const Phase = require('../models/Phase')

const getCurrentPhase = () => {
  return new Promise((resolve, reject) => {
    Phase.findOne({
      start_date: { $lte: new Date() },
      end_date: { $gte: new Date() }
    })
      .select('start_date end_date')
      .exec((err, doc) => {
        if (err) {
          return reject(new Error('could not find phase'))
        }

        return resolve({ phase: doc })
      })
  })
}

const getAll = () => {
  return new Promise((resolve, reject) => {
    Phase.find({})
      .sort('_id')
      .exec((err, docs) => {
        if (err) {
          return reject(new Error('could not retrieve phases'))
        }

        return resolve({ phases: docs })
      })
  })
}

const edit = req => {
  return new Promise((resolve, reject) => {
    let query = []

    // Check that each phase's date follows the previous
    for (var i = 0; i < req.body.phases.length; i++) {
      let p = req.body.phases[i]
      if (
        i < req.body.phases.length - 1 &&
        p.date > req.body.phases[i + 1].date
      ) {
        return reject(
          new Error(
            `Phase ${p.phase}'s start date must be before Phase ${
              p.phase + 1
            }'s start date`
          )
        )
      }

      // Prepare the query to insert to DB
      query.push({
        phase: p.phase,
        start_date: p.date,
        end_date:
          p.phase === req.body.phases.length
            ? new Date(p.date).getTime() + 1000 * 60 * 60 * 24 * 365
            : new Date(req.body.phases[i + 1].date).getTime() - 1000 * 60 * 5
      })
    }

    for (var phase of query) {
      Phase.updateOne(
        { _id: phase.phase },
        { start_date: phase.start_date, end_date: phase.end_date }
      )
        .exec()
        .then(() => {})
        .catch(err => {
          console.log(err)
          return reject(new Error('could not update phase'))
        })
    }

    return resolve('phases updated')
  })
}

module.exports = {
  getCurrentPhase,
  getAll,
  edit
}
