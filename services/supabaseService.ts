import { createClient, SupabaseClient, AuthChangeEvent, Session } from '@supabase/supabase-js';

const SUPABASE_URL_KEY = 'supabaseUrl';
const SUPABASE_ANON_KEY = 'supabaseAnonKey';

export let supabase: SupabaseClient | null = null;

export const saveSupabaseConfig = (url: string, anonKey: string) => {
    localStorage.setItem(SUPABASE_URL_KEY, url);
    localStorage.setItem(SUPABASE_ANON_KEY, anonKey);
};

export const getSupabaseConfig = (): { url: string; anonKey: string } | null => {
    const url = localStorage.getItem(SUPABASE_URL_KEY);
    const anonKey = localStorage.getItem(SUPABASE_ANON_KEY);
    if (url && anonKey) {
        return { url, anonKey };
    }
    return null;
};

export const clearSupabaseConfig = () => {
    localStorage.removeItem(SUPABASE_URL_KEY);
    localStorage.removeItem(SUPABASE_ANON_KEY);
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

export const resetPasswordForEmail = (email: string) => {
    if (!supabase) throw new Error("Supabase not initialized");
    // Supabase utilizará la URL del sitio y las URL de redirección configuradas en
    // los ajustes de autenticación de tu proyecto. Asegúrate de que estén correctamente establecidas.
    return supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin, // Redirige de vuelta a la app después del reseteo
    });
};

export const signOut = () => {
    if (!supabase) throw new Error("Supabase not initialized");
    return supabase.auth.signOut();
};

export const onAuthStateChanged = (callback: (event: AuthChangeEvent, session: Session | null) => void) => {
    if (!supabase) throw new Error("Supabase not initialized");
    return supabase.auth.onAuthStateChange(callback);
};