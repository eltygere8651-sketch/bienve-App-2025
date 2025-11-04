import { createClient, SupabaseClient, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { LOCAL_STORAGE_KEYS } from '../constants';

// --- INICIO DE LA CONFIGURACIÓN DE DESPLIEGUE ---
// IMPORTANTE: Para desplegar la aplicación en un dominio público (Vercel, Netlify, etc.),
// reemplaza estos valores con tu URL y clave anónima de Supabase.
// Estos valores son seguros para ser públicos en el código del cliente.
// La seguridad de los datos la gestiona Supabase a través de Row Level Security (RLS).
const DEPLOYED_SUPABASE_URL = 'https://tgkhtfhahtozehtjpghd.supabase.co';
const DEPLOYED_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRna2h0ZmhhaHRvemVodGpwZ2hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4NDE4MTIsImV4cCI6MjA3NzQxNzgxMn0.uHIa6Nf-k9pAUqpOBKWrF0GmYpK5pxzIACkPO44Or7o';
// --- FIN DE LA CONFIGURACIÓN DE DESPLIEGUE ---

export let supabase: SupabaseClient | null = null;

const isPlaceholder = (value: string) => value.startsWith('REPLACE_WITH');

export const getSupabaseConfig = (): { url: string; anonKey: string } | null => {
    // Prioridad 1: Valores incrustados para la aplicación desplegada.
    if (!isPlaceholder(DEPLOYED_SUPABASE_URL) && !isPlaceholder(DEPLOYED_SUPABASE_ANON_KEY)) {
        return { url: DEPLOYED_SUPABASE_URL, anonKey: DEPLOYED_SUPABASE_ANON_KEY };
    }

    // Prioridad 2: Configuración en LocalStorage (para configuración manual del admin en un nuevo navegador).
    const configStr = localStorage.getItem(LOCAL_STORAGE_KEYS.SUPABASE_CONFIG);
    if (configStr) {
        try {
            const config = JSON.parse(configStr);
            // Re-validamos que el objeto parseado tenga la estructura correcta.
            if (config && typeof config.url === 'string' && typeof config.anonKey === 'string') {
                 return config;
            }
        } catch (error) {
            console.error("Error parsing Supabase config from localStorage.", error);
            localStorage.removeItem(LOCAL_STORAGE_KEYS.SUPABASE_CONFIG);
        }
    }
    
    return null;
};

export const isSupabaseConfigured = (config: any): boolean => {
    if (!config) return false;
    return (
        config.url && typeof config.url === 'string' && config.url.trim() !== '' &&
        config.anonKey && typeof config.anonKey === 'string' && config.anonKey.trim() !== ''
    );
};

export const initializeSupabaseClient = (url: string, anonKey: string): boolean => {
    if (!url || !anonKey) {
        console.error("Supabase URL or anon key is missing for initialization.");
        return false;
    }
    try {
        supabase = createClient(url, anonKey);
        return true;
    } catch (error) {
        console.error("Failed to initialize Supabase client:", error);
        supabase = null;
        return false;
    }
};


export const verifySchema = async (): Promise<boolean> => {
    if (!supabase) return false;
    try {
        const tablesToVerify: { [key: string]: string } = {
            'clients': 'id',
            'loans': 'id',
            'requests': 'id',
            'accounting_entries': 'id',
            'app_meta': 'key'
        };
        
        for (const table in tablesToVerify) {
            const column = tablesToVerify[table];
            const { error } = await supabase.from(table).select(column).limit(0);
            
            // Si hay un error, y es específicamente el de "tabla no existe", la verificación falla.
            if (error && error.code === '42P01') {
                console.warn(`Schema verification failed: '${table}' table not found.`);
                return false; // La tabla no existe
            }
        }
        
        return true; // Si el bucle termina, todas las tablas existen.
    } catch (e) {
        console.error("Unexpected error during schema verification:", e);
        return false;
    }
};

export const verifyStorage = async (): Promise<boolean> => {
    if (!supabase) return false;
    try {
        // Using getBucket is a more direct and reliable way to check for bucket existence,
        // as it is not affected by RLS policies on objects within the bucket, unlike .list().
        const { error } = await supabase.storage.getBucket('documents');

        // If an error occurs, it means the bucket doesn't exist or is inaccessible.
        if (error) {
            console.warn("Storage verification failed: 'documents' bucket not found or inaccessible.");
            return false;
        }
        
        // If no error, the bucket exists.
        return true;
    } catch (e) {
        console.error("Unexpected error during storage verification:", e);
        return false;
    }
};


// --- Auth Wrappers ---
export const signUp = (email: string, password: string) => {
    if (!supabase) throw new Error("Supabase not initialized");
    return supabase.auth.signUp({ email, password });
};

export const signIn = (email: string, password: string) => {
    if (!supabase) throw new Error("Supabase not initialized");
    return supabase.auth.signInWithPassword({ email, password });
};

export const signOut = () => {
    if (!supabase) throw new Error("Supabase not initialized");
    return supabase.auth.signOut();
};

export const onAuthStateChanged = (callback: (event: AuthChangeEvent, session: Session | null) => void) => {
    if (!supabase) throw new Error("Supabase not initialized");
    return supabase.auth.onAuthStateChange(callback);
};