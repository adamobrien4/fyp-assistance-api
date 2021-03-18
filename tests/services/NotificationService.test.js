/* eslint-disable no-undef */
const MUUID = require('uuid-mongodb')

const Notification = require('../../models/Notification')
const NotificationService = require('../../services/NotificationService')

const { removeAllCollections } = require('../../testConfig/helperFunctions')

// const { setupDB } = require('../../testConfig/testSetup')
// setupDB('test')

describe('Notification Service', () => {
  afterEach(async () => {
    await removeAllCollections()
  })

  const user = {
    oid: MUUID.v4().toString()
  }

  const notiObjs = [
    {
      title: 'Notification Title One',
      path: '/notification/test/one',
      user: user.oid
    },
    {
      title: 'Notification Title Two',
      path: '/notification/test/two',
      user: user.oid
    },
    {
      title: 'Notification Title Three',
      path: '/notification/test/three',
      user: user.oid,
      read: true,
      read_at: new Date()
    }
  ]

  describe('find', () => {
    it('should find all notifications for a user', async () => {
      await Notification.insertMany(notiObjs)

      let retrievedNoti = await NotificationService.find({
        user: user.oid
      })

      expect(retrievedNoti[0].title).toBe(notiObjs[0].title)
      expect(retrievedNoti[0].path).toBe(notiObjs[0].path)
      expect(retrievedNoti[0].user).toBe(notiObjs[0].user)
      expect(retrievedNoti[0].read).toBeFalsy()

      expect(retrievedNoti[1].title).toBe(notiObjs[1].title)
      expect(retrievedNoti[1].path).toBe(notiObjs[1].path)
      expect(retrievedNoti[1].user).toBe(notiObjs[1].user)
      expect(retrievedNoti[1].read).toBeFalsy()

      expect(retrievedNoti[2].title).toBe(notiObjs[2].title)
      expect(retrievedNoti[2].path).toBe(notiObjs[2].path)
      expect(retrievedNoti[2].user).toBe(notiObjs[2].user)
      expect(retrievedNoti[2].read).toBeTruthy()
    })
  })

  describe('findOne', () => {
    it('should find one notification', async () => {
      await Notification.insertMany([notiObjs[0]])

      let noti = await NotificationService.findOne({ user: user.oid })

      expect(noti.title).toBe(notiObjs[0].title)
      expect(noti.path).toBe(notiObjs[0].path)
      expect(noti.user).toBe(notiObjs[0].user)
      expect(noti.read).toBeFalsy()
    })

    it('should return null - no notifications in db', () => {})
  })

  describe('findUnread', () => {
    it('should find all unread notifications for a user', async () => {
      await Notification.insertMany(notiObjs)

      let retrievedNoti = await NotificationService.findUnread({
        user: user.oid
      })

      expect(retrievedNoti.length).toBe(2)

      expect(retrievedNoti[0].title).toBe(notiObjs[0].title)
      expect(retrievedNoti[0].path).toBe(notiObjs[0].path)
      expect(retrievedNoti[0].user).toBe(notiObjs[0].user)
      expect(retrievedNoti[0].read).toBeFalsy()

      expect(retrievedNoti[1].title).toBe(notiObjs[1].title)
      expect(retrievedNoti[1].path).toBe(notiObjs[1].path)
      expect(retrievedNoti[1].user).toBe(notiObjs[1].user)
      expect(retrievedNoti[1].read).toBeFalsy()
    })
  })

  describe('add', () => {
    it('should create a new notification', async () => {
      await NotificationService.add(notiObjs[0])

      let retrievedNoti = await Notification.findOne({ user: user.oid })

      expect(retrievedNoti.title).toBe(notiObjs[0].title)
      expect(retrievedNoti.path).toBe(notiObjs[0].path)
      expect(retrievedNoti.user).toBe(notiObjs[0].user)
      expect(retrievedNoti.read).toBeFalsy()
    })

    it('should not create an invalid notification', async () => {
      const invalidNotiObj = {
        title: 'Title',
        path: null
      }

      await NotificationService.add(invalidNotiObj).catch(err => {
        expect(err.message).toBe(
          'Notification validation failed: user: Path `user` is required., path: Path `path` is required.'
        )
      })
    })
  })
})
