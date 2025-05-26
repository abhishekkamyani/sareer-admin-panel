import { initializeApp } from "firebase/app";
import { addDoc, collection, Firestore, getFirestore, Timestamp } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getMessaging } from "firebase/messaging";
import { users } from ".";

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
const messaging = getMessaging(app);
const auth = getAuth(app);

const adminLogin = (email, password) => {
  if (email !== import.meta.env.VITE_FIREBASE_ADMIN_EMAIL) {
    return Promise.reject(new Error("Unauthorized access"));
  }
  return signInWithEmailAndPassword(auth, email, password);
};

const adminLogout = () => signOut(auth);


// Firestore.Timestamp.fromDate()

async function seedUsers() {
  console.log(users[0].registrationDate);
  

  users.forEach(async (user) => {
    await addDoc(collection(db, 'users'), {
      ...user,
      registrationDate: Timestamp.fromDate(user.registrationDate),
      lastLogin: Timestamp.fromDate(user.lastLogin),
      purchasedBooks: user.purchasedBooks?.map(book => ({
        ...book,
        purchaseDate: Timestamp.fromDate(book.purchaseDate)
      })),
      cart: user.cart?.map(item => ({
        ...item,
        addedAt: Timestamp.fromDate(item.addedAt)
      }))
    });
  });


  console.log('All users added successfully!');
}




export { db, storage, auth, messaging, adminLogin, adminLogout, seedUsers };