/* eslint-disable no-undef */
const permit = require('../../middleware/authorization')

beforeEach(() => {
  process.env.NODE_ENV = 'undef'
})

describe('User Authorization check', () => {
  it('should skip checks when in "test" environment', () => {
    process.env.NODE_ENV = 'test'
    const req = {
      authInfo: {
        roles: []
      }
    }
    const next = jest.fn()
    permit('Coordinator')(req, {}, next)

    expect(process.env.NODE_ENV === 'test').toBeTruthy()
    expect(next).toBeCalled()
  })

  describe('when user is Student', () => {
    const req = {
      authInfo: {
        roles: ['Student']
      }
    }
    it('should allow access when passing string', () => {
      const next = jest.fn()
      permit('Student')(req, {}, next)

      expect(process.env.NODE_ENV === 'test').toBeFalsy()
      expect(next).toBeCalled()
    })

    it('should allow access when passing an array', () => {
      const next = jest.fn()
      permit(['Student'])(req, {}, next)

      expect(process.env.NODE_ENV === 'test').toBeFalsy()
      expect(next).toBeCalled()
    })

    it('should decline access when passing a string', () => {
      const next = jest.fn()
      const res = {
        status: jest.fn(c => res),
        json: jest.fn(d => res)
      }
      permit('IncorrectRole')(req, res, next)

      expect(process.env.NODE_ENV === 'test').toBeFalsy()
      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        'user is not authorized to view this resource'
      )
      expect(next).toHaveBeenCalledTimes(0)
    })

    it('should decline access when passing an array', () => {
      const next = jest.fn()
      const res = {
        status: jest.fn(c => res),
        json: jest.fn(d => res)
      }
      permit(['IncorrectRole1', 'IncorrectRole2'])(req, res, next)

      expect(process.env.NODE_ENV === 'test').toBeFalsy()
      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        'user is not authorized to view this resource'
      )
      expect(next).toHaveBeenCalledTimes(0)
    })
  })

  describe('when the user has multiple roles', () => {
    const req = {
      authInfo: {
        roles: ['Supervisor', 'Coordinator']
      }
    }

    it('should allow access when passing a string', () => {
      const next = jest.fn()
      permit('Coordinator')(req, {}, next)

      expect(process.env.NODE_ENV === 'test').toBeFalsy()
      expect(next).toBeCalled()
    })

    it('should allow access when passing an array', () => {
      const next = jest.fn()
      permit(['Coordinator', 'Student'])(req, {}, next)

      expect(process.env.NODE_ENV === 'test').toBeFalsy()
      expect(next).toBeCalled()
    })

    it('should decline access when passing a string', () => {
      const next = jest.fn()
      const res = {
        status: jest.fn(r => res),
        json: jest.fn(r => res)
      }
      permit('UNDEF')(req, res, next)

      expect(process.env.NODE_ENV === 'test').toBeFalsy()
      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        'user is not authorized to view this resource'
      )
      expect(next).toHaveBeenCalledTimes(0)
    })

    it('should decline access when passing an array', () => {
      const next = jest.fn()
      const res = {
        status: jest.fn(r => res),
        json: jest.fn(r => res)
      }
      permit(['UNDEF', 'UNDEF2'])(req, res, next)

      expect(process.env.NODE_ENV === 'test').toBeFalsy()
      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(
        'user is not authorized to view this resource'
      )
      expect(next).toHaveBeenCalledTimes(0)
    })
  })
})
