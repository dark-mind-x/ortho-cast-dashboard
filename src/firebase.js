// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC29465o1IhukUb5ENwzxt30Q3Z00GcSxk",
  authDomain: "smart-ortho-cast.firebaseapp.com",
  databaseURL: "https://smart-ortho-cast-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smart-ortho-cast",
  storageBucket: "smart-ortho-cast.firebasestorage.app",
  messagingSenderId: "974679042563",
  appId: "1:974679042563:web:52dda1d0a11be0d31efc36",
  measurementId: "G-246Z65X8X2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
