// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

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
const functions = getFunctions(app, "europe-west1");

if ((import.meta as any).env.MODE === "development") {
  connectFunctionsEmulator(functions, "localhost", 5001);
}

export { auth, db, functions };

