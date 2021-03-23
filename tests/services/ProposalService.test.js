/* eslint-disable no-undef */
const MUUID = require('uuid-mongodb')
const ObjectId = require('mongoose').Types.ObjectId

const Student = require('../../models/Student')
const Supervisor = require('../../models/Supervisor')
const Topic = require('../../models/Topic')
const Notification = require('../../models/Notification')
const { Proposal } = require('../../models/Proposal')

const ProposalService = require('../../services/ProposalService')

const { removeAllCollections } = require('../../testConfig/helperFunctions')

// const { setupDB } = require('../../testConfig/testSetup')
// setupDB('test')

describe('Proposal Service', () => {
  afterEach(async () => {
    await removeAllCollections()
  })

  const student = {
    _id: MUUID.v4().toString(),
    studentId: '11223344',
    email: '11223344@studentmail.ul.ie',
    firstName: 'Adam',
    lastName: 'OBrien',
    displayName: 'Adam OBrien',
    appRoleAssignmentId: 'a5s7d3j4m7n3b5n7k85nh54'
  }

  const supervisorObjs = [
    {
      _id: MUUID.v4().toString(),
      email: 'supervisor1@email.com',
      firstName: 'First',
      lastName: 'Last',
      displayName: 'First Last',
      appRoleAssignmentId: '123asdqwe456'
    }
  ]

  // TODO: Add topics
  const topicObjs = [
    {
      _id: new ObjectId(),
      supervisor: supervisorObjs[0]._id,
      status: 'active',
      title: 'Example Title',
      description: 'Example Description',
      tags: ['tag1'],
      additionalNotes: '',
      targetCourses: [],
      type: 'regular',
      ownerType: 'supervisor'
    }
  ]

  const spvrProposals = [
    {
      _id: new ObjectId(),
      title: 'Proposal One',
      description: 'Proposal Description',
      additionalNotes: 'Some Additional Notes',
      chooseMessage: 'Choose Proposal Message',
      student: student._id,
      status: 'submitted',
      topic: topicObjs[0]._id,
      supervisorMessage: ''
    },
    {
      _id: new ObjectId(),
      title: 'Proposal Two',
      description: 'Proposal Description',
      additionalNotes: 'Some Additional Notes',
      chooseMessage: 'Choose Proposal Message',
      student: student._id,
      status: 'draft',
      topic: new ObjectId(),
      supervisorMessage: ''
    }
  ]

  const stdtProposals = [
    {
      _id: new ObjectId(),
      title: 'Proposal One',
      description: 'Proposal Description',
      additionalNotes: 'Some Additional Notes',
      chooseMessage: 'Choose Proposal Message',
      student: student._id,
      status: 'submitted',
      topic: new ObjectId(),
      supervisorMessage: '',
      type: 'supervisorDefined',
      environment: 'Windows',
      languages: 'JavaScript'
    }
  ]

  describe('getOwned', () => {
    const req = {
      authInfo: {
        oid: student._id
      }
    }

    it('should return all owned proposal for the requesting student', async () => {
      await Student.insertMany([student])
      await Proposal.insertMany(spvrProposals)

      // TODO: Finish this test
      const response = await ProposalService.getOwned(req)
    })
  })

  describe('get', () => {
    it('should get a proposal by its id', async () => {})
  })

  describe('add', () => {
    describe('supervisor defined', () => {
      it('should allow a student to create a new proposal', async () => {})
    })

    describe('student defined', () => {
      it('should allow a student to create a new proposal', async () => {})
    })
  })

  describe('edit', () => {
    it('should allow a student to edit their proposal', async () => {})
  })

  describe('upgrade', () => {
    it('should allow the student to upgrade their proposal', async () => {})

    it('should not allow the student to upgrade their proposal during specific phases', async () => {})
  })

  describe('downgrade', () => {
    it('should allow the student to downgrade their proposal during specific phases', async () => {})

    it('should not allow the student to downgrade their proposal during specific phases', async () => {})
  })

  describe.only('respond', () => {
    it('should allow a supervisor to respond to the proposal', async () => {
      await Supervisor.insertMany([supervisorObjs[0]])
      await Student.insertMany([student])
      await Topic.insertMany([topicObjs[0]])
      await Proposal.insertMany([spvrProposals[0]])

      const req = {
        params: {
          id: spvrProposals[0]._id
        },
        body: {
          responseType: 'pending_edits',
          message: 'Please update this proposal'
        },
        authInfo: {
          oid: supervisorObjs[0]._id
        }
      }

      const result = await ProposalService.respond(req)

      expect(result).toBe('update success')

      let notis = await Notification.find({}).exec()

      expect(notis.length).toBe(1)
      expect(notis[0].user).toBe(student._id)
    })

    it('should allow a coordinator to respond to the proposal', async () => {})
  })
})
