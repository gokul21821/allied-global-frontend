import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyANsBELVUybrJ4XcijOlhFJGp9r8ZGvPJI",
  authDomain: "xpress-voice-dev.firebaseapp.com",
  projectId: "xpress-voice-dev",
  storageBucket: "xpress-voice-dev.firebasestorage.app",
  messagingSenderId: "1062923809525",
  appId: "1:1062923809525:web:51126a0b459f6572388bbc",
  measurementId: "G-84TM3B3MXD"
};
// Initialize Firebase only if it hasn't been initialized yet
// const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// DEBUG:
// console.log("🔥 ACTIVE FIREBASE APP:", getApps()[0]?.options);

export const auth = getAuth(app);
export const db = getFirestore(app);