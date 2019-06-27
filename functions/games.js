const getByRef = async (gameRef) => {
  let game = await gameRef.get()
  let gamePlayers = await Promise.all(game.get('players').map(async playerRef => {
    let player = await playerRef.get()
    return {
      id: playerRef.id,
      name: player.get('displayName')
    }
  }))

  return {
    id: gameRef.id,
    name: game.get('name'),
    players: gamePlayers
  }
}

const getByRefs = async (gameRefs) => {
  return await Promise.all(gameRefs.map(async (gameRef) => await getByRef(gameRef)))
}

module.exports = { getByRefs }