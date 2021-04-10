/* eslint-disable no-undef */
jest.mock('../../../graph/graph')
jest.mock('axios')

const { assignUser } = require('../../../utils/userAssignment/assignUser')
const axios = require('axios')
const MUUID = require('uuid-mongodb')

const { removeAllCollections } = require('../../../testConfig/helperFunctions')

const config = require('../../../config/config')

const Student = require('../../../models/Student')

describe('Assign User', () => {
  afterEach(async () => {
    await removeAllCollections()
  })
  const authHeader = '1g2b5b6n6j4h4n6j746j4jn46'

  const profileData = {
    userPrincipalName: 'student1@example.com',
    id: MUUID.v4().toString(),
    givenName: 'Jack',
    surname: 'Example'
  }

  const assignmentData = {
    id: '4hj3h43j4h3h5j3j5hj43h5j43',
    appRoleId: config.azure.appRoles.student
  }

  it('should sucessfully assign a student', async () => {
    jest.spyOn(axios, 'get').mockResolvedValueOnce({ data: profileData })
    jest.spyOn(axios, 'post').mockResolvedValueOnce({ data: assignmentData })
    // jest.spyOn(axios, 'get').mockResolvedValueOnce({ data: assignmentData })
    const result = await assignUser('student', authHeader, [
      { email: 'student1@example.com', status: 'unknown' }
    ])

    expect(result.length).toBe(1)
    expect(result[0].email).toBe(profileData.userPrincipalName)
    expect(result[0].status).toBe('assigned')
    expect(result[0].appRoleAssignmentId).toBe(assignmentData.id)

    let existingStudents = await Student.find({}).exec()

    expect(existingStudents.length).toBe(1)
    expect(existingStudents[0]._id).toBe(profileData.id)
    expect(existingStudents[0].appRoleAssignmentId).toBe(assignmentData.id)
  })
})
