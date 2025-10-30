import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, Storage } from 'firebase/storage';
import { LOCAL_STORAGE_KEYS } from '../constants';

// Declare service variables as nullable `let`s, they will be populated by initializeFirebase.
let app: FirebaseApp | null = null;
export let auth: Auth | null = null;
export let db: Firestore | null = null;
export let storage: Storage | null = null;

export const getFirebaseConfig = () => {
    const configStr = localStorage.getItem(LOCAL_STORAGE_KEYS.FIREBASE_CONFIG);
    if (!configStr) {
        return null;
    }
    try {
        return JSON.parse(configStr);
    } catch (error) {
        console.error("Error parsing Firebase config from localStorage. It might be corrupted.", error);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.FIREBASE_CONFIG);
        return null;
    }
};

export const isFirebaseConfigured = (config: any): boolean => {
    const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
    if (!config) return false;
    return requiredKeys.every(key => config[key] && typeof config[key] === 'string' && config[key].trim() !== '');
};

/**
 * Initializes the Firebase app and services.
 * This function is designed to be called once at app startup.
 * It is safe to call this function multiple times; it will only initialize once.
 * @param config The Firebase configuration object.
 * @returns {boolean} True if initialization was successful, false otherwise.
 */
export const initializeFirebase = (config: any): boolean => {
    // If app is already initialized, we can assume success and return early.
    if (app) {
        return true;
    }

    try {
        if (!isFirebaseConfigured(config)) {
            throw new Error("Firebase config object is invalid or incomplete.");
        }
        // Initialize services and assign them to the module-level variables.
        app = initializeApp(config);
        auth = getAuth(app);
        db = getFirestore(app);
        storage = getStorage(app);
        return true; // Indicate success
    } catch (error) {
        console.error("CRITICAL: Firebase initialization failed. This is likely due to an invalid configuration object.", error);
        
        // Clear broken config to prevent a crash loop
        localStorage.removeItem(LOCAL_STORAGE_KEYS.FIREBASE_CONFIG);

        // Explicitly set service variables to null on failure to prevent partial initialization states.
        app = null;
        auth = null;
        db = null;
        storage = null;
        
        return false; // Indicate failure
    }
};


/**
 * Extracts the storage path from a Firebase download URL.
 * Firebase download URLs contain the bucket and path, but the ref() function needs just the path.
 * @param {string} url The full download URL from Firebase Storage.
 * @returns {string} The decoded storage path for use with ref().
 */
export const getPathFromUrl = (url: string): string | null => {
    try {
        const urlObject = new URL(url);
        const pathWithQuery = urlObject.pathname.split('/o/')[1];
        if (pathWithQuery) {
            const encodedPath = pathWithQuery.split('?')[0];
            return decodeURIComponent(encodedPath);
        }
        return null;
    } catch (e) {
        console.error("Could not parse URL to get storage path:", e);
        return null;
    }
};

// Authentication Functions - now check if auth is initialized
export const signUp = (email: string, password: string) => {
    if (!auth) throw new Error("Firebase not initialized");
    return createUserWithEmailAndPassword(auth, email, password);
};

export const signIn = (email: string, password: string) => {
    if (!auth) throw new Error("Firebase not initialized");
    return signInWithEmailAndPassword(auth, email, password);
};

export { onAuthStateChanged, signOut };