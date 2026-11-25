// Semua konfigurasi dibaca dari environment variable (Vite: import.meta.env.VITE_*)
const env = (typeof import.meta !== 'undefined' && import.meta.env) || {}

export const config = {
  apiUrl: env.VITE_API_URL || '',
  dataSource: env.VITE_DATA_SOURCE || 'mock',
  firebase: {
    apiKey: env.VITE_FIREBASE_API_KEY || '',
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: env.VITE_FIREBASE_APP_ID || '',
  },
}

export const isFirebaseConfigured = () => Boolean(config.firebase.apiKey && config.firebase.projectId)
