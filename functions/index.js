const functions = require('firebase-functions')
const admin = require('firebase-admin')

const cors = require('cors')({ origin: true })

const { auth } = require('./auth')
const games = require('./data/games')
const users = require('./data/users')
const diplomacy = require('./games/diplomacy')

admin.initializeApp()

exports.createUser = functions.region('europe-west2').auth.user().onCreate(users.createNewUser)

exports.getMyGames = functions.region('europe-west2').https.onRequest((request, response) => {
  cors(request, response, async () => {
    await auth(request, response, async ({ uid }) => {
      let myGames = await games.getGamesForUser(uid)
      if (!myGames) {
        response.status(500).send('failed to get games')
        return
      }

      response.status(200).send(myGames)
    })
  })
})

exports.createGame = functions.region('europe-west2').https.onRequest((request, response) => {
  cors(request, response, async () => {
    await auth(request, response, async ({ uid }) => {
      let gameName = request.body.name
      let user = await users.queryByUID(uid)
      if (!user) {
        response.status(500).send('duplicate users found')
        return
      }

      let createdGame = await games.createNew(user, gameName)
      response.status(201).send(createdGame)
    })
  })
})

exports.joinGame = functions.region('europe-west2').https.onRequest((request, response) => {
  cors(request, response, async () => {
    await auth(request, response, async (user) => {
      const gameID = request.body.gameID
      const gameRef = await games.join(user, gameID)
      if (!gameRef) {
        response.status(500).status('failed to join game')
        return
      }

      response.status(200).send(await games.getByRef(gameRef))
    })
  })
})

exports.getGameDetail = functions.region('europe-west2').https.onRequest((request, response) => {
  cors(request, response, async () => {
    await auth(request, response, async () => {
      let gameId = request.query.id
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
})

exports.assignCountries = functions.region('europe-west2').https.onRequest((request, response) => {
  cors(request, response, async () => {
    await auth(request, response, async () => {
      const gameId = request.body.gameID
      console.log(request.body, gameId)
      const gameRef = admin.firestore().collection('games').doc(gameId)
      if (!gameRef) {
        console.log('game not found', gameId)
        response.status(400).send('game not found')
        return
      }

      const game = await gameRef.get()
      let players = game.get('players')
      let unassignedCountries = ['Austria', 'England', 'France', 'Germany', 'Italy', 'Russia', 'Turkey']

      let countryMap = {}
      for (let i = 0; i < players.length; i++) {
        let countryIndex = Math.floor(Math.random() * unassignedCountries.length)
        countryMap[players[i].id] = unassignedCountries[countryIndex]

        unassignedCountries.splice(countryIndex, 1)
      }
      console.log(JSON.stringify(countryMap))

      await gameRef.update({ 'countryMap': countryMap, currentState: 'Countries Assigned' })
      let updatedGame = await games.getByRef(gameRef)

      response.status(200).send(updatedGame)
    })
  })
})

exports.startGame = functions.region('europe-west2').https.onRequest((request, response) => {
  cors(request, response, async () => {
    await auth(request, response, async () => {
      const gameID = request.body.gameID
      await diplomacy.startGame(gameID)

      response.status(200).send(await diplomacy.getGameData(gameID))
    })
  })
})

exports.submitOrders = functions.region('europe-west2').https.onRequest((request, response) => {
  cors(request, response, async () => {
    await auth(request, response, async () => {
      const { gameID, round, orders } = request.body
      const gameRef = admin.firestore().collection('games').doc(gameID)
      if (!gameRef) {
        console.log('game not found', gameId)
        response.status(400).send('game not found')
        return
      }
      console.log('gameRef', gameRef)

      // TODO validate orders
      const roundQuery = await gameRef.collection('rounds').where('name', '==', round).get()
      if (roundQuery.size !== 1) {
        console.log('failed to find round in DB', gameID, round)
        response.status(400).send('failed to find round')
        return
      }
      console.log('roundQuery', roundQuery)

      let roundDoc = roundQuery.docs[0]
      let roundRef = roundDoc.ref

      const existingOrders = roundDoc.get('orders')
      console.log('existingOrders', existingOrders)
      let updatedOrders = Object.assign({}, existingOrders, orders)
      console.log('updatedOrders', updatedOrders)
      await roundRef.update({ orders: updatedOrders })

      response.status(200).send('')
    })
  })
})

exports.getOrderDetail = functions.region('europe-west2').https.onRequest((request, response) => {
  cors(request, response, async () => {
    await auth(request, response, async ({ uid }) => {
      const gameID = request.query.gameID
      const gameRef = admin.firestore().collection('games').doc(gameID)
      if (!gameRef) {
        console.log('game not found', gameId)
        response.status(400).send('game not found')
        return
      }

      const game = await gameRef.get()
      if (game.get('currentState') !== 'Active') {
        response.status(400).send('game not active, orders not available')
        return
      }

      const currentRound = game.get('currentRound')
      const roundQuery = await gameRef.collection('rounds').where('name', '==', currentRound).get()
      if (roundQuery.size !== 1) {
        console.log('failed to find round in DB', gameID, round)
        response.status(500).send('failed to find round')
        return
      }
      const round = roundQuery.docs[0]

      let user = await users.queryByUID(uid)
      if (!user) {
        response.status(500).send('failed to find user')
        return
      }

      const playerCountry = game.get('countryMap')[user.id]
      const playerOrders = round.get('orders')[playerCountry]

      const result = {
        orders: playerOrders,
        country: playerCountry,
        round: currentRound
      }

      response.status(200).send(result)
    })
  })
})
