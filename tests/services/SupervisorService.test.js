/* eslint-disable no-undef */

jest.mock('../../graph/graph')
jest.mock('../../utils/userAssignment/assignUser')

const MUUID = require('uuid-mongodb')
const Supervisor = require('../../models/Supervisor')
const SupervisorService = require('../../services/SupervisorService')
const axios = require('../../__mocks__/axios')
const Topic = require('../../models/Topic')

const { removeAllCollections } = require('../../testConfig/helperFunctions')

// const { setupDB } = require('../../testConfig/testSetup')
// setupDB('test')

beforeEach(() => jest.clearAllMocks())

describe.skip('Supervisor Service', () => {
  afterEach(async () => {
    await removeAllCollections()
  })

  const supervisorObjs = [
    {
      _id: MUUID.v4().toString(),
      email: 'supervisor1@email.com',
      firstName: 'First',
      lastName: 'Last',
      displayName: 'First Last',
      appRoleAssignmentId: '123asdqwe456'
    },
    {
      _id: MUUID.v4().toString(),
      email: 'supervisor2@email.com',
      firstName: 'First',
      lastName: 'Last',
      displayName: 'First Last',
      appRoleAssignmentId: 'dfse8593jfj439'
    },
    {
      _id: MUUID.v4().toString(),
      email: 'supervisor3@email.com',
      firstName: 'First',
      lastName: 'Last',
      displayName: 'First Last',
      appRoleAssignmentId: '5784hgjfeki484'
    }
  ]

  describe('getAll', () => {
    it('should get all supervisors', async () => {
      await Supervisor.insertMany(supervisorObjs)

      const response = await SupervisorService.getAll()

      const supervisors = response.supervisors

      expect(supervisors.length).toBe(3)

      expect(supervisors[0]._id).toBe(supervisorObjs[0]._id)
      expect(supervisors[1]._id).toBe(supervisorObjs[1]._id)
      expect(supervisors[2]._id).toBe(supervisorObjs[2]._id)
    })

    it('should return a empty array if no supervisors exist', async () => {
      const response = await SupervisorService.getAll()

      const supervisors = response.supervisors

      expect(supervisors.length).toBe(0)
    })
  })

  describe('list', () => {
    it('should return a list of all supervisors', async () => {
      await Supervisor.insertMany(supervisorObjs)

      const response = await SupervisorService.list()

      const list = response.supervisors

      expect(JSON.stringify(Object.keys(list[0]._doc))).toBe(
        JSON.stringify(['_id', 'displayName'])
      )
      expect(list[0]).toHaveProperty('_id', supervisorObjs[0]._id)
      expect(list[0]).toHaveProperty(
        'displayName',
        supervisorObjs[0].displayName
      )

      expect(JSON.stringify(Object.keys(list[1]._doc))).toBe(
        JSON.stringify(['_id', 'displayName'])
      )
      expect(list[1]).toHaveProperty('_id', supervisorObjs[1]._id)
      expect(list[1]).toHaveProperty(
        'displayName',
        supervisorObjs[1].displayName
      )

      expect(JSON.stringify(Object.keys(list[2]._doc))).toBe(
        JSON.stringify(['_id', 'displayName'])
      )
      expect(list[2]).toHaveProperty('_id', supervisorObjs[2]._id)
      expect(list[2]).toHaveProperty(
        'displayName',
        supervisorObjs[2].displayName
      )
    })

    it('should return a blank array when no supervisors exist', async () => {
      const response = await SupervisorService.list()

      const list = response.supervisors

      expect(list.length).toBe(0)
    })
  })

  describe('getProfile', () => {
    it('should get the profile of a supervisor', async () => {
      expect(true).toBeTruthy()
    })
  })

  describe('assign', () => {
    const req = {
      body: {
        supervisors: [{ email: 'supervisor@sample.ie' }]
      },
      headers: {
        authorization: '1a2b3n4h5k6j7g89h0p5jh3t'
      }
    }

    it('should assign a new supervisor to the system', async () => {
      const result = await SupervisorService.assign(req)

      const response = result.supervisors

      expect(response.length).toBe(1)
      expect(response[0].email).toBe(req.body.supervisors[0].email)
      expect(response[0].status).toBe('assigned')
    })

    it('should find existing supervisor before assigning them to the system', async () => {
      // await Supervisor.insertMany(supervisorObjs)
      // req.body.supervisors.push({ email: supervisorObjs[0].email })
      // const result = await SupervisorService.assign(req)
      // const response = result.supervisors
      // expect(response.length).toBe(2)
      // expect(response[0].email).toBe(req.body.supervisors[0].email)
      // expect(response[0].status).toBe('assigned')
      // expect(response[1].email).toBe(req.body.supervisors[1].email)
      // expect(response[1].status).toBe('exists')
    })
  })

  describe('edit', () => {
    const req = {
      body: {
        firstName: 'John',
        lastName: 'Lennon',
        displayName: 'John Lennon'
      },
      authInfo: {
        oid: supervisorObjs[0]._id
      }
    }

    it('should edit an existing supervisors details', async () => {
      const initialSupervisor = supervisorObjs[0]
      await Supervisor.insertMany([initialSupervisor])

      const response = await SupervisorService.edit(req)

      const resultingSupervisor = await Supervisor.findOne({
        _id: initialSupervisor._id
      }).exec()

      expect(response).toBe('update successful')

      expect(initialSupervisor.firstName).toBe(supervisorObjs[0].firstName)
      expect(initialSupervisor.lastName).toBe(supervisorObjs[0].lastName)
      expect(initialSupervisor.displayName).toBe(supervisorObjs[0].displayName)

      expect(resultingSupervisor.firstName).toBe(req.body.firstName)
      expect(resultingSupervisor.lastName).toBe(req.body.lastName)
      expect(resultingSupervisor.displayName).toBe(req.body.displayName)
    })
  })

  describe('updateCustomTopicAvailibility', () => {
    describe('no topic exists', () => {
      it('should add a new custom topic for the supervisor', async () => {
        const authInfo = {
          oid: supervisorObjs[0]._id,
          roles: ['Supervisor']
        }

        const resp = await SupervisorService.updateCustomTopicAvailibility(
          true,
          authInfo
        )

        expect(resp).toBe('topic created')

        const topic = await Topic.findOne({
          supervisor: supervisorObjs[0]._id,
          type: 'studentTopic'
        }).exec()

        expect(topic.supervisor).toBe(supervisorObjs[0]._id)
        expect(topic.title).toBe('Student Proposal Topic')
        expect(topic.status).toBe('active')
        expect(topic.ownerType).toBe(authInfo.roles[0].toLowerCase())
      })

      it('should add a new custom topic for a coordinator', async () => {
        const authInfo = {
          oid: supervisorObjs[0]._id,
          roles: ['Coordinator']
        }

        const resp = await SupervisorService.updateCustomTopicAvailibility(
          true,
          authInfo
        )

        expect(resp).toBe('topic created')

        const topic = await Topic.findOne({
          supervisor: supervisorObjs[0]._id,
          type: 'studentTopic'
        }).exec()

        expect(topic.supervisor).toBe(supervisorObjs[0]._id)
        expect(topic.title).toBe('Student Proposal Topic')
        expect(topic.status).toBe('active')
        expect(topic.ownerType).toBe(authInfo.roles[0].toLowerCase())
      })
    })

    describe('topic exists', () => {
      it('should toggle the topic from inactive to active for supervisor', async () => {
        const authInfo = {
          oid: supervisorObjs[0]._id,
          roles: ['Supervisor']
        }

        await Topic.insertMany([
          {
            supervisor: supervisorObjs[0]._id,
            status: 'archived',
            title: 'Student Proposal Topic',
            description: '<UNSET>',
            tags: [],
            additionalNotes: '',
            targetCourses: [],
            type: 'studentTopic',
            ownerType: authInfo.roles[0].toLowerCase()
          }
        ])

        const resp = await SupervisorService.updateCustomTopicAvailibility(
          true,
          authInfo
        )

        expect(resp).toBe('update successful')

        const topic = await Topic.findOne({ supervisor: authInfo.oid })

        expect(topic.status).toBe('active')
        expect(topic.supervisor).toBe(authInfo.oid)
      })

      it('should toggle the topic from inactive to active for coordinator', async () => {
        const authInfo = {
          oid: supervisorObjs[0]._id,
          roles: ['Coordinator']
        }

        await Topic.insertMany([
          {
            supervisor: supervisorObjs[0]._id,
            status: 'archived',
            title: 'Student Proposal Topic',
            description: '<UNSET>',
            tags: [],
            additionalNotes: '',
            targetCourses: [],
            type: 'studentTopic',
            ownerType: authInfo.roles[0].toLowerCase()
          }
        ])

        const resp = await SupervisorService.updateCustomTopicAvailibility(
          true,
          authInfo
        )

        expect(resp).toBe('update successful')

        const topic = await Topic.findOne({ supervisor: authInfo.oid })

        expect(topic.status).toBe('active')
        expect(topic.supervisor).toBe(authInfo.oid)
      })
    })
  })

  describe('getCustomTopicAvailibility', () => {
    const req = {
      authInfo: {
        oid: supervisorObjs[0]._id
      }
    }

    const customTopic = {
      supervisor: req.authInfo.oid,
      status: 'active',
      title: 'Custom Topic',
      description: 'Custom Topic Description',
      tags: 'tag1',
      additionalNotes: '',
      targetCourses: [],
      type: 'studentTopic',
      ownerType: 'supervisor'
    }

    it('should get the current supervisors custom topic supervision availability - available', async () => {
      await Topic.insertMany([customTopic])

      const resp = await SupervisorService.getCustomTopicAvailibility(
        req.authInfo.oid
      )

      const topic = resp.topic

      // Check that the resulting topic is not null
      expect(topic.supervisor).toBe(req.authInfo.oid)
    })

    it('should get the current supervisors custom topic supervision availability - unavailable', async () => {
      const resp = await SupervisorService.getCustomTopicAvailibility(
        req.authInfo.oid
      )

      const topic = resp.topic

      // Check that the resulting topic is null
      expect(topic).toBe(null)
    })
  })

  describe('remove', () => {
    const req = {
      body: {
        supervisorId: supervisorObjs[0]._id
      },
      headers: {
        authorization: '1a2b3c4v5g6h7j8k9l0p0o6u4t'
      }
    }

    it('should remove a supervisor from the system', async () => {
      axios.delete.mockResolvedValue('resolved')

      await Supervisor.insertMany([supervisorObjs[0]])
      const existingSupervisors = await Supervisor.find({}).exec()
      expect(existingSupervisors.length).toBe(1)

      const response = await SupervisorService.remove(req)
      const remainingSupervisors = await Supervisor.find({}).exec()

      expect(response).toBe('supervisor removed')
      expect(remainingSupervisors.length).toBe(0)
    })
  })
})
