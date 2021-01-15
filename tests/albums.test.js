const getFirstAlbumTitle = require('../albums');
const axios = require('../__mocks__/axios');

it('returns the title of the first album', async () => {

	axios.get.mockResolvedValue({
		data: [
			{
				userId: 1,
				id: 1,
				title: 'My First Album'
			},
			{
				userId: 2,
				id: 2,
				title: 'My Second Album'
			}
		]
	});

	const title = await getFirstAlbumTitle();
	expect(title).toEqual('My First Album');
});