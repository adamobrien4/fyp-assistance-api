const Phase = require('../models/Phase')

const checkPhase = allowedPhase => async (req, res, next) => {
  try {
    let phaseDoc = await Phase.findOne({
      start_time: { $lte: new Date() },
      end_time: { $gte: new Date() }
    }).exec()

    if (phaseDoc === null) {
      return res.status(500).json('could not retrieve phase')
    }

    if (typeof allowedPhase === 'string' && allowedPhase !== phaseDoc.phase) {
      return res
        .status(400)
        .json('action cannot be carried out during current phase')
    } else if (
      Array.isArray(allowedPhase) &&
      !allowedPhase.includes(phaseDoc.phase)
    ) {
      return res
        .status(400)
        .json('action cannot be carried out during current phase')
    }

    req.phase = {
      phase: phaseDoc.phase,
      startDate: phaseDoc.start_date,
      endDate: phaseDoc.end_date
    }
    next()
  } catch (err) {
    console.error(err)
    return res.status(500).json('could not retrieve phase')
  }
}

module.exports = checkPhase
