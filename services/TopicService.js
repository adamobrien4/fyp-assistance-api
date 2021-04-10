const { Proposal } = require('../models/Proposal')
const Topic = require('../models/Topic')
const Tag = require('../models/Tag')

const ObjectId = require('mongoose').Types.ObjectId

const getOwned = supervisorId =>
  new Promise((resolve, reject) => {
    Topic.find({ supervisor: supervisorId })
      .select('-supervisor -__v')
      .exec(async (err, docs) => {
        if (err) {
          reject(new Error('could not retrieve proposals'))
        }

        if (docs) {
          let topicIds = docs.map(d => d._id)

          let proposalInfo = await Proposal.aggregate([
            {
              $match: { topic: { $in: [...topicIds] }, status: 'submitted' }
            },
            {
              $group: { _id: '$topic', count: { $sum: 1 } }
            }
          ])

          let countInfo = {}

          proposalInfo.forEach(el => (countInfo[el._id] = { count: el.count }))

          let result = docs.map(t => ({
            ...t._doc,
            proposalCount: countInfo[t._id]?.count ? countInfo[t._id]?.count : 0
          }))

          docs = result
        }

        return resolve({ topics: docs })
      })
  })

const get = (topicId, authInfo) =>
  new Promise((resolve, reject) => {
    Topic.findOne({ _id: topicId }).exec(async (err, doc) => {
      if (err) {
        return reject(new Error('could not retrieve topic at this time'))
      }

      if (doc) {
        if (doc.ownerType === 'supervisor') {
          doc = await Topic.populate(doc, {
            path: 'supervisor',
            model: 'Supervisor'
          })
        } else {
          doc = await Topic.populate(doc, {
            path: 'supervisor',
            model: 'Coordinator'
          })
        }
      }

      if (authInfo.roles.includes('Student')) {
        // Check if student has created proposal for this topic or not already
        let hasProposal = await Proposal.findOne({
          topic: doc._id,
          student: authInfo.oid
        })
          .select('_id')
          .exec()

        if (hasProposal) {
          doc._doc.hasProposal = true
        }
      }
      return resolve({ topic: doc })
    })
  })

const getTopicProposals = topicId =>
  new Promise((resolve, reject) => {
    Proposal.find({
      topic: ObjectId(topicId),
      status: { $in: ['submitted', 'accepted'] }
    })
      .select({ student: 1, _id: 1, title: 1, status: 1 })
      .populate('student', 'displayName')
      .exec((err, docs) => {
        if (err) {
          return reject(new Error('could not retrieve topic proposals'))
        }

        return resolve({ proposals: docs })
      })
  })

const findMatchingTopics = (resolve, reject, query) => {
  Topic.find(query).exec(async (err, docs) => {
    if (err) {
      return reject(new Error('could not retrieve topics at this time'))
    }

    if (docs) {
      for (let i = 0; i < docs.length; i++) {
        if (docs[i].ownerType === 'supervisor') {
          docs[i] = await Topic.populate(docs[i], {
            path: 'supervisor',
            model: 'Supervisor'
          })
        } else {
          docs[i] = await Topic.populate(docs[i], {
            path: 'supervisor',
            model: 'Coordinator'
          })
        }
      }
      let topicIds = docs.map(d => d._id)

      Proposal.aggregate([
        {
          $match: { topic: { $in: [...topicIds] } }
        },
        {
          $group: { _id: '$topic', count: { $sum: 1 } }
        }
      ]).exec((err, proposalInfo) => {
        if (err) {
          return reject(new Error(err.message))
        }
        let countInfo = {}

        proposalInfo.forEach(el => (countInfo[el._id] = { count: el.count }))

        let result = docs.map(t => ({
          ...t._doc,
          proposalCount: countInfo[t._id]?.count ? countInfo[t._id]?.count : 0
        }))

        return resolve({ topics: result })
      })
    } else {
      return resolve({ topics: [] })
    }
  })
}

const search = req =>
  new Promise((resolve, reject) => {
    let query = { status: 'active' }

    // Check topicType
    switch (req.body?.topicType) {
      case 'regular':
      case 'studentTopic':
        query.type = req.body.topicType
        break
      default:
        break
    }

    // Check supervisor
    if (req.body?.supervisor) {
      query.supervisor = req.body.supervisor
    }

    // Check tags
    if (req.body?.tags) {
      let tagsQuery = req.body.tags.map(tag => {
        return { ancestors: tag }
      })

      Tag.find({ $or: [...tagsQuery] })
        .select('_id')
        .exec((err, tagDocs) => {
          if (err) {
            return reject(new Error('could not retrieve tags'))
          }

          let tags = [...tagDocs.map(tag => tag._id), ...req.body.tags]

          // Search topics related to related query tags
          query.$or = tags.map(tag => ({
            tags: tag
          }))

          findMatchingTopics(resolve, reject, query)
        })
    }

    findMatchingTopics(resolve, reject, query)
  })

const add = req =>
  new Promise((resolve, reject) => {
    let topicData = {
      title: req.body.title,
      description: req.body.description,
      tags: req.body.tags,
      status: 'active'
    }

    topicData.supervisor = req.authInfo.oid

    // Get type of user
    if (req.authInfo.roles.includes('Coordinator')) {
      topicData.ownerType = 'coordinator'
    }

    if (req.body?.additionalNotes) {
      topicData.additionalNotes = req.body.additionalNotes
    }

    if (req.body?.targetedCourses) {
      topicData.targetedCourses = req.body.targetedCourses
    }

    new Topic(topicData).save((err, _) => {
      if (err) {
        console.log(err)
        return reject(new Error('error saving to database'))
      }
      return resolve('success')
    })
  })

const edit = req =>
  new Promise((resolve, reject) => {
    Topic.findByIdAndUpdate(req.params.id, { $set: req.body }).exec(
      (err, doc) => {
        if (err) {
          return reject(new Error('could not update topic'))
        }
        console.log(doc)

        return resolve('topic updated')
      }
    )
  })

module.exports = {
  getOwned,
  get,
  getTopicProposals,
  search,
  edit,
  add
}
