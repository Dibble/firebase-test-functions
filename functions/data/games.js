const admin = require('firebase-admin')
const users = require('./users')

exports.getGameByID = async (gameID) => {
  let gameRef
  try {
    gameRef = admin.firestore().collection('games').doc(gameID)
  } catch (err) {
    console.log('failed to get game for ID', gameID, err)
    return null
  }

  if (!gameRef) {
    console.log('game not found for ID', gameID)
    return null
  }

  const game = await gameRef.get()
  return game.data()
}

exports.updateGameByID = async (gameID, updateData) => {
  let gameRef
  try {
    gameRef = admin.firestore().collection('games').doc(gameID)
  } catch (err) {
    console.log('failed to get game for ID', gameID, err)
    return null
  }

  if (!gameRef) {
    console.log('game not found for ID', gameID)
    return null
  }

  await gameRef.update(updateData)
  return true
}

exports.getRoundByName = async (gameID, roundName) => {
  let gameRef
  try {
    gameRef = admin.firestore().collection('games').doc(gameID)
  } catch (err) {
    console.log('failed to get game for ID', gameID, err)
    return null
  }

  if (!gameRef) {
    console.log('game not found for ID', gameID)
    return null
  }

  const rounds = await gameRef.collection('rounds').where('name', '==', roundName).limit(1).get()
  if (rounds.empty) {
    return null
  }

  return rounds.docs[0].data()
}

exports.getGamesForUser = async (uid) => {
  let user = await users.getUserByID(uid)
  if (!user) {
    return null
  }

  let gameRefs = user.games
  if (!gameRefs || gameRefs.length === 0) {
    console.log('no games found', uid)
    return []
  }

  let games = await Promise.all(gameRefs.map(async gameRef => {
    let game = await this.getGameByID(gameRef.id)
    return {
      id: gameRef.id,
      name: game.name,
      players: game.players.length
    }
  }))

  return games
}

exports.getByRef = async (gameRef) => {
  let game = await gameRef.get()
  let gamePlayers = await Promise.all(game.get('players').map(async playerRef => {
    let player = await playerRef.get()
    let userUID = player.get('userUID')
    let user = await users.getUserAuthData(userUID)
    let country = game.get('countryMap') ? game.get('countryMap')[playerRef.id] : null

    return {
      id: playerRef.id,
      userUID,
      email: user.email,
      name: user.displayName,
      country,
      units: game.get('units') ? game.get('units')[country] : null
    }
  }))

  return {
    id: gameRef.id,
    name: game.get('name'),
    players: gamePlayers,
    currentState: game.get('currentState'),
    currentRound: game.get('currentRound')
  }
}

exports.createNew = async (user, name) => {
  let userRef = user.ref
  let newGameRef
  try {
    newGameRef = await admin.firestore().collection('games').add({ name, players: [userRef], countryMap: {}, currentState: 'Setup' })
  } catch (err) {
    console.error(`error creating new game ${err}`)
    return null
  }

  let existingUserGames = user.get('games')
  let newUserGames = existingUserGames.concat([newGameRef])

  try {
    await userRef.update({ 'games': newUserGames })
  } catch (err) {
    console.error(`error updating user ${err}`)
    return null
  }

  return await this.getByRef(newGameRef)
}

exports.join = async (authUser, gameID) => {
  let gameRef
  try {
    gameRef = await admin.firestore().collection('games').doc(gameID)
  } catch (err) {
    console.log('join failed, no game found for gameID', gameID)
    return null
  }

  let user = await users.queryByUID(authUser.uid)
  if (!user) {
    return null
  }

  let userRef = user.ref

  let game = await gameRef.get()
  let existingPlayers = game.get('players')

  if (existingPlayers.length >= 7) {
    return null
  }

  if (existingPlayers.some((playerRef) => playerRef.id === user.id)) {
    return null
  }

  let newPlayers = existingPlayers.concat([userRef])
  await gameRef.update({ 'players': newPlayers })

  let existingGames = user.get('games')
  let newGames
  if (existingGames) {
    newGames = existingGames.concat([gameRef])
  } else {
    newGames = [gameRef]
  }

  await userRef.update({ 'games': newGames })

  return gameRef
}
