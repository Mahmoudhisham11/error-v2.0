import { initializeApp } from "firebase/app";
import {getFirestore} from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyCCTzBI-YAcmq7EWpGOz2zFWOAx8tO3M0Q",
  authDomain: "error-a77f4.firebaseapp.com",
  projectId: "error-a77f4",
  storageBucket: "error-a77f4.firebasestorage.app",
  messagingSenderId: "744537223978",
  appId: "1:744537223978:web:2a6a36138d5e348707e453"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app)