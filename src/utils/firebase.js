import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";

// require('dotenv').config()
const env = import.meta.env;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  databaseURL: env.VITE_FIREBASE_DATABASE_URL,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID
};

// console.log("Firebase Config:", firebaseConfig);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app); // Changed from Realtime Database to Firestore
const storage = getStorage(app);
const auth = getAuth(app);

const adminLogin = (email, password) => {
  if (email !== "sareerpublications@gmail.com") {
    return Promise.reject(new Error("Unauthorized access"));
  }
  return signInWithEmailAndPassword(auth, email, password);
};

const adminLogout = () => signOut(auth);

export { db, storage, auth, adminLogin, adminLogout };