import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { AppView } from '../types';
import { User } from '@supabase/supabase-js';
import { 
    isSupabaseConfigured, 
    getSupabaseConfig, 
    onAuthStateChanged, 
    signOut,
    initializeSupabaseClient,
    clearSupabaseConfig
} from '../services/supabaseService';
import { DEFAULT_ANNUAL_INTEREST_RATE } from '../config';

type InitializationStatus = 'pending' | 'success' | 'failed';
type ConfirmModalType = 'info' | 'warning';

interface ToastMessage {
    message: string;
    type: 'success' | 'error' | 'info';
}

interface ConfirmState {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    type: ConfirmModalType;
}

interface AppContextType {
    toast: ToastMessage;
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
    currentView: AppView;
    setCurrentView: (view: AppView) => void;
    user: User | null;
    isAuthenticated: boolean;
    logout: () => void;
    isSidebarOpen: boolean,
    setIsSidebarOpen: (isOpen: boolean) => void;
    confirmState: ConfirmState;
    showConfirmModal: (options: Omit<ConfirmState, 'isOpen' | 'type'> & { type?: ConfirmModalType }) => void;
    hideConfirmModal: () => void;
    isConfigReady: boolean;
    initializationStatus: InitializationStatus;
    supabaseConfig: { url: string; anonKey: string } | null;
    annualInterestRate: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toast, setToast] = useState<ToastMessage>({ message: '', type: 'info' });
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [currentView, setCurrentView] = useState<AppView>('welcome');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [confirmState, setConfirmState] = useState<ConfirmState>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        type: 'warning',
    });
    const [supabaseConfig, setSupabaseConfigState] = useState<{ url: string; anonKey: string } | null>(null);
    const [isConfigReady, setIsConfigReady] = useState(false);
    const [initializationStatus, setInitializationStatus] = useState<InitializationStatus>('pending');
    const annualInterestRate = DEFAULT_ANNUAL_INTEREST_RATE;
    
    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ message, type });
    }, []);

    useEffect(() => {
        let config: { url: string; anonKey: string } | null = null;
        
        // 1. Prioritize environment variables for deployed/shared app
        // Assumes env vars are set during the build process for a production app
        const envUrl = process.env.SUPABASE_URL;
        const envKey = process.env.SUPABASE_ANON_KEY;

        if (envUrl && envKey) {
            config = { url: envUrl, anonKey: envKey };
        } else {
            // 2. Fallback to localStorage for local/admin setup
            config = getSupabaseConfig();
        }

        if (isSupabaseConfigured(config)) {
            if (initializeSupabaseClient(config!.url, config!.anonKey)) {
                setSupabaseConfigState(config);
                setIsConfigReady(true);
            } else {
                // Config exists but is invalid.
                if (!envUrl) { // Only clear local storage if env vars aren't the source of the problem
                    clearSupabaseConfig();
                    showToast('La configuración de Supabase no es válida. Por favor, ingrésala de nuevo.', 'error');
                } else {
                    showToast('La configuración de Supabase (variables de entorno) no es válida.', 'error');
                }
            }
        }
        
        setInitializationStatus('success'); // Always success, setup screen will handle missing config
    }, [showToast]);

    useEffect(() => {
        if (!isConfigReady) return;

        const { data: { subscription } } = onAuthStateChanged((_event, session) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            setIsAuthenticated(!!currentUser);
            if (currentUser) {
                const nonAdminViews: AppView[] = ['auth', 'welcome', 'loanRequest', 'requestStatus'];
                setCurrentView(v => nonAdminViews.includes(v) ? 'dashboard' : v);
            } else {
                const publicViews: AppView[] = ['welcome', 'loanRequest', 'auth', 'requestStatus'];
                setCurrentView(v => publicViews.includes(v) ? v : 'welcome');
            }
        });

        return () => subscription.unsubscribe();
    }, [isConfigReady]);
    
    useEffect(() => {
        const adminOnlyViews: AppView[] = ['clients', 'receiptGenerator', 'settings', 'dataManagement', 'newClient', 'dashboard', 'requests'];
        if (!isAuthenticated && adminOnlyViews.includes(currentView)) {
            setCurrentView('auth');
        }
    }, [isAuthenticated, currentView]);

    const logout = useCallback(async () => {
        try {
            await signOut();
            showToast('Sesión cerrada.', 'info');
        } catch (error) {
            console.error("Error signing out:", error);
            showToast('Error al cerrar sesión.', 'error');
        }
    }, [showToast]);

    const showConfirmModal = useCallback((options: Omit<ConfirmState, 'isOpen' | 'type'> & { type?: ConfirmModalType }) => {
        setConfirmState({
            ...options,
            isOpen: true,
            type: options.type || 'warning',
        });
    }, []);

    const hideConfirmModal = useCallback(() => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
    }, []);



    const value = useMemo(() => ({ 
        toast,
        showToast,
        currentView,
        setCurrentView,
        user,
        isAuthenticated,
        logout,
        isSidebarOpen,
        setIsSidebarOpen,
        confirmState,
        showConfirmModal,
        hideConfirmModal,
        isConfigReady,
        initializationStatus,
        supabaseConfig,
        annualInterestRate,
    }), [
        toast, showToast, currentView, user, isAuthenticated, logout,
        isSidebarOpen, confirmState, showConfirmModal, hideConfirmModal,
        isConfigReady, initializationStatus, supabaseConfig, annualInterestRate
    ]);

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within a AppContextProvider');
    }
    return context;
};
