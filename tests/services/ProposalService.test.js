/* eslint-disable no-undef */
const MUUID = require('uuid-mongodb')
const ObjectId = require('mongoose').Types.ObjectId

const Student = require('../../models/Student')
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

  // TODO: Add topics
  const topics = [{}]

  const spvrProposals = [
    {
      _id: new ObjectId(),
      title: 'Proposal One',
      description: 'Proposal Description',
      additionalNotes: 'Some Additional Notes',
      chooseMessage: 'Choose Proposal Message',
      student: student._id,
      status: 'submitted',
      topic: new ObjectId(),
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

  describe('respond', () => {
    it('should allow a supervisor to respond to the proposal', async () => {})

    it('should allow a coordinator to respond to the proposal', async () => {})
  })
})
