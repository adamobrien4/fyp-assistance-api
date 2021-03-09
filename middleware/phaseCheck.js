const Phase = require('../models/Phase')

const checkPhase = allowedPhase => async (req, res, next, testPhaseDoc) => {
  if (allowedPhase === null) {
    next()
  }

  try {
    let phaseDoc
    if (process.env.NODE_ENV !== 'test') {
      phaseDoc = await Phase.findOne({
        start_time: { $lte: new Date() },
        end_time: { $gte: new Date() }
      }).exec()
    } else {
      phaseDoc = testPhaseDoc
    }

    if (phaseDoc === null) {
      return res.status(500).json('could not retrieve phase')
    }

    if (typeof allowedPhase === 'number' && allowedPhase !== phaseDoc.phase) {
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
      startDate: phaseDoc.start_time,
      endDate: phaseDoc.end_time
    }
    return next()
  } catch (err) {
    return res.status(500).json('could not retrieve phase')
  }
}

module.exports = checkPhase
