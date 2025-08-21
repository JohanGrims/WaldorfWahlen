// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "firebase/app-check";
import { initializeConfig, getSchoolConfig, type SchoolConfig } from "./config";

declare global {
  interface Window {
    FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean;
  }

  interface ImportMeta {
    env: {
      [key: string]: string | boolean | undefined;
      VITE_APP_CHECK_DEBUG_TOKEN_FROM_CI?: string;
      VITE_SCHOOL_ID?: string;
    };
  }
}

// Default config for fallback (current waldorfwahlen config)
const defaultFirebaseConfig = {
  apiKey: "AIzaSyDfrC6kukq1s9OifxVJpI72G08KO-hkiEA",
  authDomain: "waldorfwahlen.firebaseapp.com",
  projectId: "waldorfwahlen",
  storageBucket: "waldorfwahlen.appspot.com",
  messagingSenderId: "745076526387",
  appId: "1:745076526387:web:8fcefdb016238c5ca98246",
  measurementId: "G-MZBLXHY77Z",
};

// Get Firebase config from school configuration
const getFirebaseConfig = () => {
  try {
    const schoolConfig = initializeConfig();
    return schoolConfig.firebase;
  } catch (error) {
    console.warn("Failed to load school config, using default:", error);
    return defaultFirebaseConfig;
  }
};

// Get current school configuration for exports
const getCurrentSchoolConfig = () => {
  return getSchoolConfig();
};

// Initialize Firebase with school-specific config
const firebaseConfig = getFirebaseConfig();
const app = initializeApp(firebaseConfig);

// Get AppCheck site key from school config
let siteKey = "6LfNXNoqAAAAABF77vNghbzVpS2ROyICcK0AJ7Zb"; // default
try {
  const schoolConfig = getSchoolConfig();
  siteKey = schoolConfig.appCheck.siteKey;
} catch (error) {
  console.warn("Using default AppCheck site key");
}

// Initialize AppCheck
if (window.location.hostname === "localhost") {
  window.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

if (import.meta.env.VITE_APP_CHECK_DEBUG_TOKEN_FROM_CI) {
  window.FIREBASE_APPCHECK_DEBUG_TOKEN =
    import.meta.env.VITE_APP_CHECK_DEBUG_TOKEN_FROM_CI;
}

const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider(siteKey),
  isTokenAutoRefreshEnabled: true,
});

const db = getFirestore(app);
const auth = getAuth(app);

// Export Firebase instances and utilities
export { auth, db, appCheck, getFirebaseConfig, getCurrentSchoolConfig };
export type { SchoolConfig } from "./config";
