/* eslint-disable no-undef */
const app = require('../app')
const supertest = require('supertest')

const { setupDB } = require('../testConfig/testSetup')

// Add mock passport implementation
require('../__mocks__/passport')

const Student = require('../models/Student')
const Coordinator = require('../models/Coordinator')

// Setup test environment with 'test' database
setupDB('test')

const request = supertest(app)

beforeAll(() => {
  console.log('Settup up test environment')
})

beforeEach(() => {})

afterAll(() => {
  console.log('Tearing down test environment')
})

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
