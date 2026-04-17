/* ============================================
   AppleVault - Firebase Bootstrap Module
   Browser-only Firebase setup for auth flows.
   ============================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  signOut,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

// Option 1 (recommended): define window.APPLEVAULT_FIREBASE_CONFIG before loading modules.
// Option 2: replace the placeholders below with your Firebase project's web config.
const fallbackConfig = {
  apiKey: "AIzaSyDUDIdsxSqJ08-Gq9FpV-vgdGUnuST6mK8",
  authDomain: "apple-storefront.firebaseapp.com",
  projectId: "apple-storefront",
  storageBucket: "apple-storefront.firebasestorage.app",
  messagingSenderId: "218033387040",
  appId: "1:218033387040:web:ca323531bd9432825dae45",
  measurementId: "G-D9YQSDN83C",
};

const firebaseConfig = window.APPLEVAULT_FIREBASE_CONFIG || fallbackConfig;

function isPlaceholder(value) {
  return String(value || "").includes("YOUR_");
}

function isFirebaseConfigured(config) {
  const required = ["apiKey", "authDomain", "projectId", "appId"];
  return required.every((key) => {
    const value = config?.[key];
    return typeof value === "string" && value.trim() && !isPlaceholder(value);
  });
}

let firebaseApp = null;
let firebaseAuth = null;

if (isFirebaseConfigured(firebaseConfig)) {
  firebaseApp = initializeApp(firebaseConfig);
  firebaseAuth = getAuth(firebaseApp);
}

function getFirebaseAuth() {
  if (!firebaseAuth) {
    throw new Error(
      "Firebase auth is not configured. Set window.APPLEVAULT_FIREBASE_CONFIG or update js/firebase.js.",
    );
  }
  return firebaseAuth;
}

export {
  getFirebaseAuth,
  isFirebaseConfigured,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  signOut,
  updateProfile,
};
