const admin = require('firebase-admin')

const auth = async (request, response, httpHandler) => {
  if (!request.headers.authorization || !request.headers.authorization.startsWith('Bearer ')) {
    response.status(401).send('Unauthorized')
    return
  }

  let user = null
  try {
    let idToken = request.headers.authorization.split('Bearer ')[1]
    user = await admin.auth().verifyIdToken(idToken)
  } catch (error) {
    console.log(`login error ${error}`)
    response.status(403).send('Unauthorized')
    return
  }

  await httpHandler(user)
}

module.exports = { auth }