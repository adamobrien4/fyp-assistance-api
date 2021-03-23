/* eslint-disable no-undef */
jest.mock('../../graph/graph')
jest.mock('../../utils/userAssignment/assignUser')

const MUUID = require('uuid-mongodb')
const axios = require('../../__mocks__/axios')
const Coordinator = require('../../models/Coordinator')
const CoordinatorService = require('../../services/CoordinatorService')

const { removeAllCollections } = require('../../testConfig/helperFunctions')

// const { setupDB } = require('../../testConfig/testSetup')
// setupDB('test')

describe('Coordinator Service', () => {
  beforeEach(() => jest.clearAllMocks())

  afterEach(async () => {
    await removeAllCollections()
  })

  const coordinatorObjs = [
    {
      _id: MUUID.v4().toString(),
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Johnson',
      displayName: 'John Johnson',
      appRoleAssignmentId: MUUID.v4().toString()
    },
    {
      _id: MUUID.v4().toString(),
      email: 'sarah@example.com',
      firstName: 'Sarah',
      lastName: 'Foreman',
      displayName: 'Sarah Foreman',
      appRoleAssignmentId: MUUID.v4().toString()
    },
    {
      _id: MUUID.v4().toString(),
      email: 'mark@example.com',
      firstName: 'Mark',
      lastName: 'Lime',
      displayName: 'Mark Lime',
      appRoleAssignmentId: MUUID.v4().toString()
    }
  ]

  describe('getAll', () => {
    afterEach(async () => {
      await removeAllCollections()
    })

    it('should retrieve all coordinators from the database', async () => {
      await Coordinator.insertMany(coordinatorObjs)

      const result = await CoordinatorService.getAll()
      const response = result.coordinators

      expect(response.length).toBe(3)
      expect(response[0].email).toBe(coordinatorObjs[0].email)
      expect(response[0].displayName).toBe(coordinatorObjs[0].displayName)
      expect(response[1].email).toBe(coordinatorObjs[1].email)
      expect(response[1].displayName).toBe(coordinatorObjs[1].displayName)
      expect(response[2].email).toBe(coordinatorObjs[2].email)
      expect(response[2].displayName).toBe(coordinatorObjs[2].displayName)
    })
  })

  describe('remove', () => {
    const req = {
      body: {
        coordinatorId: coordinatorObjs[0]._id
      },
      headers: {
        authorization: '1a2b3c4v5g6h7j8k9l0p0o6u4t'
      }
    }

    it('should remove a coordinator from the system', async () => {
      axios.delete.mockResolvedValue('resolved')

      await Coordinator.insertMany([coordinatorObjs[0]])
      const existingCoordinators = await Coordinator.find({}).exec()
      expect(existingCoordinators.length).toBe(1)

      const response = await CoordinatorService.remove(req)
      const remainingCoordinators = await Coordinator.find({}).exec()

      expect(response).toBe('coordinator removed')
      expect(remainingCoordinators.length).toBe(0)
    })
  })

  describe('assign', () => {
    const req = {
      body: {
        coordinator: coordinatorObjs[0].email
      },
      headers: {
        authorization: '1a2b3n4h5k6j7g89h0p5jh3t'
      }
    }

    it('should assign a new coordinator to the system', async () => {
      const result = await CoordinatorService.assign(req)

      const response = result.coordinator[0]

      expect(response.email).toBe(req.body.coordinator)
      expect(response.status).toBe('assigned')
    })

    it('should find existing supervisor before assigning them to the system', async () => {
      await Coordinator.insertMany(coordinatorObjs)

      const response = await CoordinatorService.assign(req)

      expect(response.coordinator.email).toBe(req.body.coordinator)
      expect(response.coordinator.status).toBe('exists')
    })
  })
})
