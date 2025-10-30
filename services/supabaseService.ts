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
        supabase = createClient(config!.url, config!.anonKey);
    }
};

// Initialize on load
initializeSupabase();

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