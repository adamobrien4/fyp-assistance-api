/* eslint-disable no-undef */
const app = require('../app')
const supertest = require('supertest')

const { setupDB } = require('../testConfig/testSetup')

// Add mock passport implementation
const passport = require('../__mocks__/passport')
const axios = require('../__mocks__/axios')

const Student = require('../models/Student')
const Coordinator = require('../models/Coordinator')
const Topic = require('../models/Topic')
const { Proposal } = require('../models/Proposal')

// Setup test environment with 'test' database
setupDB('test')

app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header(
    'Access-Control-Allow-Headers',
    'Authorization, Origin, X-Requested-With, Content-Type, Accept'
  )
  next()
})

const request = supertest(app)

describe('Endpoint Testing: /student', () => {
  it('GET: should return all students', async () => {
    // Seed the Database
    let testStudents = [
      {
        studentId: '1234',
        email: '1234@studentmail.ul.ie',
        firstName: 'Adam',
        lastName: 'Byrne',
        displayName: 'Adam Byrne',
        azureId: '123-123-123',
        appRoleAssignmentId: '1234-123-1234'
      },
      {
        studentId: '2345',
        email: '2345@studentmail.ul.ie',
        firstName: 'John',
        lastName: 'Toole',
        displayName: 'John Toole',
        azureId: '234-123-234',
        appRoleAssignmentId: '2345-123-2345'
      }
    ]
    await Student.insertMany(testStudents)

    // Make GET request to /student endpoint
    const res = await request.get('/student')

    expect(res.statusCode).toBe(200)
    expect(res.body).toHaveProperty('students')
    expect(res.body.students.length).toBe(2)

    expect(res.body.students[0].email).toBe(testStudents[0].email)
    expect(res.body.students[1].email).toBe(testStudents[1].email)
  })

  it('GET: should return an empty array when there are no students in the database', async () => {
    const res = await request.get('/student')

    expect(res.statusCode).toBe(200)
    expect(res.body.students.length).toBe(0)
  })

  describe('POST: /delete', () => {
    it('Should return a malformed body error', async () => {
      const res = await request.post('/student/delete').send({})

      expect(res.statusCode).toBe(400)
      expect(res.body.error).toBe('studentId is a required field')
    })

    it('Should remove a student role assignment and delete the student from the database', async () => {
      // Seed the Database
      let testStudents = [
        {
          _id: 'a1a1a1a1-a4ca-4a29-a62a-1b7c0d49851a',
          studentId: '1234',
          email: '1234@studentmail.ul.ie',
          firstName: 'Adam',
          lastName: 'Byrne',
          displayName: 'Adam Byrne',
          appRoleAssignmentId: '1234-123-1234'
        }
      ]
      await Student.insertMany(testStudents)

      // TODO: Ask juston how to do this

      // Mock axios functions
      axios.post.mockImplementation(url => {
        // return access token
        return 'access_token'
      })
      axios.delete.mockImplementation(() => {
        return 'mocked'
      })

      const res = await request.post('/student/delete')
    })
  })
})

describe('Endpoint Testing: /coordinator', () => {
  it('GET: should return all coordinators', async () => {
    let coordinators = [
      {
        email: 'coordinator1@email.com',
        firstName: 'Joe',
        lastName: 'Coordinator',
        displayName: 'Joe Coordinator',
        azureId: '123-1234-123',
        appRoleAssignmentId: '123-1234-123'
      },
      {
        email: 'coordinator2@email.com',
        firstName: 'Sarah',
        lastName: 'Coordinator',
        displayName: 'Sarah Coordinator',
        azureId: '1234-1234-1234',
        appRoleAssignmentId: '1234-1234-1234'
      }
    ]

    await Coordinator.insertMany(coordinators)

    // Make GET request to /coordinator
    const res = await request.get('/coordinator')

    expect(res.statusCode).toBe(200)
    expect(res.body).toHaveProperty('coordinators')

    expect(res.body.coordinators[0].email).toBe('coordinator1@email.com')
    expect(res.body.coordinators[0].displayName).toBe('Joe Coordinator')
    expect(res.body.coordinators[1].email).toBe('coordinator2@email.com')
    expect(res.body.coordinators[1].displayName).toBe('Sarah Coordinator')
  })

  it('GET: should return an empty array', async () => {
    // Make GET request to /coordinator
    const res = await request.get('/coordinator')

    expect(res.statusCode).toBe(200)
    expect(res.body).toStrictEqual({ message: 'no coordinators found' })
  })

  it('GET: should return a no coordinators found errror', async () => {
    const res = await request.get('/coordinator')

    console.log(res.body)
  })
})

describe('Endpoint Testing: /proposal', () => {
  let studentObj = {
    _id: '00c3be11-049b-4154-964e-280c3d369203',
    studentId: '11223344',
    email: '11223344@studentmail.ul.ie',
    displayName: 'Test Student',
    appRoleAssignmentId: 'a5d166bb-c438-44a1-8b45-7c728a510c91'
  }
  let topicObj = {
    supervisor: '6a774a90-3e79-4ec0-9d3f-4887f6591a81',
    code: 'SPRV',
    status: 'active',
    title: 'Title',
    description: 'Description',
    tags: []
  }
  let proposalObj = {
    title: 'Supervisor Defined Topic Proposal',
    description: 'Example Description',
    additionalNotes: '',
    chooseMessage: '',
    type: 'supervisorDefined',
    status: 'draft'
  }

  describe('GET: /:proposalId', () => {
    it('should retrieve the students proposal', async () => {
      // Seed DB
      let student = await new Student({ ...studentObj }).save()

      let topic = await new Topic({ ...topicObj }).save()

      let proposal = await new Proposal({
        ...proposalObj,
        status: 'submitted',
        student: student._id,
        topic: topic._id
      }).save()

      const res = await request.get(`/proposal/${proposal._id}`)

      // expect(res.status).toBe(200)
      // expect(res.body).toContain('proposal')
    })
  })

  describe('POST: /:proposalId/nextStep', () => {
    it("should update a supervisor defined topic proposal from 'draft' to 'submitted'", async () => {
      // Seed DB
      let student = await new Student({ ...studentObj }).save()

      let topic = await new Topic({ ...topicObj }).save()

      let proposal = await new Proposal({
        ...proposalObj,
        student: student._id,
        topic: topic._id
      }).save()

      const res = await request.post(`/proposal/${proposal._id}/nextStep`)

      const resultingProposal = await Proposal.findById(proposal._id).exec()

      // expect(res.status).toBe(200)
      // expect(res.body).toBe('proposal updated')

      // expect(proposal.status === 'draft').toBeTruthy()
      // expect(resultingProposal.status === 'submitted').toBeTruthy()
    })

    it("should update a supervisor defined topic proposal from 'pending_edits' to 'submitted'", async () => {
      // Seed DB
      let student = await new Student({ ...studentObj }).save()

      let topic = await new Topic({ ...topicObj }).save()

      let proposal = await new Proposal({
        ...proposalObj,
        status: 'pending_edits',
        student: student._id,
        topic: topic._id
      }).save()

      const res = await request.post(`/proposal/${proposal._id}/nextStep`)

      const resultingProposal = await Proposal.findById(proposal._id).exec()

      // expect(res.status).toBe(200)
      // expect(res.body).toBe('proposal updated')

      // expect(proposal.status === 'pending_edits').toBeTruthy()
      // expect(resultingProposal.status === 'submitted').toBeTruthy()
    })

    it('should return an error if the proposal status cannot be stepped forward', async () => {
      // Seed DB
      let student = await new Student({ ...studentObj }).save()

      let topic = await new Topic({ ...topicObj }).save()

      let proposal = await new Proposal({
        ...proposalObj,
        status: 'under_review',
        student: student._id,
        topic: topic._id
      }).save()

      const res = await request.post(`/proposal/${proposal._id}/nextStep`)

      const resultingProposal = await Proposal.findById(proposal._id).exec()

      // expect(res.status).toBe(400)
      // expect(res.body).toBe('cannot take next step for this proposal')

      expect(proposal.status === 'under_review').toBeTruthy()
      expect(resultingProposal.status === 'under_review').toBeTruthy()
    })
  })
})
