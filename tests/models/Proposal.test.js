const mongoose = require('mongoose')

const { SupervisorProposal } = require('../../models/Proposal')
const Topic = require('../../models/Topic')

// TODO: Find out how to initialise the test DB before when running individual test files
// DB setup is ran in the app.test.js file currently
const { setupDB } = require('../../testConfig/testSetup')
setupDB('test')

describe('Proposal Model test', () => {
  describe('SupervisorProposal', () => {
    it('should auto-populate the Topic field', async () => {
      const topicData = {
        supervisor: mongoose.Types.ObjectId(),
        code: 'ABC123',
        status: 'active',
        title: 'Test Topic',
        description: 'Test Description',
        tags: ['TestTag1', 'TestTag2']
      }

      // Insert new Topic
      const topic = await new Topic(topicData).save()

      // Insert linked Proposal
      await new SupervisorProposal({
        title: 'Test Proposal',
        description: 'Test Description',
        student: '123-123-123',
        topic: topic._id
      }).save()

      const proposal = await SupervisorProposal.findOne()

      expect(proposal.topic.title).toBe(topicData.title)
      expect(proposal.topic.description).toBe(topicData.description)
      // TODO: Populate the supervisor field of the populated topic field
      // expect(proposal.topic.supervisor.toString()).toBe(
      //   topicData.supervisor.toString()
      // )
    })
  })
})
