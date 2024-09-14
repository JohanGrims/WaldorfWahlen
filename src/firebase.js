// Import the functions you need from the SDKs you need
import { getAnalytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
} from "firebase/firestore/lite";
const firebaseConfig = {
  apiKey: "AIzaSyDfrC6kukq1s9OifxVJpI72G08KO-hkiEA",
  authDomain: "waldorfwahlen.firebaseapp.com",
  projectId: "waldorfwahlen",
  storageBucket: "waldorfwahlen.appspot.com",
  messagingSenderId: "745076526387",
  appId: "1:745076526387:web:8fcefdb016238c5ca98246",
  measurementId: "G-MZBLXHY77Z",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
if (process.env.NODE_ENV === "development") {
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectAuthEmulator(auth, "http://127.0.0.1:9099");
}

export const analytics = getAnalytics(app);
export { auth, db };
