const admin = require('firebase-admin')

const orderedStates = [
  'Setup',
  'Countries Assigned',
  'Active',
  'Complete'
]

const getByRef = async (gameRef) => {
  let game = await gameRef.get()
  let gamePlayers = await Promise.all(game.get('players').map(async playerRef => {
    let player = await playerRef.get()
    let userUID = player.get('userUID')
    let user = await admin.auth().getUser(userUID)

    return {
      id: playerRef.id,
      userUID,
      email: user.email,
      name: user.displayName,
      country: game.get('countryMap')[playerRef.id]
    }
  }))

  return {
    id: gameRef.id,
    name: game.get('name'),
    players: gamePlayers,
    currentState: game.get('currentState')
  }
}

const getByRefs = async (gameRefs) => {
  return await Promise.all(gameRefs.map(async (gameRef) => await getByRef(gameRef)))
}

module.exports = { getByRef, getByRefs }