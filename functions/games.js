const admin = require('firebase-admin')

const orderedStates = [
  'Setup',
  'Countries Assigned',
  'Active',
  'Complete'
]

const startingUnits = {
  'Austria': {
    'vie': 'A',
    'bud': 'A',
    'tri': 'F'
  },
  'England': {
    'lon': 'F',
    'edi': 'F',
    'lvp': 'A'
  },
  'France': {
    'par': 'A',
    'mar': 'A',
    'bre': 'F'
  },
  'Germany': {
    'ber': 'A',
    'mun': 'A',
    'kie': 'F'
  },
  'Italy': {
    'rom': 'A',
    'ven': 'A',
    'nap': 'F'
  },
  'Russia': {
    'mos': 'A',
    'sev': 'F',
    'war': 'A',
    'stp': 'F'
  },
  'Turkey': {
    'ank': 'F',
    'con': 'A',
    'smy': 'A'
  }
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

    return {
      id: playerRef.id,
      userUID,
      email: user.email,
      name: user.displayName,
      country: game.get('countryMap')[playerRef.id],
      units: game.get('units')
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