const admin = require('firebase-admin')

exports.createNewUser = async (user) => {
  try {
    await admin.firestore().collection('users').doc(user.uid).set({ games: [], displayName: user.displayName, email: user.email })
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

exports.getUserByID = async (id) => {
  let userRef
  try {
    userRef = admin.firestore().collection('users').doc(id)
  } catch (err) {
    console.log('failed to get user for ID', id, err)
    return null
  }

  if (!userRef) {
    console.log('user not found for ID', id)
    return null
  }

  const user = await userRef.get()
  return user.data()
}