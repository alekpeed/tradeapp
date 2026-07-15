// Firebase foundation: app init, offline-first Firestore, and invisible auth.
//
// Nothing here confronts the end user. Per Principle #0 (SYNC_SPEC.md): the app
// must always open and work from the local cache even if the network or auth is
// unavailable, and the user must never see a login screen or an error dialog.
import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  getAuth,
  indexedDBLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInAnonymously,
  type Auth,
  type User
} from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore
} from 'firebase/firestore'
import { firebaseConfig } from './config'

let app: FirebaseApp | null = null
let db: Firestore | null = null
let auth: Auth | null = null

export function getFirebaseApp(): FirebaseApp {
  if (!app) app = initializeApp(firebaseConfig)
  return app
}

export function getDb(): Firestore {
  if (!db) {
    // Local-first: cache everything on-device and sync in the background, so the
    // app opens instantly and works fully offline. This is the sync engine we
    // otherwise would have hand-written — Firestore gives it to us.
    db = initializeFirestore(getFirebaseApp(), {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    })
  }
  return db
}

export function getAuthInstance(): Auth {
  if (!auth) auth = getAuth(getFirebaseApp())
  return auth
}

/**
 * Ensure a signed-in user exists — invisibly. Anonymous auth gives a durable
 * per-device identity with no login screen; the session persists across
 * restarts, so in practice this signs in only once per device. Never throws
 * into the UI: on failure it resolves `null` and callers keep working from the
 * local cache (offline-only) rather than confronting the user.
 */
export async function ensureSignedIn(): Promise<User | null> {
  const authInstance = getAuthInstance()
  try {
    await setPersistence(authInstance, indexedDBLocalPersistence)
  } catch {
    // Persistence unavailable (e.g. locked-down storage) — fall back to default.
  }
  if (authInstance.currentUser) return authInstance.currentUser
  return new Promise<User | null>((resolve) => {
    const unsubscribe = onAuthStateChanged(authInstance, (user) => {
      if (user) {
        unsubscribe()
        resolve(user)
      }
    })
    signInAnonymously(authInstance).catch(() => {
      unsubscribe()
      resolve(null)
    })
  })
}
