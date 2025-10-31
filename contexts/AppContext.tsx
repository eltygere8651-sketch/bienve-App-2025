import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { AppView } from '../types';
import { LOCAL_STORAGE_KEYS } from '../constants';
import { User } from '@supabase/supabase-js';
import { 
    isSupabaseConfigured, 
    getSupabaseConfig, 
    onAuthStateChanged, 
    signOut,
    verifySchema,
    initializeSupabaseClient
} from '../services/supabaseService';

type InitializationStatus = 'pending' | 'success' | 'failed';
type SchemaVerificationStatus = 'pending' | 'verifying' | 'verified';


interface ToastMessage {
    message: string;
    type: 'success' | 'error' | 'info';
}

interface ConfirmState {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
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
    showConfirmModal: (options: Omit<ConfirmState, 'isOpen'>) => void;
    hideConfirmModal: () => void;
    isConfigReady: boolean;
    setSupabaseConfig: (config: { url: string; anonKey: string }) => void;
    initializationStatus: InitializationStatus;
    isSchemaReady: boolean;
    schemaVerificationStatus: SchemaVerificationStatus;
    verifyDatabaseSchema: () => Promise<void>;
    supabaseConfig: { url: string; anonKey: string } | null;
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
    });
    const [supabaseConfig, setSupabaseConfigState] = useState<{ url: string; anonKey: string } | null>(null);
    const [isConfigReady, setIsConfigReady] = useState(false);
    const [initializationStatus, setInitializationStatus] = useState<InitializationStatus>('pending');
    const [isSchemaReady, setIsSchemaReady] = useState<boolean>(false);
    const [schemaVerificationStatus, setSchemaVerificationStatus] = useState<SchemaVerificationStatus>('pending');


    const verifyDatabaseSchema = useCallback(async () => {
        setSchemaVerificationStatus('verifying');
        try {
            const schemaExists = await verifySchema();
            setIsSchemaReady(schemaExists);
        } catch (error) {
            console.error("Failed to execute schema verification", error);
            setIsSchemaReady(false);
        } finally {
            setSchemaVerificationStatus('verified');
        }
    }, []);
    
    useEffect(() => {
        const config = getSupabaseConfig();
        if (isSupabaseConfigured(config)) {
            if (initializeSupabaseClient(config!.url, config!.anonKey)) {
                setSupabaseConfigState(config);
                setIsConfigReady(true);
                setInitializationStatus('success');
            } else {
                setInitializationStatus('failed');
            }
        } else {
            setInitializationStatus('success'); // Ready to show Setup screen
        }
    }, []);

    useEffect(() => {
        if (initializationStatus === 'success' && isConfigReady) {
            verifyDatabaseSchema();
        }
    }, [initializationStatus, isConfigReady, verifyDatabaseSchema]);

    useEffect(() => {
        if (initializationStatus !== 'success' || !isConfigReady || !isSchemaReady) return;

        const { data: { subscription } } = onAuthStateChanged((_event, session) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            setIsAuthenticated(!!currentUser);
            if (currentUser) {
                setCurrentView(v => (v === 'auth' || v === 'welcome' || v === 'loanRequest' || v === 'setup') ? 'dashboard' : v);
            } else {
                const publicViews: AppView[] = ['welcome', 'loanRequest', 'auth', 'dashboard'];
                setCurrentView(v => publicViews.includes(v) ? v : 'welcome');
            }
        });

        return () => subscription.unsubscribe();
    }, [initializationStatus, isConfigReady, isSchemaReady]);
    
    useEffect(() => {
        if (!isSchemaReady) return;
        const adminOnlyViews: AppView[] = ['clients', 'requests', 'receiptGenerator', 'settings', 'dataManagement'];
        if (!isAuthenticated && adminOnlyViews.includes(currentView)) {
            setCurrentView('auth');
        }
    }, [isAuthenticated, currentView, isSchemaReady]);

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ message, type });
    };

    const logout = async () => {
        try {
            await signOut();
            showToast('Sesión cerrada.', 'info');
            setCurrentView('welcome');
        } catch (error) {
            console.error("Error signing out:", error);
            showToast('Error al cerrar sesión.', 'error');
        }
    };
    
    const setSupabaseConfig = (config: { url: string; anonKey: string }) => {
        localStorage.setItem(LOCAL_STORAGE_KEYS.SUPABASE_CONFIG, JSON.stringify(config));
        if (initializeSupabaseClient(config.url, config.anonKey)) {
            setSupabaseConfigState(config);
            setIsConfigReady(true);
            setInitializationStatus('success');
        } else {
            setInitializationStatus('failed');
            showToast('Error al inicializar la conexión con Supabase.', 'error');
        }
    }

    const showConfirmModal = (options: Omit<ConfirmState, 'isOpen'>) => {
        setConfirmState({ ...options, isOpen: true });
    };

    const hideConfirmModal = () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
    };

    const value = { 
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
        setSupabaseConfig,
        initializationStatus,
        isSchemaReady,
        schemaVerificationStatus,
        verifyDatabaseSchema,
        supabaseConfig,
    };

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