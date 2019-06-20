const functions = require('firebase-functions')
const admin = require('firebase-admin')

const cors = require('cors')({ origin: true })

admin.initializeApp()

// Create and Deploy Your First Cloud Functions
// https://firebase.google.com/docs/functions/write-firebase-functions

exports.helloWorld = functions.https.onRequest((request, response) => {
  response.send("Hello from Firebase!")
})

exports.createUser = functions.auth.user().onCreate(async (user) => {
  let writeResult = await admin.firestore().collection('users').add({ userUID: user.uid })
  console.log(writeResult)
})

exports.getMyGames = functions.https.onRequest((request, response) => {
  cors(request, response, async () => {
    if (!request.headers.authorization || !request.headers.authorization.startsWith('Bearer ')) {
      response.status(401).send('Unauthorized')
      return
    }

    let user = null
    try {
      let idToken = request.headers.authorization.split('Bearer ')[1]
      user = await admin.auth().verifyIdToken(idToken)
      console.log(user)
    } catch (error) {
      console.log(`login error ${error}`)
      response.status(403).send('Unauthorized')
      return
    }

    let userQuery = await admin.firestore().collection('users').where('userUID', '==', user.uid).get()
    if (userQuery.size !== 1) {
      response.status(404).send('User not found')
      return
    }

    let gameRefs = await userQuery.docs[0].get('games')
    let games = await Promise.all(gameRefs.map(async gameRef => {
      let game = await gameRef.get()

      return {
        id: game.id,
        name: game.get('name')
      }
    }))

    response.send(games)
  })
})
