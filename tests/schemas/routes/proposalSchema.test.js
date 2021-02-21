/* eslint-disable no-undef */
const yup = require('yup')
const {
  addProposalSchema,
  editProposalSchema,
  proposalResponseSchema
} = require('../../../schemas/routes/proposalSchema')

describe('addProposalSchema', () => {
  const proposalObject = {
    isCustomProposal: true,
    title: 'My Proposal Title',
    description: 'My Proposal Description',
    additionalNotes: 'Some Add additional notes',
    chooseMessage: 'Choose me message',
    topic: '603245992163751d10971c03',
    saveAsDraft: true,
    environment: 'My environment',
    languages: 'My Languages'
  }
  it('should validate a valid request', async () => {
    const reqObj = {
      ...proposalObject
    }

    const res = await addProposalSchema.isValid(reqObj)

    expect(res).toBeTruthy()
  })

  it('should throw an error for empty title', async () => {
    const reqObj = {
      ...proposalObject,
      title: ''
    }

    addProposalSchema.validate(reqObj).catch(err => {
      expect(err.errors[0]).toBe('Proposal must include a title')
    })
  })

  it('should throw an error for empty description', async () => {
    const reqObj = {
      ...proposalObject,
      description: ''
    }

    addProposalSchema.validate(reqObj).catch(err => {
      expect(err.errors[0]).toBe('Proposal must include a description')
    })
  })

  it('should throw an error for invalid topic (topidId)', async () => {
    const reqObj = {
      ...proposalObject,
      topic: 'invalid'
    }

    addProposalSchema.validate(reqObj).catch(err => {
      expect(err.errors[0]).toBe('Topic ID is not valid')
    })
  })

  describe('supervisor topic proposal', () => {
    it('should validate a valid proposal', async () => {
      const reqObj = {
        ...proposalObject,
        isCustomProposal: false,
        environment: '',
        languages: ''
      }

      const res = await addProposalSchema.validate(reqObj)

      expect(res).toBeTruthy()
    })
  })

  describe('custom proposal validation', () => {
    it('should throw an error for empty environment', async () => {
      const reqObj = {
        ...proposalObject,
        environment: ''
      }

      addProposalSchema.validate(reqObj).catch(err => {
        expect(err.errors[0]).toBe('Proposal must specify an environment')
      })
    })

    it('should throw an error for empty languages', async () => {
      const reqObj = {
        ...proposalObject,
        languages: ''
      }

      addProposalSchema.validate(reqObj).catch(err => {
        expect(err.errors[0]).toBe('Proposal must specify languages')
      })
    })
  })
})
