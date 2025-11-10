
import React, { createContext, useState, useContext, useEffect } from 'react';
import { AppView } from '../types';
import { User } from '@supabase/supabase-js';
import { 
    isSupabaseConfigured, 
    getSupabaseConfig, 
    onAuthStateChanged, 
    signOut,
    initializeSupabaseClient
} from '../services/supabaseService';

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
    onConfirm: () => void;
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
    isSchemaReady: boolean;
    isStorageReady: boolean;
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
        type: 'warning',
    });
    const [supabaseConfig, setSupabaseConfigState] = useState<{ url: string; anonKey: string } | null>(null);
    const [isConfigReady, setIsConfigReady] = useState(false);
    const [initializationStatus, setInitializationStatus] = useState<InitializationStatus>('pending');
    // Schema and storage are assumed to be ready as setup is removed.
    const [isSchemaReady] = useState<boolean>(true);
    const [isStorageReady] = useState<boolean>(true);
    
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
            setInitializationStatus('failed'); // Critical failure if config is missing
        }
    }, []);

    useEffect(() => {
        if (initializationStatus !== 'success' || !isConfigReady || !isSchemaReady) return;

        const { data: { subscription } } = onAuthStateChanged((_event, session) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            setIsAuthenticated(!!currentUser);
            if (currentUser) {
                const nonAdminViews: AppView[] = ['auth', 'welcome', 'loanRequest'];
                setCurrentView(v => nonAdminViews.includes(v) ? 'dashboard' : v);
            } else {
                const publicViews: AppView[] = ['welcome', 'loanRequest', 'auth'];
                setCurrentView(v => publicViews.includes(v) ? v : 'welcome');
            }
        });

        return () => subscription.unsubscribe();
    }, [initializationStatus, isConfigReady, isSchemaReady]);
    
    useEffect(() => {
        if (!isSchemaReady) return;
        const adminOnlyViews: AppView[] = ['clients', 'requests', 'receiptGenerator', 'settings', 'dataManagement', 'accounting', 'newClient'];
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

    const showConfirmModal = (options: Omit<ConfirmState, 'isOpen' | 'type'> & { type?: ConfirmModalType }) => {
        setConfirmState({
            ...options,
            isOpen: true,
            type: options.type || 'warning',
        });
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
        initializationStatus,
        isSchemaReady,
        isStorageReady,
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
