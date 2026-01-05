
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
    startAfter,
    onSnapshot,
    DocumentData,
    QueryConstraint,
    getDoc,
    setDoc
} from 'firebase/firestore';
import { FIREBASE_CONFIG } from './firebaseConfig';

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: any;

export const initializeFirebase = () => {
    if (!FIREBASE_CONFIG.apiKey) return false;
    
    try {
        app = initializeApp(FIREBASE_CONFIG);
        auth = getAuth(app);
        db = getFirestore(app);
        
        // Persistence setup
        setPersistence(auth, browserLocalPersistence).catch((error) => {
            console.error("Persistence error:", error);
        });
        
        return true;
    } catch (e) {
        console.error("Firebase init error:", e);
        return false;
    }
};

export const saveFirebaseConfig = (config: any) => {
    // This function is for the setup screen to persist config if needed, 
    // but typically we use the hardcoded file. 
    // For this app structure, we rely on firebaseConfig.ts
    console.log("Config saved (simulation)", config);
};

// --- AUTH SERVICES ---

export const signIn = (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password);
};

export const signUp = (email: string, password: string) => {
    return createUserWithEmailAndPassword(auth, email, password);
};

export const signOut = () => {
    return firebaseSignOut(auth);
};

export const onAuthStateChanged = (callback: (user: User | null) => void) => {
    return firebaseOnAuthStateChanged(auth, callback);
};

// --- DATA SERVICES ---

export const subscribeToCollection = (
    collectionName: string, 
    callback: (data: any[]) => void, 
    constraints: QueryConstraint[] = [],
    onError?: (error: any) => void
) => {
    if (!db) return () => {};
    
    const q = query(collection(db, collectionName), ...constraints);
    
    return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(data);
    }, (error) => {
        console.error(`Error in snapshot listener for ${collectionName}:`, error);
        if (onError) onError(error);
    });
};

export const getCollection = async (collectionName: string, constraints: QueryConstraint[] = []) => {
    if (!db) throw new Error("Database not initialized");
    const q = query(collection(db, collectionName), ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// New helper for explicit pagination
export const getPaginatedCollection = async (
    collectionName: string, 
    constraints: QueryConstraint[] = [], 
    lastVisible: any = null,
    pageSize: number = 20
) => {
    if (!db) throw new Error("Database not initialized");
    
    let qConstraints = [...constraints, limit(pageSize)];
    if (lastVisible) {
        qConstraints = [...constraints, startAfter(lastVisible), limit(pageSize)];
    }

    const q = query(collection(db, collectionName), ...qConstraints);
    const snapshot = await getDocs(q);
    
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const newLastVisible = snapshot.docs[snapshot.docs.length - 1];
    
    return { data, lastVisible: newLastVisible, hasMore: data.length === pageSize };
};

export const addDocument = async (collectionName: string, data: any) => {
    if (!db) throw new Error("Database not initialized");
    const docRef = await addDoc(collection(db, collectionName), data);
    return { id: docRef.id, ...data };
};

export const updateDocument = async (collectionName: string, docId: string, data: any) => {
    if (!db) throw new Error("Database not initialized");
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, data);
};

export const deleteDocument = async (collectionName: string, docId: string) => {
    if (!db) throw new Error("Database not initialized");
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
};

export const setDocument = async (collectionName: string, docId: string, data: any) => {
    if (!db) throw new Error("Database not initialized");
    const docRef = doc(db, collectionName, docId);
    await setDoc(docRef, data, { merge: true }); // Upsert
    return { id: docId, ...data };
};

export const getDocument = async (collectionName: string, docId: string) => {
    if (!db) throw new Error("Database not initialized");
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
    } else {
        return null;
    }
};

export const checkClientExists = async (idNumber: string) => {
    if (!db) return false;
    // Simple check, assumes idNumber field exists
    const q = query(collection(db, 'clients'), where('idNumber', '==', idNumber));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
};

export const findRequestsById = async (idNumber: string) => {
    if (!db) return [];
    const q = query(collection(db, 'requests'), where('idNumber', '==', idNumber));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Exports for query construction in hooks
export { query, where, limit, orderBy, startAfter };
