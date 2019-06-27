const functions = require('firebase-functions')
const admin = require('firebase-admin')

const cors = require('cors')({ origin: true })

const { authenticateRequest } = require('./auth')

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

    let games = await Promise.all(gameRefs.map(async gameRef => {
      let game = await gameRef.get()
      let gamePlayers = await Promise.all(game.get('players').map(async playerRef => {
        let player = await playerRef.get()
        return {
          id: playerRef.id,
          name: player.get('displayName')
        }
      }))

      return {
        id: game.id,
        name: game.get('name'),
        players: gamePlayers
      }
    }))

    response.status(200).send(games)
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
    console.log(`game name ${gameName}`)
    let userQuery = await admin.firestore().collection('users').where('userUID', '==', user.uid).get()
    if (userQuery.size !== 1) {
      console.error(`found multiple users for UID ${user.uid}`)
      response.status(500).send('duplicate users found')
      return
    }

    let userRef = userQuery.docs[0].ref
    console.log(`userRef ${userRef}`)

    let newGameRef
    try {
      newGameRef = await admin.firestore().collection('games').add({ name: gameName, players: [userRef] })
    } catch (err) {
      console.error(`error creating new game ${err}`)
      response.status(500).send('error creating new game')
    }

    console.log(`newGameRef ${newGameRef}`)

    let existingUserGames = userQuery.docs[0].get('games')
    let newUserGames = existingUserGames.concat([newGameRef])
    console.log(newUserGames)

    try {
      await userRef.update({ 'games': newUserGames })
    } catch (err) {
      console.error(`error updating user ${err}`)
    }

    response.status(201).send(JSON.stringify({ id: newGameRef.id, name: gameName }))
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
    console.log(currentUserQuery)
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

    response.status(200).send('done')
  })
})
