const functions = require('firebase-functions')
const admin = require('firebase-admin')

const cors = require('cors')({ origin: true })

const { authenticateRequest } = require('./auth')
const games = require('./games')

admin.initializeApp()

exports.createUser = functions.auth.user().onCreate(async (user) => {
  let writeResult = await admin.firestore().collection('users').add({ userUID: user.uid, games: [], displayName: user.displayName })
  console.log(writeResult)
})

exports.getMyGames = functions.region('europe-west2').https.onRequest((request, response) => {
  cors(request, response, async () => {
    const { success, errorStatus, user } = await authenticateRequest(request)
    if (!success) {
      response.status(errorStatus).send('Unauthorized')
      return
    }

    let userQuery = await admin.firestore().collection('users').where('userUID', '==', user.uid).get()
    if (userQuery.size !== 1) {
      response.status(404).send('User not found')
      return
    }

    let gameRefs = await userQuery.docs[0].get('games')
    if (!gameRefs || gameRefs.length === 0) {
      console.log('no games found')
      response.status(200).send([])
      return
    }

    response.status(200).send(await games.getByRefs(gameRefs))
  })
})

exports.createGame = functions.region('europe-west2').https.onRequest((request, response) => {
  cors(request, response, async () => {
    const { success, errorStatus, user } = await authenticateRequest(request)
    if (!success) {
      response.status(errorStatus).send('Unauthorized')
      return
    }

    let gameName = request.body.name
    let userQuery = await admin.firestore().collection('users').where('userUID', '==', user.uid).get()
    if (userQuery.size !== 1) {
      console.error(`found multiple users for UID ${user.uid}`)
      response.status(500).send('duplicate users found')
      return
    }

    let userRef = userQuery.docs[0].ref
    let newGameRef
    try {
      newGameRef = await admin.firestore().collection('games').add({ name: gameName, players: [userRef], countryMap: {} })
    } catch (err) {
      console.error(`error creating new game ${err}`)
      response.status(500).send('error creating new game')
    }

    let existingUserGames = userQuery.docs[0].get('games')
    let newUserGames = existingUserGames.concat([newGameRef])

    try {
      await userRef.update({ 'games': newUserGames })
    } catch (err) {
      console.error(`error updating user ${err}`)
    }

    let createdGame = await games.getByRef(newGameRef)
    response.status(201).send(createdGame)
  })
})

exports.joinGame = functions.region('europe-west2').https.onRequest((request, response) => {
  cors(request, response, async () => {
    const { success, errorStatus, user } = await authenticateRequest(request)
    if (!success) {
      response.status(errorStatus).send('Unauthorized')
      return
    }

    let gameID = request.body.gameID
    let gameRef = await admin.firestore().collection('games').doc(gameID)

    let currentUserQuery = await admin.firestore().collection('users').where('userUID', '==', user.uid).get()
    if (currentUserQuery.size !== 1) {
      console.log('failed to find user in DB')
      response.status(500).send('failed to find user')
      return
    }

    let currentUser = currentUserQuery.docs[0]
    let currentUserRef = currentUser.ref

    let game = await gameRef.get()
    let existingPlayers = game.get('players')
    let newPlayers = existingPlayers.concat([currentUserRef])
    await gameRef.update({ 'players': newPlayers })

    let existingGames = currentUser.get('games')
    let newGames
    if (existingGames) {
      newGames = existingGames.concat([gameRef])
    } else {
      newGames = [gameRef]
    }

    await currentUserRef.update({ 'games': newGames })

    response.status(200).send(await games.getByRef(gameRef))
  })
})

exports.getGameDetail = functions.region('europe-west2').https.onRequest((request, response) => {
  cors(request, response, async () => {
    const { success, errorStatus } = await authenticateRequest(request)
    if (!success) {
      response.status(errorStatus).send('Unauthorized')
      return
    }

    let gameId = request.query.id
    console.log(gameId)
    let gameRef = admin.firestore().collection('games').doc(gameId)

    if (!gameRef) {
      console.log('game not found', gameId)
      response.status(404).send('Not Found')
      return
    }

    let gameDetail = await games.getByRef(gameRef)
    response.status(200).send(gameDetail)
  })
})
