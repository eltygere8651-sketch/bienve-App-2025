import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { AppView } from '../types';
import { LOCAL_STORAGE_KEYS } from '../constants';
import { User } from '@supabase/supabase-js';
import { 
    supabase, 
    isSupabaseConfigured, 
    getSupabaseConfig, 
    onAuthStateChanged, 
    signOut,
    verifySchema
} from '../services/supabaseService';

type Theme = 'light' | 'dark';
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
    theme: Theme;
    handleThemeToggle: () => void;
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

const getInitialTheme = (): Theme => {
  const storedTheme = localStorage.getItem(LOCAL_STORAGE_KEYS.THEME);
  if (storedTheme === 'dark' || storedTheme === 'light') {
    return storedTheme;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const AppContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(getInitialTheme);
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
    const [supabaseConfig, setSupabaseConfigState] = useState<{ url: string; anonKey: string } | null>(() => getSupabaseConfig());
    const [isConfigReady, setIsConfigReady] = useState(() => isSupabaseConfigured(supabaseConfig));
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
        if (!isConfigReady) {
            setInitializationStatus('success');
            setSchemaVerificationStatus('verified'); // No need to verify if not configured
            return;
        }
        if (supabase) {
             setInitializationStatus('success');
        } else {
             setInitializationStatus('failed');
        }
    }, [isConfigReady]);

    useEffect(() => {
        if (initializationStatus === 'success') {
            verifyDatabaseSchema();
        }
    }, [initializationStatus, verifyDatabaseSchema]);

    useEffect(() => {
        if (initializationStatus !== 'success' || !supabase || !isSchemaReady) return;

        const { data: { subscription } } = onAuthStateChanged((_event, session) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            setIsAuthenticated(!!currentUser);
            if (currentUser) {
                setCurrentView(v => (v === 'auth' || v === 'welcome' || v === 'loanRequest' || v === 'setup') ? 'dashboard' : v);
            } else {
                const publicViews: AppView[] = ['welcome', 'loanRequest', 'auth'];
                setCurrentView(v => publicViews.includes(v) ? v : 'welcome');
            }
        });

        return () => subscription.unsubscribe();
    }, [initializationStatus, isSchemaReady]);

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            localStorage.setItem(LOCAL_STORAGE_KEYS.THEME, 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem(LOCAL_STORAGE_KEYS.THEME, 'light');
        }
    }, [theme]);
    
    useEffect(() => {
        if (!isSchemaReady) return;
        const adminOnlyViews: AppView[] = ['dashboard', 'clients', 'requests', 'receiptGenerator', 'settings', 'dataManagement'];
        if (!isAuthenticated && adminOnlyViews.includes(currentView)) {
            setCurrentView('auth');
        }
    }, [isAuthenticated, currentView, isSchemaReady]);

    const handleThemeToggle = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ message, type });
    };

    const logout = async () => {
        if (!supabase) return;
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
        setSupabaseConfigState(config);
        setIsConfigReady(true);
        window.location.reload(); 
    }

    const showConfirmModal = (options: Omit<ConfirmState, 'isOpen'>) => {
        setConfirmState({ ...options, isOpen: true });
    };

    const hideConfirmModal = () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
    };

    const value = { 
        theme, 
        handleThemeToggle,
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