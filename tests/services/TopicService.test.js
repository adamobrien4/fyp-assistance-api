/* eslint-disable no-undef */
const MUUID = require('uuid-mongodb')
const ObjectId = require('mongoose').Types.ObjectId

const Topic = require('../../models/Topic')
const Supervisor = require('../../models/Supervisor')
const Coordinator = require('../../models/Coordinator')
const Tag = require('../../models/Tag')
const TopicService = require('../../services/TopicService')

const { removeAllCollections } = require('../../testConfig/helperFunctions')

describe('Topic Service', () => {
  afterEach(async () => {
    await removeAllCollections()
  })

  const tags = ['Research', 'Predominantly Research', 'Android', 'Java']

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
    }
  ]

  const coordinatorObjs = [
    {
      _id: MUUID.v4().toString(),
      email: 'coordinator1@email.com',
      firstName: 'First',
      lastName: 'Last',
      displayName: 'First Last',
      appRoleAssignmentId: '5784hgjfeki484'
    }
  ]

  const topicObjs = [
    {
      _id: new ObjectId(),
      supervisor: supervisorObjs[0]._id,
      status: 'active',
      title: 'Topic Title One',
      description: 'Topic Description',
      tags: [tags[0], tags[2]],
      additionalNotes: 'Some Additional Notes',
      targetCourses: [],
      type: 'regular',
      ownerType: 'supervisor'
    },
    {
      _id: new ObjectId(),
      supervisor: supervisorObjs[0]._id,
      status: 'active',
      title: 'Topic Title Two',
      description: 'Topic Description',
      tags: [tags[1]],
      additionalNotes: 'Some Additional Notes',
      targetCourses: [],
      type: 'studentTopic',
      ownerType: 'supervisor'
    },
    {
      _id: new ObjectId(),
      supervisor: supervisorObjs[1]._id,
      status: 'active',
      title: 'Topic Title Three',
      description: 'Topic Description',
      tags: [tags[2]],
      additionalNotes: 'Some Additional Notes',
      targetCourses: [],
      type: 'regular',
      ownerType: 'supervisor'
    },
    {
      _id: new ObjectId(),
      supervisor: coordinatorObjs[0]._id,
      status: 'active',
      title: 'Topic Title Four',
      description: 'Topic Description',
      tags: [tags[2], tags[3]],
      additionalNotes: 'Some Additional Notes',
      targetCourses: [],
      type: 'studentTopic',
      ownerType: 'coordinator'
    }
  ]

  const tagObjs = [
    {
      _id: 'Research',
      ancestors: [],
      parent: null
    },
    {
      _id: 'Predominantly Research',
      ancestors: ['Research'],
      parent: 'Research'
    },
    {
      _id: 'Partially Research',
      ancestors: ['Research'],
      parent: 'Research'
    },
    {
      _id: 'App Development',
      ancestors: [],
      parent: null
    },
    {
      _id: 'Apple IOS',
      ancestors: ['App Development'],
      parent: 'App Development'
    },
    {
      _id: 'Android',
      ancestors: ['App Development'],
      parent: 'App Development'
    },
    {
      _id: 'Software Development',
      ancestors: [],
      parent: null
    },
    {
      _id: 'Java',
      ancestors: ['Software Development'],
      parent: 'Software Development'
    },
    {
      _id: 'C++',
      ancestors: ['Software Development'],
      parent: 'Software Development'
    },
    {
      _id: 'Website Development',
      ancestors: [],
      parent: null
    }
  ]

  describe('getOwned', () => {
    it('should ', async () => {
      expect(true).toBeTruthy()
    })
  })

  describe('get', () => {
    it('should ', async () => {
      expect(true).toBeTruthy()
    })
  })

  describe('getTopicProposals', () => {
    it('should ', async () => {
      expect(true).toBeTruthy()
    })
  })

  describe('search', () => {
    const req = {
      body: {},
      authInfo: {
        oid: MUUID.v4().toString()
      }
    }

    beforeEach(async () => {
      await Supervisor.insertMany(supervisorObjs)
      await Coordinator.insertMany(coordinatorObjs)
      await Topic.insertMany(topicObjs)
      await Tag.insertMany(tagObjs)
    })

    afterEach(async () => {
      await removeAllCollections()
    })

    it('should find a topic given the owning supervisor', async () => {
      req.body = {
        supervisor: supervisorObjs[0]._id
      }

      const result = await TopicService.search(req)
      const response = result.topics

      expect(response.length).toBe(2)

      expect(response[0].title).toBe(topicObjs[0].title)
      expect(response[0].type).toBe(topicObjs[0].type)
      expect(response[0].supervisor._id).toBe(req.body.supervisor)
      expect(response[1].title).toBe(topicObjs[1].title)
      expect(response[1].type).toBe(topicObjs[1].type)
      expect(response[1].supervisor._id).toBe(req.body.supervisor)
    })

    it('should find a topic given a single tag', async () => {
      req.body = {
        tags: [tags[3]]
      }

      const result = await TopicService.search(req)
      const response = result.topics

      expect(response.length).toBe(1)

      expect(response[0]._id).toEqual(topicObjs[3]._id)
    })

    it('should find a topic given a nested tag', async () => {
      req.body = {
        tags: [tags[0]]
      }

      const result = await TopicService.search(req)
      const response = result.topics

      expect(response.length).toBe(2)
      expect(response[0]._id).toEqual(topicObjs[0]._id)
      expect(response[1]._id).toEqual(topicObjs[1]._id)
    })

    it('should find a topic given a topic type', async () => {
      req.body = {
        topicType: 'studentTopic'
      }

      const result = await TopicService.search(req)
      const response = result.topics

      expect(response.length).toBe(2)
      expect(response[0]._id).toEqual(topicObjs[1]._id)
      expect(response[1]._id).toEqual(topicObjs[3]._id)
    })

    it('should find a topic all paramaters', async () => {
      req.body = {
        topicType: 'regular',
        tags: [tags[0], tags[2]],
        supervisor: supervisorObjs[0]._id
      }

      const result = await TopicService.search(req)
      const response = result.topics

      expect(response.length).toBe(1)

      expect(response[0]._id).toEqual(topicObjs[0]._id)
      expect(response[0].title).toBe(topicObjs[0].title)
    })

    it('should find no matching topics', async () => {
      req.body = {
        topicType: 'regular',
        tags: [tags[3]],
        supervisor: supervisorObjs[0]._id
      }

      const result = await TopicService.search(req)
      const response = result.topics

      expect(response.length).toBe(0)
    })
  })

  describe('add', () => {
    it('should ', async () => {
      expect(true).toBeTruthy()
    })
  })

  describe('edit', () => {
    it('should ', async () => {
      expect(true).toBeTruthy()
    })
  })
})
