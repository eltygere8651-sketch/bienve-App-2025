import { createClient, SupabaseClient, AuthChangeEvent, Session } from '@supabase/supabase-js';

// --- INICIO DE LA CONFIGURACIÓN DE DESPLIEGUE ---
// La aplicación está ahora pre-configurada para usar estas credenciales de Supabase.
// La seguridad de los datos la gestiona Supabase a través de Row Level Security (RLS).
const DEPLOYED_SUPABASE_URL = 'https://tgkhtfhahtozehtjpghd.supabase.co';
const DEPLOYED_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRna2h0ZmhhaHRvemVodGpwZ2hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4NDE4MTIsImV4cCI6MjA3NzQxNzgxMn0.uHIa6Nf-k9pAUqpOBKWrF0GmYpK5pxzIACkPO44Or7o';
// --- FIN DE LA CONFIGURACIÓN DE DESPLIEGUE ---

export let supabase: SupabaseClient | null = null;

export const getSupabaseConfig = (): { url: string; anonKey: string } | null => {
    // Devuelve siempre los valores incrustados.
    if (DEPLOYED_SUPABASE_URL && DEPLOYED_SUPABASE_ANON_KEY) {
        return { url: DEPLOYED_SUPABASE_URL, anonKey: DEPLOYED_SUPABASE_ANON_KEY };
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