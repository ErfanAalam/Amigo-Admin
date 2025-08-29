// Example configuration file
// Copy this to config.ts and update with your values

export const config = {
  firebase: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBOvnGACw8gs2euxvd4FIUJ1GSIkTz2-UE",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "amigo-ec5be.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "amigo-ec5be",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "amigo-ec5be.firebasestorage.app",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "562549249203",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:562549249203:web:e74645c1d9b498b8850cc6",
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-MXYMFXNKFB"
  },
  jwt: {
    secret: process.env.JWT_SECRET || "your-super-secret-jwt-key-here"
  }
};
