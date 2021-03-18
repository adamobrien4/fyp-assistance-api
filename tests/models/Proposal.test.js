/* eslint-disable no-undef */
const mongoose = require('mongoose')
const MUUID = require('uuid-mongodb')

const { Proposal } = require('../../models/Proposal')
const Topic = require('../../models/Topic')

// TODO: Find out how to initialise the test DB before when running individual test files
// DB setup is ran in the app.test.js file currently
// const { setupDB } = require('../../testConfig/testSetup')
// setupDB('test')

describe('Proposal Model test', () => {
  const proposalObject = {
    title: 'My Proposal Title',
    description: 'My Proposal Description',
    additionalNotes: 'Some Add additional notes',
    chooseMessage: 'Choose me message',
    student: MUUID.v4(),
    topic: '603245992163751d10971c03'
  }
  it('should create a new Proposal', async () => {
    await new Proposal({ ...proposalObject }).save()

    let resultingProposal = await Proposal.findOne({}).exec()

    expect(resultingProposal.title).toBe(proposalObject.title)
  })
})
