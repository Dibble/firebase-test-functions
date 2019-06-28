const admin = require('firebase-admin')

const orderedStates = [
  'Setup',
  'Countries Assigned',
  'Active',
  'Complete'
]

const startingUnits = {
  'Austria': [
    { 'location': 'Vienna', 'type': 'A' },
    { 'location': 'Budapest', 'type': 'A' },
    { 'location': 'Trieste', 'type': 'F' },
  ],
  'England': [
    { 'location': 'London', 'type': 'F' },
    { 'location': 'Edinburgh', 'type': 'F' },
    { 'location': 'Liverpool', 'type': 'A' },
  ],
  'France': [
    { 'location': 'Paris', 'type': 'A' },
    { 'location': 'Marseilles', 'type': 'A' },
    { 'location': 'Brest', 'type': 'F' },
  ],
  'Germany': [
    { 'location': 'Berlin', 'type': 'A' },
    { 'location': 'Munich', 'type': 'A' },
    { 'location': 'Kiel', 'type': 'F' },
  ],
  'Italy': [
    { 'location': 'Rome', 'type': 'A' },
    { 'location': 'Venice', 'type': 'A' },
    { 'location': 'Naples', 'type': 'F' },
  ],
  'Russia': [
    { 'location': 'Moscow', 'type': 'A' },
    { 'location': 'Sevastopol', 'type': 'F' },
    { 'location': 'Warsaw', 'type': 'A' },
    { 'location': 'St. Petersburg', 'type': 'F' },
  ],
  'Turkey': [
    { 'location': 'Ankara', 'type': 'F' },
    { 'location': 'Constantinople', 'type': 'A' },
    { 'location': 'Smyrna', 'type': 'A' },
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

const getByRefs = async (gameRefs) => {
  return await Promise.all(gameRefs.map(async (gameRef) => await getByRef(gameRef)))
}

module.exports = { getByRef, getByRefs, startGame }