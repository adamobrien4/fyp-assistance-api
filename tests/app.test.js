/* eslint-disable no-undef */
const app = require('../app')
const supertest = require('supertest')

const { setupDB } = require('../testConfig/testSetup')
// Add mock passport implementation
const passport = require('../__mocks__/passport')

const Student = require('../models/Student')

setupDB('test')

const request = supertest(app)

beforeAll(() => {
  console.log('Settup up test environment')
})

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

  it('GET: should return a 404 error as there are no students in the database', async () => {
    const res = await request.get('/student')

    expect(res.statusCode).toBe(404)
    expect(res.body).toBe('No students found')
  })
})
