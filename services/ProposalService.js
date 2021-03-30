const { Proposal, CustomProposal } = require('../models/Proposal')
const Topic = require('../models/Topic')

const NotificationService = require('./NotificationService')

const getOwned = req => {
  return new Promise((resolve, reject) => {
    Proposal.find({ student: req.authInfo.oid })
      .populate('topic', 'title')
      .exec((err, docs) => {
        if (err) {
          return reject(new Error('could not retrieve proposals at this time'))
        }

        return resolve({ proposals: docs })
      })
  })
}

const get = req => {
  return new Promise((resolve, reject) => {
    // Get proposal for both custom and supervisor defined topics

    // If student is trying to view
    if (req.authInfo.roles.includes('Student')) {
      Proposal.findOne({
        _id: req.params.proposalId,
        student: req.authInfo.oid
      }).exec((err, proposal) => {
        if (err) {
          return reject(new Error('could not retrieve proposal'))
        }

        if (proposal) {
          console.log('Student viewing their own proposal')
          return resolve({ proposal: proposal })
        }

        return reject(new Error('Unauthorised'))
      })
    } else if (
      req.authInfo.roles.includes('Supervisor') ||
      req.authInfo.roles.includes('Coordinator')
    ) {
      Proposal.findOne({ _id: req.params.proposalId })
        .populate('topic', 'supervisor')
        .exec((err, proposal) => {
          if (err) {
            return reject(new Error('could not retrieve proposal'))
          }

          if (proposal?.topic?.supervisor === req.authInfo.oid) {
            return resolve({ proposal: proposal })
          } else {
            return reject(new Error('Unauthorised'))
          }
        })
    }
  })
}

const add = req => {
  return new Promise((resolve, reject) => {
    // Check that the user does not have a proposal sent for this topic already
    Proposal.findOne({
      student: req.authInfo.oid,
      topic: req.body.topic
    }).exec((err, doc) => {
      if (err) {
        return reject(new Error('could not retrieve topic'))
      }

      if (doc) {
        // Student already has a proposal sent for this topic
        return reject(new Error('existing_topic_proposal'))
      }

      Topic.findOne({ _id: req.body.topic }).exec((err, doc) => {
        if (err) {
          return reject(new Error('could not retrieve topic'))
        }

        if (doc === null) {
          return reject(
            new Error('related topic id could not be linked to existing topic')
          )
        }

        let topicData = {
          title: req.body.title,
          description: req.body.description,
          additionalNotes: req.body.additionalNotes,
          chooseMessage: req.body.chooseMessage,
          student: req.authInfo.oid,
          topic: req.body.topic,
          type: doc.type === 'regular' ? 'supervisorDefined' : 'studentDefined',
          status: req.body.saveAsDraft ? 'draft' : 'submitted'
        }

        if (req.body.isCustomProposal) {
          let prev = { ...topicData }
          topicData = {
            ...prev,
            environment: req.body.environment,
            languages: req.body.languages
          }
        }

        let proposal = null

        if (req.body?.isCustomProposal) {
          proposal = new CustomProposal(topicData)
        } else {
          proposal = new Proposal(topicData)
        }

        proposal.save(async (err, _) => {
          if (err) {
            console.log(err)
            return reject(new Error('could not add proposal'))
          }

          console.log(doc)

          await NotificationService.add({
            user: doc.supervisor,
            title: 'New student topic proposal recieved',
            path: '/topics/manage'
          })

          return resolve('Proposal added')
        })
      })
    })
  })
}

const edit = req => {
  return new Promise((resolve, reject) => {
    let docStatus = ''

    // Check that the requesting user owns the proposal they are trying to edit
    Proposal.findOne({
      _id: req.params.id,
      student: req.authInfo.oid,
      $or: [{ status: 'draft' }, { status: 'pending_edits' }]
    }).exec((err, doc) => {
      if (err) {
        return reject(new Error('could not retrieve proposal at this time'))
      }

      if (!doc) {
        return reject(new Error('invalid proposal id'))
      }

      if (doc) {
        docStatus = doc.status
        Proposal.updateOne(
          {
            _id: req.params.id,
            student: req.authInfo.oid
          },
          { $set: req.body }
        ).exec(async (err, _) => {
          if (err) {
            return reject(new Error('could not update proposal'))
          }

          console.log(docStatus)

          if (docStatus === 'pending_edits') {
            console.log('adding notification')
            // Create new notification for supervisor
            let topic = await Topic.findOne({ _id: doc.topic }).exec()
            await NotificationService.add({
              user: topic.supervisor,
              title: 'Student updated their proposal',
              path: '/topics/manage'
            })
          }

          return resolve('proposal updated')
        })
      } else {
        return reject(new Error('your requested proposal could not be found'))
      }
    })
  })
}

const upgrade = req => {
  return new Promise((resolve, reject) => {
    Proposal.findOne({ _id: req.params.id }).exec((err, doc) => {
      if (err) {
        return reject(new Error('could not retrieve proposal'))
      }

      if (doc) {
        switch (doc.status) {
          case 'draft':
            doc.status = 'submitted'
            // TODO: Create notification for supervisor
            break
          case 'pending_edits':
            doc.status = 'submitted'
            // TODO: Create notification for supervisor
            break
          default:
            return reject(new Error('cannot take next step for this proposal'))
        }

        try {
          doc.save()
        } catch (err) {
          return reject(new Error('could not update proposal'))
        }
        return resolve('proposal updated')
      }

      return reject(new Error('could not find proposal'))
    })
  })
}

const downgrade = req => {
  return new Promise((resolve, reject) => {
    Proposal.findOne({ _id: req.params.id, status: 'submitted' }).exec(
      (err, doc) => {
        if (err) {
          return reject(new Error('could not retrieve proposal'))
        }

        if (doc) {
          doc.status = 'draft'
          try {
            doc.save()
          } catch (err) {
            return reject(new Error('could not update proposal'))
          }
          return resolve('proposal updated')
        }

        return reject(new Error('could not find proposal'))
      }
    )
  })
}

const respond = req => {
  return new Promise((resolve, reject) => {
    Proposal.findOne({
      _id: req.params.id,
      status: 'submitted'
    })
      .populate('topic')
      .exec((err, proposalDoc) => {
        if (err) {
          return reject(new Error('could not retrieve proposal'))
        }

        if (proposalDoc) {
          if (proposalDoc.topic.supervisor !== req.authInfo.oid) {
            // TODO: Return error 403
            return reject(new Error('Unauthorised'))
          }

          proposalDoc.status = req.body.responseType
          proposalDoc.supervisorMessage = req.body.message

          proposalDoc.save(async (err, _) => {
            if (err) {
              console.error(err)
              return reject(new Error('could not update proposal status'))
            }

            // Inform student about proposal feedback
            await NotificationService.add({
              user: proposalDoc.student,
              title: 'Proposal Feedback Recieved!',
              path: '/proposals'
            })

            if (
              proposalDoc.topic.type === 'regular' &&
              req.body.responseType === 'accepted'
            ) {
              Topic.findOne({ _id: proposalDoc.topic._id }).exec(
                (err, topic) => {
                  if (err) {
                    return reject(new Error('could not retrieve topic'))
                  }
                  topic.status = 'assigned'
                  try {
                    topic.save(() => {
                      return resolve('update success')
                    })
                  } catch (e) {
                    console.log(e)
                    return reject(new Error('could not update topic'))
                  }
                }
              )
            } else {
              return resolve('update success')
            }
          })
        } else {
          return reject(new Error('could not find proposal'))
        }
      })
  })
}

module.exports = {
  getOwned,
  get,
  add,
  edit,
  upgrade,
  downgrade,
  respond
}
