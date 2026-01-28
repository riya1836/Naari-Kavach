// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDqxGk7YGPEird8z8xSNuym5UxlR_EOTxQ",
  authDomain: "naari-kavach-8cff3.firebaseapp.com",
  projectId: "naari-kavach-8cff3",
  storageBucket: "naari-kavach-8cff3.appspot.com",
  messagingSenderId: "254524561678",
  appId: "1:254524561678:web:7df5e49ff126545fdb9f5f"
};

const app = initializeApp(firebaseConfig);

// Auth (anonymous)
const auth = getAuth(app);
signInAnonymously(auth)
  .then(() => console.log("Signed in anonymously"))
  .catch(err => console.error("Auth error:", err));

// Firestore
const db = getFirestore(app);

export { db };
