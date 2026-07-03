/**
 * Firebase Admin SDK — server-side token verification.
 */

import admin from 'firebase-admin'

let initialized = false

function ensureInitialized() {
  if (initialized) return true
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    try {
      if (admin.apps.length === 0) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          }),
        })
      }
      initialized = true
      return true
    } catch (err) {
      console.error('[firebase-admin] Init failed:', err)
      return false
    }
  }
  return false
}

export async function verifyFirebaseToken(idToken: string) {
  if (!ensureInitialized()) return null
  try {
    const decoded = await admin.auth().verifyIdToken(idToken)
    return {
      uid: decoded.uid,
      email: decoded.email || '',
      name: decoded.name,
      picture: decoded.picture,
    }
  } catch (err) {
    console.error('[firebase-admin] Token verification failed:', err)
    return null
  }
}
