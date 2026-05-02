import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics"; // Add this line
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Initialize Services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const analytics = getAnalytics(app); // Add this line

// Your existing connection test...
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Connected to Firebase successfully!");
  } catch (error) {
    console.error("Firebase connection failed. Check your Console settings.");
  }
}

testConnection();