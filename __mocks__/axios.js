const axios = jest.genMockFromModule('axios')

const throwUnmockedError = () => {
  throw new Error('This endpoint has been mocked, but hasn\'t been given a manual response.')
}

axios.post.mockImplementation(throwUnmockedError)
axios.request.mockImplementation(throwUnmockedError)
axios.get.mockImplementation(throwUnmockedError)
axios.delete.mockImplementation(throwUnmockedError)
axios.head.mockImplementation(throwUnmockedError)
axios.options.mockImplementation(throwUnmockedError)
axios.post.mockImplementation(throwUnmockedError)
axios.put.mockImplementation(throwUnmockedError)
axios.patch.mockImplementation(throwUnmockedError)

module.exports = axios
