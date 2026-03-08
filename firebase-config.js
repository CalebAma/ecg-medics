// =============================================
//   ECG Medical Portal - Firebase Configuration
//   File: firebase-config.js
//   Purpose: central Firebase initialization
// =============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";

// Actual Firebase project credentials
export const firebaseConfig = {
    apiKey: "AIzaSyCXrVnwUYHSV9EmfScUUXrdp3LqaLPHl_E",
    authDomain: "ecg-medics.firebaseapp.com",
    projectId: "ecg-medics",
    storageBucket: "ecg-medics.firebasestorage.app",
    messagingSenderId: "295869082888",
    appId: "1:295869082888:web:10ff6a02805834b9c590bd",
    measurementId: "G-LH1HL6XS74"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);

