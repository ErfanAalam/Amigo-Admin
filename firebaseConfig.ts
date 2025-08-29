import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBOvnGACw8gs2euxvd4FIUJ1GSIkTz2-UE",
  authDomain: "amigo-ec5be.firebaseapp.com",
  projectId: "amigo-ec5be",
  storageBucket: "amigo-ec5be.firebasestorage.app",
  messagingSenderId: "562549249203",
  appId: "1:562549249203:web:e74645c1d9b498b8850cc6",
  measurementId: "G-MXYMFXNKFB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
