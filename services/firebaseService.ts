
import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut, 
    onAuthStateChanged as firebaseOnAuthStateChanged,
    signInAnonymously,
    setPersistence,
    browserLocalPersistence,
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
    limit,
    orderBy,
    Firestore,
    Timestamp,
    onSnapshot,
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager,
    QueryConstraint
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
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                config = JSON.parse(saved);
            } else {
                return false;
            }
        }

        app = initializeApp(config);
        auth = getAuth(app);
        
        // FORZAR PERSISTENCIA LOCAL: Esto asegura que el login se guarde al cerrar el navegador
        setPersistence(auth, browserLocalPersistence).catch(error => {
            console.error("Error setting persistence:", error);
        });
        
        // OPTIMIZACIÓN: Inicializar Firestore con caché persistente
        try {
            db = initializeFirestore(app, {
                localCache: persistentLocalCache({
                    tabManager: persistentMultipleTabManager()
                })
            });
        } catch (e) {
            // Fallback for environments where persistence might fail
            db = getFirestore(app);
        }

        return true;
    } catch (e) {
        console.error("Firebase init error:", e);
        return false;
    }
};

export const saveFirebaseConfig = (config: any) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
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

export const signUp = (email: string, pass: string) => {
    if (!auth) throw new Error("Firebase no inicializado");
    return createUserWithEmailAndPassword(auth, email, pass);
};

export const signOut = () => {
    if (!auth) throw new Error("Firebase no inicializado");
    return firebaseSignOut(auth);
};

export const onAuthStateChanged = (cb: (user: User | null) => void) => {
    if (!auth) return () => {};
    return firebaseOnAuthStateChanged(auth, cb);
};

export const ensurePublicAuth = async () => {
    if (!auth) throw new Error("Firebase no inicializado");
    if (!auth.currentUser) {
        await signInAnonymously(auth);
    }
};

// --- DATABASE HELPERS ---
const mapDoc = (doc: any) => {
    const data = doc.data();
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

// OPTIMIZACIÓN: Ahora acepta restricciones (limit, orderBy) para no descargar toda la BD
export const subscribeToCollection = (
    collectionName: string, 
    callback: (data: any[]) => void,
    constraints: QueryConstraint[] = [],
    onError?: (error: any) => void
) => {
    if (!db) return () => {};
    
    const q = query(collection(db, collectionName), ...constraints);
    
    return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(mapDoc);
        callback(data);
    }, (error) => {
        console.error(`Error subscribing to ${collectionName}:`, error);
        if (onError) onError(error);
    });
};

const cleanData = (data: any) => {
    const cleaned: any = {};
    Object.keys(data).forEach(key => {
        if (data[key] !== undefined) {
            cleaned[key] = data[key];
        } else {
            cleaned[key] = null;
        }
    });
    return cleaned;
};

export const addDocument = async (collectionName: string, data: any) => {
    if (!db) throw new Error("DB no inicializada");
    await ensurePublicAuth();
    return addDoc(collection(db, collectionName), {
        ...cleanData(data),
        createdAt: new Date()
    });
};

export const updateDocument = async (collectionName: string, id: string, data: any) => {
    if (!db) throw new Error("DB no inicializada");
    const docRef = doc(db, collectionName, id);
    return updateDoc(docRef, cleanData(data));
};

export const deleteDocument = async (collectionName: string, id: string) => {
    if (!db) throw new Error("DB no inicializada");
    const docRef = doc(db, collectionName, id);
    return deleteDoc(docRef);
};

export const findRequestsById = async (idNumber: string) => {
    if (!db) throw new Error("DB no inicializada");
    await ensurePublicAuth();
    const q = query(collection(db, 'requests'), where('idNumber', '==', idNumber));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(mapDoc);
};

export const testConnection = async () => {
    if (!db) return false;
    try {
        await ensurePublicAuth();
        const docRef = await addDoc(collection(db, 'diagnostics'), {
            test: true,
            timestamp: new Date()
        });
        await deleteDoc(docRef);
        return true;
    } catch (e) {
        console.error("Connection Test Failed:", e);
        return false;
    }
};
