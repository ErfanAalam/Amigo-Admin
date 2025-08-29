import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Initialize Firebase Admin if not already initialized
function initializeFirebaseAdmin() {
  if (!getApps().length) {
    // Check if we have the required environment variables
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
      throw new Error('Missing Firebase Admin SDK environment variables. Please check your .env.local file.');
    }

    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  }
}

// Initialize and export Firebase Admin services
export function getFirebaseAdminAuth() {
  initializeFirebaseAdmin();
  return getAuth();
}

export function getFirebaseAdminFirestore() {
  initializeFirebaseAdmin();
  return getFirestore();
}

export function getFirebaseAdminApp() {
  initializeFirebaseAdmin();
  return getApps()[0];
}

// Export FieldValue for array operations
export { FieldValue };
