/* eslint-disable no-undef */
jest.mock('../../graph/graph')
jest.mock('../../utils/userAssignment/assignUser')

const MUUID = require('uuid-mongodb')
const Student = require('../../models/Student')
const StudentService = require('../../services/StudentService')
const axios = require('../../__mocks__/axios')

const { removeAllCollections } = require('../../testConfig/helperFunctions')

describe('Student Service', () => {
  afterEach(async () => {
    await removeAllCollections()
  })
  const studentObjs = [
    {
      _id: MUUID.v4().toString(),
      studentId: '11223344',
      email: '11223344@studentmail.ul.ie',
      firstName: 'Adam',
      lastName: 'OBrien',
      displayName: 'Adam OBrien',
      appRoleAssignmentId: 'a5s7d3j4m7n3b5n7k85nh54'
    },
    {
      _id: MUUID.v4().toString(),
      studentId: '11335577',
      email: '11335577@studentmail.ul.ie',
      firstName: 'Jack',
      lastName: 'Sullivan',
      displayName: 'Jack Sullivan',
      appRoleAssignmentId: '5m6j32j4j543bbh4bh32j43'
    },
    {
      _id: MUUID.v4().toString(),
      studentId: '99554488',
      email: '99554488@studentmail.ul.ie',
      firstName: 'Niall',
      lastName: 'Connors',
      displayName: 'Niall Connors',
      appRoleAssignmentId: '4hj3h4j5h336jb4j65k46kj'
    }
  ]

  describe('getAll', () => {
    it('should get all students', async () => {
      await Student.insertMany(studentObjs)

      const response = await StudentService.getAll()
      const students = response.students

      expect(students.length).toBe(3)

      expect(students[0]._id).toBe(studentObjs[0]._id)
      expect(students[1]._id).toBe(studentObjs[1]._id)
      expect(students[2]._id).toBe(studentObjs[2]._id)
    })

    it('should return a empty array if no students exist', async () => {
      const response = await StudentService.getAll()

      const students = response.students

      expect(students.length).toBe(0)
    })
  })

  describe('assign', () => {
    let req = null
    beforeEach(() => {
      req = {
        body: {
          students: [{ email: studentObjs[0].email }]
        },
        headers: {
          authorization: '1a2b3n4h5k6j7g89h0p5jh3t'
        }
      }
    })

    it('should assign a new student to the system', async () => {
      const result = await StudentService.assign(req)

      const response = result.students

      expect(response.length).toBe(1)
      expect(response[0].email).toBe(req.body.students[0].email)
      expect(response[0].status).toBe('assigned')
    })

    it('ahould assign a group of students to the system', async () => {
      req.body.students.push({ email: studentObjs[1].email })
      const result = await StudentService.assign(req)

      const response = result.students

      expect(response.length).toBe(2)
      expect(response[0].email).toBe(req.body.students[0].email)
      expect(response[0].status).toBe('assigned')

      expect(response[1].email).toBe(req.body.students[1].email)
      expect(response[1].status).toBe('assigned')
    })

    it('should find existing student before assigning them to the system', async () => {
      await Student.insertMany(studentObjs)

      req.body.students.push({ email: 'newStudent@example.com' })

      const result = await StudentService.assign(req)
      const response = result.students

      expect(response.length).toBe(2)
      expect(response[0].email).toBe(req.body.students[0].email)
      expect(response[0].status).toBe('exists')

      expect(response[1].email).toBe(req.body.students[1].email)
      expect(response[1].status).toBe('assigned')
    })
  })

  describe('remove', () => {
    const req = {
      body: {
        studentId: studentObjs[0]._id
      },
      headers: {
        authorization: '1a2b3c4v5g6h7j8k9l0p0o6u4t'
      }
    }

    it('should remove a student from the system', async () => {
      axios.delete.mockResolvedValue('resolved')

      await Student.insertMany([studentObjs[0]])
      const existingStudents = await Student.find({}).exec()
      expect(existingStudents.length).toBe(1)

      const response = await StudentService.remove(req)
      const remainingStudents = await Student.find({}).exec()

      expect(response).toBe('student removed')
      expect(remainingStudents.length).toBe(0)
    })
  })
})
