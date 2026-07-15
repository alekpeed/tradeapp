// Public Firebase web config for the tradeapp project (tradeapp-911ca).
//
// This is intentionally committed. A Firebase web config is NOT a secret — it
// only identifies the project and is meant to ship inside the client app.
// Access is enforced by Firebase Auth + Firestore Security Rules, never by
// hiding these values. (Contrast with the GitHub token, which IS a secret.)
export const firebaseConfig = {
  apiKey: 'AIzaSyClDKJR2sUlutzWcsLU-fYUmtrjcbhoPJI',
  authDomain: 'tradeapp-911ca.firebaseapp.com',
  projectId: 'tradeapp-911ca',
  storageBucket: 'tradeapp-911ca.firebasestorage.app',
  messagingSenderId: '583080019581',
  appId: '1:583080019581:web:dc17121d74ac6468489314'
} as const
