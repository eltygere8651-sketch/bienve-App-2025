import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, Storage } from 'firebase/storage';
import { LOCAL_STORAGE_KEYS } from '../constants';

let app: FirebaseApp;
export let auth: Auth;
export let db: Firestore;
export let storage: Storage;

export const getFirebaseConfig = () => {
    const configStr = localStorage.getItem(LOCAL_STORAGE_KEYS.FIREBASE_CONFIG);
    return configStr ? JSON.parse(configStr) : null;
};

export const isFirebaseConfigured = (config: any): boolean => {
    return !!(config && config.apiKey && config.authDomain && config.projectId);
};

const firebaseConfig = getFirebaseConfig();

if (isFirebaseConfigured(firebaseConfig)) {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        storage = getStorage(app);
    } catch (error) {
        console.error("Error initializing Firebase:", error);
        // Clear broken config
        localStorage.removeItem(LOCAL_STORAGE_KEYS.FIREBASE_CONFIG);
    }
}

// Authentication Functions
export const signUp = (email: string, password: string) => {
    if (!auth) throw new Error("Firebase not initialized");
    return createUserWithEmailAndPassword(auth, email, password);
};

export const signIn = (email: string, password: string) => {
    if (!auth) throw new Error("Firebase not initialized");
    return signInWithEmailAndPassword(auth, email, password);
};

export { onAuthStateChanged, signOut };
