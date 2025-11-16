// If you haven’t yet installed Firebase, run:
// 👉 npm install firebase

import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
const firebaseConfig = {
  apiKey: "AIzaSyA_UhQ_KlCsoCmRlda_S2RrUv6QhGo0c_0",
  authDomain: "internet-of-tsiken.firebaseapp.com",
  projectId: "internet-of-tsiken",
  storageBucket: "internet-of-tsiken.firebasestorage.app",
  messagingSenderId: "998028163151",
  appId: "1:998028163151:web:ce0864acced24f37d7d23a",
  measurementId: "G-W7495LQB4J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Analytics
const analytics = getAnalytics(app);

// Initialize Firebase Authentication and Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
