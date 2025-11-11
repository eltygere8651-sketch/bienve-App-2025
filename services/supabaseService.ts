

import { createClient, SupabaseClient, AuthChangeEvent, Session } from '@supabase/supabase-js';

export let supabase: SupabaseClient | null = null;

export const isSupabaseConfigured = (config: any): boolean => {
    if (!config) return false;

    const url = config.url;
    const anonKey = config.anonKey;

    if (!url || typeof url !== 'string' || url.trim() === '') {
        return false;
    }

    if (!anonKey || typeof anonKey !== 'string' || anonKey.trim() === '') {
        return false;
    }

    // Check for a valid URL format.
    try {
        const urlObject = new URL(url);
        return urlObject.protocol === 'http:' || urlObject.protocol === 'https:';
    } catch (_) {
        return false;
    }
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

// Fix: Add missing functions for saving/getting config from localStorage for setup screen.
const SUPABASE_CONFIG_KEY = 'bmContigoSupabaseConfig';

export const saveSupabaseConfig = (url: string, anonKey: string) => {
    if (typeof window !== 'undefined' && window.localStorage) {
        const config = { url, anonKey };
        localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(config));
    }
};

export const getSupabaseConfig = (): { url: string; anonKey: string } | null => {
    if (typeof window !== 'undefined' && window.localStorage) {
        const configStr = localStorage.getItem(SUPABASE_CONFIG_KEY);
        if (!configStr) return null;
        try {
            const config = JSON.parse(configStr);
            if (config && typeof config.url === 'string' && typeof config.anonKey === 'string') {
                return config;
            }
            return null;
        } catch (e) {
            console.warn('Could not parse Supabase config from localStorage', e);
            return null;
        }
    }
    return null;
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