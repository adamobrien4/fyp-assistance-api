/* eslint-disable no-undef */
const yup = require('yup')

const permit = require('../../middleware/authorization')
const validateResourceMW = require('../../middleware/validateResource')
const isPhase = require('../../middleware/phaseCheck')

const add = require('date-fns/add')
const sub = require('date-fns/sub')

beforeEach(() => {
  process.env.NODE_ENV = 'test'
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
      process.env.NODE_ENV = 'undef'
      const next = jest.fn()
      permit('Student')(req, {}, next)

      expect(process.env.NODE_ENV === 'test').toBeFalsy()
      expect(next).toBeCalled()
    })

    it('should allow access when passing an array', () => {
      process.env.NODE_ENV = 'undef'
      const next = jest.fn()
      permit(['Student'])(req, {}, next)

      expect(process.env.NODE_ENV === 'test').toBeFalsy()
      expect(next).toBeCalled()
    })

    it('should decline access when passing a string', () => {
      process.env.NODE_ENV = 'undef'
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
      process.env.NODE_ENV = 'undef'
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
      process.env.NODE_ENV = 'undef'
      const next = jest.fn()
      permit('Coordinator')(req, {}, next)

      expect(process.env.NODE_ENV === 'test').toBeFalsy()
      expect(next).toBeCalled()
    })

    it('should allow access when passing an array', () => {
      process.env.NODE_ENV = 'undef'
      const next = jest.fn()
      permit(['Coordinator', 'Student'])(req, {}, next)

      expect(process.env.NODE_ENV === 'test').toBeFalsy()
      expect(next).toBeCalled()
    })

    it('should decline access when passing a string', () => {
      process.env.NODE_ENV = 'undef'
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
      process.env.NODE_ENV = 'undef'
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

  describe('when user has no/invalid role', () => {
    const req = {
      authInfo: {
        roles: []
      }
    }
    const res = {
      status: jest.fn(x => res),
      json: jest.fn(x => res)
    }

    it('should return with user not found error', () => {
      process.env.NODE_ENV = 'undef'
      const next = jest.fn()
      permit('Student')(req, res, next)

      expect(process.env.NODE_ENV === 'test').toBeFalsy()
      expect(next).toBeCalledTimes(0)
      expect(res.status).toBeCalledWith(403)
      expect(res.json).toBeCalledWith('user role not found')
    })
  })
})

describe('Resource Validation', () => {
  const sampleSchema = yup.object({
    username: yup.string().required(),
    age: yup.number().required()
  })
  it('should sucessfully validate a resource', async () => {
    let next = jest.fn()
    let req = {
      body: {
        username: 'adam',
        age: 21
      }
    }

    await validateResourceMW(sampleSchema)(req, {}, next)

    expect(next).toHaveBeenCalled()
  })

  it('should return an error if the resource is malformed', async () => {
    let req = {
      body: {
        username: 'adam',
        age: '123-546'
      }
    }
    let res = {
      status: jest.fn(x => res),
      json: jest.fn(x => res)
    }
    let next = jest.fn()

    await validateResourceMW(sampleSchema)(req, res, next)

    expect(next).toHaveBeenCalledTimes(0)
    expect(res.status).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalled()
  })

  describe('remove unnecessary fields', () => {
    const sampleSchema = yup.object({
      username: yup.string().required(),
      age: yup.number().required()
    })
    it('should remove any unnecessary fields from the resouce', async () => {
      let req = {
        body: {
          username: 'adam1',
          fname: 'adam',
          age: 21,
          __v: 4
        }
      }
      let res = {
        status: jest.fn(x => res),
        json: jest.fn(x => res)
      }
      let next = jest.fn()

      const notExpected = ['fname', '__v']
      const expected = ['username', 'age']

      await validateResourceMW(sampleSchema)(req, res, next)

      expect(Object.keys(req.body)).toEqual(
        expect.not.arrayContaining(notExpected)
      )
      expect(Object.keys(req.body)).toEqual(expect.arrayContaining(expected))
      expect(next).toHaveBeenCalled()
    })
  })
})

describe('Phase Check', () => {
  const phases = [
    {
      phase: 0,
      start_time: sub(new Date(), { days: 3 }),
      end_time: sub(new Date(), { days: 2 })
    },
    {
      phase: 1,
      start_time: sub(new Date(), { days: 1 }),
      end_time: add(new Date(), { days: 1 })
    },
    {
      phase: 2,
      start_time: add(new Date(), { days: 2 }),
      end_time: add(new Date(), { days: 3 })
    }
  ]

  it('should allow the action to be carried out: Number', async () => {
    let req = {
      body: {}
    }
    let res = {
      status: jest.fn(x => res),
      json: jest.fn(x => res)
    }
    let next = jest.fn()

    isPhase(1)(req, res, next, phases[1])

    expect(next).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledTimes(0)
    expect(res.json).toHaveBeenCalledTimes(0)

    expect(req.phase.phase).toBe(phases[1].phase)
    expect(req.phase.startDate).toBe(phases[1].start_time)
    expect(req.phase.endDate).toBe(phases[1].end_time)
  })

  it('should not allow the action to be carried out: Number', async () => {
    let req = {
      body: {}
    }
    let res = {
      status: jest.fn(x => res),
      json: jest.fn(x => res)
    }
    let next = jest.fn()

    isPhase(4)(req, res, next, phases[1])

    expect(next).toHaveBeenCalledTimes(0)
    expect(res.status).toHaveBeenCalledTimes(1)
    expect(res.json).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      'action cannot be carried out during current phase'
    )

    expect(req.phase).toBe(undefined)
  })

  it('should allow the action to be carried out: Array[Number, Number]', async () => {
    let req = {
      body: {}
    }
    let res = {
      status: jest.fn(x => res),
      json: jest.fn(x => res)
    }
    let next = jest.fn()

    isPhase([1, 2])(req, res, next, phases[1])

    expect(next).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledTimes(0)
    expect(res.json).toHaveBeenCalledTimes(0)

    expect(req.phase.phase).toBe(phases[1].phase)
    expect(req.phase.startDate).toBe(phases[1].start_time)
    expect(req.phase.endDate).toBe(phases[1].end_time)
  })

  it('should not allow the action to be carried out: Array[Number, Number]', async () => {
    let req = {
      body: {}
    }
    let res = {
      status: jest.fn(x => res),
      json: jest.fn(x => res)
    }
    let next = jest.fn()

    isPhase([0, 2])(req, res, next, phases[1])

    expect(next).toHaveBeenCalledTimes(0)
    expect(res.status).toHaveBeenCalledTimes(1)
    expect(res.json).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      'action cannot be carried out during current phase'
    )

    expect(req.phase).toBe(undefined)
  })

  it('should expect an error if the phase could not be found', async () => {
    let req = {
      body: {}
    }
    let res = {
      status: jest.fn(x => res),
      json: jest.fn(x => res)
    }
    let next = jest.fn()

    isPhase(1)(req, res, next, null)

    expect(next).toHaveBeenCalledTimes(0)
    expect(res.status).toHaveBeenCalledTimes(1)
    expect(res.json).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith('could not retrieve phase')

    expect(req.phase).toBe(undefined)
  })
})
