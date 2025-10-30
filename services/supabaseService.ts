import { createClient, SupabaseClient, AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { LOCAL_STORAGE_KEYS } from '../constants';

export let supabase: SupabaseClient | null = null;

export const getSupabaseConfig = (): { url: string; anonKey: string } | null => {
    const configStr = localStorage.getItem(LOCAL_STORAGE_KEYS.SUPABASE_CONFIG);
    if (!configStr) {
        return null;
    }
    try {
        return JSON.parse(configStr);
    } catch (error) {
        console.error("Error parsing Supabase config from localStorage.", error);
        localStorage.removeItem(LOCAL_STORAGE_KEYS.SUPABASE_CONFIG);
        return null;
    }
};

export const isSupabaseConfigured = (config: any): boolean => {
    if (!config) return false;
    return (
        config.url && typeof config.url === 'string' && config.url.trim() !== '' &&
        config.anonKey && typeof config.anonKey === 'string' && config.anonKey.trim() !== ''
    );
};

const initializeSupabase = () => {
    const config = getSupabaseConfig();
    if (isSupabaseConfigured(config)) {
        try {
            supabase = createClient(config!.url, config!.anonKey);
        } catch (error) {
            console.error("Failed to initialize Supabase client:", error);
            supabase = null;
            // Clear the invalid config to prevent a boot loop
            localStorage.removeItem(LOCAL_STORAGE_KEYS.SUPABASE_CONFIG);
        }
    }
};

// Initialize on load
initializeSupabase();

export const verifySchema = async (): Promise<boolean> => {
    if (!supabase) return false;
    try {
        // This query returns no data but will fail if the table doesn't exist.
        const { error } = await supabase.from('clients').select('id').limit(0);
        
        // If there's an error, check if it's the specific "relation does not exist" error.
        if (error && error.code === '42P01') {
            console.warn("Schema verification failed: 'clients' table not found.");
            return false; // Table does not exist
        }
        // Other errors (like RLS) might occur, but for this check, their presence means the table *exists*.
        // A null error means the query succeeded, so the table exists.
        return true; // Table exists
    } catch (e) {
        console.error("Unexpected error during schema verification:", e);
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