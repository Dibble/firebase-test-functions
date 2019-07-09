const admin = require('firebase-admin')

exports.getUserAuthData = async (uid) => {
  let user
  try {
    user = await admin.auth().getUser(uid)
  } catch (err) {
    console.log('failed to get user by uid', uid)
    return null
  }

  return {
    email: user.email,
    displayName: user.displayName,
  }
}

exports.createNewUser = async (user) => {
  try {
    await admin.firestore().collection('users').add({ userUID: user.uid, games: [], displayName: user.displayName })
    return true
  } catch (err) {
    console.log('failed to create new user', err)
    return false
  }
}

exports.queryByUID = async (uid) => {
  let userQuery = await admin.firestore().collection('users').where('userUID', '==', uid).get()
  if (userQuery.size !== 1) {
    console.error('user not found for uid', uid)
    return null
  }

  return userQuery.docs[0]
}