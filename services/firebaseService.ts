
import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    signOut as firebaseSignOut, 
    onAuthStateChanged as firebaseOnAuthStateChanged,
    User,
    Auth
} from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    getDocs, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    query, 
    where, 
    Firestore,
    Timestamp,
    onSnapshot
} from 'firebase/firestore';
import { FIREBASE_CONFIG } from './firebaseConfig';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

const STORAGE_KEY = 'bmContigoFirebaseConfig';

// Initialize with either hardcoded config or localStorage config
export const initializeFirebase = (config = FIREBASE_CONFIG) => {
    try {
        // Check if config is dummy
        if (config.apiKey === "TU_API_KEY_AQUI") {
            // Try load from local storage
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                config = JSON.parse(saved);
            } else {
                return false;
            }
        }

        app = initializeApp(config);
        auth = getAuth(app);
        db = getFirestore(app);
        return true;
    } catch (e) {
        console.error("Firebase init error:", e);
        return false;
    }
};

export const saveFirebaseConfig = (config: any) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    // Intentar inicializar inmediatamente
    return initializeFirebase(config);
};

export const getStoredFirebaseConfig = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
};

export const isFirebaseConfigured = () => {
    return !!app;
};

// --- AUTH ---
export const signIn = (email: string, pass: string) => {
    if (!auth) throw new Error("Firebase no inicializado");
    return signInWithEmailAndPassword(auth, email, pass);
};

export const signOut = () => {
    if (!auth) throw new Error("Firebase no inicializado");
    return firebaseSignOut(auth);
};

export const onAuthStateChanged = (cb: (user: User | null) => void) => {
    if (!auth) return () => {};
    return firebaseOnAuthStateChanged(auth, cb);
};

// --- DATABASE HELPERS ---
const mapDoc = (doc: any) => {
    const data = doc.data();
    // Convert Timestamps to ISO strings for frontend compatibility
    const converted: any = { id: doc.id, ...data };
    
    Object.keys(converted).forEach(key => {
        if (converted[key] instanceof Timestamp) {
            converted[key] = converted[key].toDate().toISOString();
        }
    });
    return converted;
};

export const getCollection = async (collectionName: string) => {
    if (!db) throw new Error("DB no inicializada");
    const q = query(collection(db, collectionName));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(mapDoc);
};

export const subscribeToCollection = (collectionName: string, callback: (data: any[]) => void) => {
    if (!db) return () => {};
    const q = query(collection(db, collectionName));
    return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(mapDoc);
        callback(data);
    });
};

export const addDocument = async (collectionName: string, data: any) => {
    if (!db) throw new Error("DB no inicializada");
    // Ensure dates are valid for Firestore or let it handle strings
    // Las imágenes ya deben venir como base64 strings dentro de `data`
    return addDoc(collection(db, collectionName), {
        ...data,
        createdAt: new Date()
    });
};

export const updateDocument = async (collectionName: string, id: string, data: any) => {
    if (!db) throw new Error("DB no inicializada");
    const docRef = doc(db, collectionName, id);
    return updateDoc(docRef, data);
};

export const deleteDocument = async (collectionName: string, id: string) => {
    if (!db) throw new Error("DB no inicializada");
    const docRef = doc(db, collectionName, id);
    return deleteDoc(docRef);
};

export const findRequestsById = async (idNumber: string) => {
    if (!db) throw new Error("DB no inicializada");
    const q = query(collection(db, 'requests'), where('idNumber', '==', idNumber));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(mapDoc);
};
