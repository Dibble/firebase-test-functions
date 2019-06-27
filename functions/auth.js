const admin = require('firebase-admin')

const authenticateRequest = async (request) => {
  if (!request.headers.authorization || !request.headers.authorization.startsWith('Bearer ')) {
    return {
      success: false,
      errorStatus: 401
    }
  }

  let user = null
  try {
    let idToken = request.headers.authorization.split('Bearer ')[1]
    user = await admin.auth().verifyIdToken(idToken)
  } catch (error) {
    console.log(`login error ${error}`)
    return {
      success: false,
      errorStatus: 403
    }
  }

  return {
    success: true,
    user
  }
}

module.exports = { authenticateRequest }