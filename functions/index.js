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

    try {
      let idToken = request.headers.authorization.split('Bearer ')[1]
      let user = await admin.auth().verifyIdToken(idToken)
      console.log(user)
    } catch (error) {
      console.log(`login error ${error}`)
      response.status(403).send('Unauthorized')
      return
    }

    response.send('games listed here')
  })
})
