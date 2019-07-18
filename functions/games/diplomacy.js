const games = require('../data/games')
const users = require('../data/users')

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
    { 'location': 'St. Petersburg (SC)', 'type': 'F' },
  ],
  'Turkey': [
    { 'location': 'Ankara', 'type': 'F' },
    { 'location': 'Constantinople', 'type': 'A' },
    { 'location': 'Smyrna', 'type': 'A' },
  ]
}

const gameStates = [
  'Setup',
  'Countries Assigned',
  'Active',
  'Complete'
]

const countries = [
  'Austria',
  'England',
  'France',
  'Germany',
  'Italy',
  'Russia',
  'Turkey'
]

exports.startGame = async (gameID) => {
  const gameData = await games.getGameByID(gameID)
  if (gameData && gameData.currentState && gameData.currentState === 'Countries Assigned') {
    await games.updateGameByID(gameID, {
      'currentState': 'Active',
      'currentRound': 'Spring 1901',
      'units': startingUnits
    })
  }
}

exports.getGameData = async (gameID) => {
  const gameData = await games.getGameByID(gameID)
  if (!gameData) {
    return null
  }

  let gamePlayers = await Promise.all(gameData.players.map(async playerRef => {
    let player = await playerRef.get()
    let userUID = player.get('userUID')
    let user = await users.getUserAuthData(userUID)
    let country = gameData.countryMap ? gameData.countryMap[playerRef.id] : null

    return {
      id: playerRef.id,
      userUID,
      email: user.email,
      name: user.displayName,
      country,
      units: gameData.units ? gameData.units[country] : null
    }
  }))

  return {
    id: gameID,
    name: gameData.name,
    players: gamePlayers,
    currentState: gameData.currentState,
    currentRound: gameData.currentRound
  }
}

exports.assignCountries = async (gameID) => {
  const gameData = await games.getGameByID(gameID)
  if (!gameData) {
    return false
  }

  if (gameData.currentState !== 'Setup') {
    return false
  }

  let unassignedCountries = Array.from(countries)
  let countryMap = {}
  for (let i = 0; i < gameData.players.length; i++) {
    let countryIndex = Math.floor(Math.random() * unassignedCountries.length)
    countryMap[players[i].id] = unassignedCountries[countryIndex]

    unassignedCountries.splice(countryIndex, 1)
  }

  await games.updateGameByID(gameID, { countryMap, currentState: 'Countries Assigned' })
  return true
}