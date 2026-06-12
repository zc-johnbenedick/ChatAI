import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB1Llv2BYLSS-ckQRIOJ8_jItQgLtTnvJc",
  authDomain: "zc-2026.firebaseapp.com",
  projectId: "zc-2026",
  storageBucket: "zc-2026.firebasestorage.app",
  messagingSenderId: "240545865751",
  appId: "1:240545865751:web:ae6816d6e71ef8e9693c52"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
// experimentalForceLongPolling can sometimes bypass browser extension network blockers
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
});

export { app, db };
