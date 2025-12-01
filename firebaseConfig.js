import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
    getAuth,
    getReactNativePersistence,
    initializeAuth
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// --- CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyDDseQLasErIFRwzkulqIF4TRe7Ox_IXmY",
  authDomain: "headsup-cab4e.firebaseapp.com",
  projectId: "headsup-cab4e",
  storageBucket: "headsup-cab4e.firebasestorage.app",
  messagingSenderId: "409660603005",
  appId: "1:409660603005:web:d4915654188dfbd9ee8f14",
  measurementId: "G-VZWVWER21S"
};

// --- INITIALIZE FIREBASE (Singleton Pattern) ---
let app, auth, db;

if (getApps().length > 0) {
  // App is already running, reuse instance
  app = getApp();
  auth = getAuth(app);
  db = getFirestore(app);
} else {
  // App is fresh, initialize it
  app = initializeApp(firebaseConfig);
  // Initialize Auth with Persistence
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
  // Initialize Firestore
  db = getFirestore(app);
}

export { auth, db };
