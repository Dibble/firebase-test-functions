const admin = require('firebase-admin')

const orderedStates = [
  'Setup',
  'Countries Assigned',
  'Active',
  'Complete'
]

const startingUnits = {
  'Austria': [
    { 'location': 'vie', 'type': 'A' },
    { 'location': 'bud', 'type': 'A' },
    { 'location': 'tri', 'type': 'F' }
  ],
  'England': [
    { 'location': 'lon', 'type': 'F' },
    { 'location': 'edi', 'type': 'F' },
    { 'location': 'lvp', 'type': 'A' }
  ],
  'France': [
    { 'location': 'par', 'type': 'A' },
    { 'location': 'mar', 'type': 'A' },
    { 'location': 'bre', 'type': 'F' }
  ],
  'Germany': [
    { 'location': 'ber', 'type': 'A' },
    { 'location': 'mun', 'type': 'A' },
    { 'location': 'kie', 'type': 'F' }
  ],
  'Italy': [
    { 'location': 'rom', 'type': 'A' },
    { 'location': 'ven', 'type': 'A' },
    { 'location': 'nap', 'type': 'F' }
  ],
  'Russia': [
    { 'location': 'mos', 'type': 'A' },
    { 'location': 'sev', 'type': 'F' },
    { 'location': 'war', 'type': 'A' },
    { 'location': 'stp', 'type': 'F' }
  ],
  'Turkey': [
    { 'location': 'ank', 'type': 'F' },
    { 'location': 'con', 'type': 'A' },
    { 'location': 'smy', 'type': 'A' }
  ]
}

const startGame = async (gameRef) => {
  await gameRef.update({
    'currentState': 'Active',
    'currentRound': 'Spring 1901',
    'units': startingUnits
  })
}

const getByRef = async (gameRef) => {
  let game = await gameRef.get()
  let gamePlayers = await Promise.all(game.get('players').map(async playerRef => {
    let player = await playerRef.get()
    let userUID = player.get('userUID')
    let user = await admin.auth().getUser(userUID)
    let country = game.get('countryMap')[playerRef.id]

    return {
      id: playerRef.id,
      userUID,
      email: user.email,
      name: user.displayName,
      country,
      units: game.get('units')[country]
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

const getByRefs = async (gameRefs) => {
  return await Promise.all(gameRefs.map(async (gameRef) => await getByRef(gameRef)))
}

module.exports = { getByRef, getByRefs, startGame }