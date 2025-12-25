
import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { AppView } from '../types';
import { DEFAULT_ANNUAL_INTEREST_RATE } from '../config';
import { initializeFirebase, onAuthStateChanged, signOut, signIn, signUp } from '../services/firebaseService';
import AppNotConfigured from '../components/AppNotConfigured';

type InitializationStatus = 'pending' | 'success' | 'failed' | 'not_configured';
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
    user: any | null; 
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    registerAdmin: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
    hasAdminAccount: boolean;
    isSidebarOpen: boolean,
    setIsSidebarOpen: (isOpen: boolean) => void;
    confirmState: ConfirmState;
    showConfirmModal: (options: Omit<ConfirmState, 'isOpen' | 'type'> & { type?: ConfirmModalType }) => void;
    hideConfirmModal: () => void;
    isConfigReady: boolean;
    initializationStatus: InitializationStatus;
    annualInterestRate: number;
    isOnline: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toast, setToast] = useState<ToastMessage>({ message: '', type: 'info' });
    const [user, setUser] = useState<any | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [currentView, setCurrentView] = useState<AppView>('welcome');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [hasAdminAccount, setHasAdminAccount] = useState(true); 
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    
    const [confirmState, setConfirmState] = useState<ConfirmState>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        type: 'warning',
    });
    
    const [initializationStatus, setInitializationStatus] = useState<InitializationStatus>('pending');
    const annualInterestRate = DEFAULT_ANNUAL_INTEREST_RATE;
    
    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ message, type });
    }, []);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            showToast('Conexión restablecida. Sincronizando...', 'success');
        };
        const handleOffline = () => {
            setIsOnline(false);
            showToast('Sin conexión a internet. Trabajando en modo offline.', 'info');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [showToast]);

    useEffect(() => {
        const init = async () => {
            const configured = initializeFirebase();
            if (!configured) {
                setInitializationStatus('not_configured');
                return;
            }

            const safetyTimeout = setTimeout(() => {
                if (initializationStatus === 'pending') {
                    console.warn("Auth check timed out, forcing initialization");
                    setInitializationStatus('success');
                }
            }, 5000);

            const unsubscribe = onAuthStateChanged((firebaseUser) => {
                if (firebaseUser) {
                    if (!firebaseUser.isAnonymous) {
                        setUser(firebaseUser);
                        setIsAuthenticated(true);
                        setHasAdminAccount(true);
                        setCurrentView((prev) => (prev === 'welcome' || prev === 'auth') ? 'dashboard' : prev);
                    } else {
                        setIsAuthenticated(false);
                    }
                } else {
                    setUser(null);
                    setIsAuthenticated(false);
                }
                setInitializationStatus('success');
                clearTimeout(safetyTimeout);
            });

            return () => {
                clearTimeout(safetyTimeout);
                unsubscribe();
            };
        };

        init();
    }, []);
    
    useEffect(() => {
        const adminOnlyViews: AppView[] = ['clients', 'receiptGenerator', 'settings', 'dataManagement', 'newClient', 'dashboard', 'requests'];
        if (!isAuthenticated && adminOnlyViews.includes(currentView)) {
            if (initializationStatus === 'success') {
                setCurrentView('auth');
            }
        }
    }, [isAuthenticated, currentView, initializationStatus]);

    const registerAdmin = useCallback(async (email: string, password: string) => {
        try {
            await signUp(email, password);
            showToast('Cuenta creada con éxito.', 'success');
            return true;
        } catch (error: any) {
            if (error.code === 'auth/email-already-in-use') {
                 showToast('El email ya está registrado. Por favor inicia sesión.', 'error');
            } else {
                 showToast('Error al registrar: ' + error.message, 'error');
            }
            return false;
        }
    }, [showToast]);

    const login = useCallback(async (email: string, password: string) => {
        try {
            await signIn(email, password);
            showToast('Bienvenido, Admin.', 'success');
            setCurrentView('dashboard');
            return true;
        } catch (error: any) {
            return false;
        }
    }, [showToast]);

    const logout = useCallback(async () => {
        await signOut();
        setUser(null);
        setIsAuthenticated(false);
        showToast('Sesión cerrada.', 'info');
        setCurrentView('welcome');
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
        login,
        registerAdmin,
        logout,
        hasAdminAccount,
        isSidebarOpen,
        setIsSidebarOpen,
        confirmState,
        showConfirmModal,
        hideConfirmModal,
        isConfigReady: initializationStatus !== 'not_configured',
        initializationStatus,
        annualInterestRate,
        isOnline,
    }), [
        toast, showToast, currentView, user, isAuthenticated, login, registerAdmin, logout, hasAdminAccount,
        isSidebarOpen, confirmState, showConfirmModal, hideConfirmModal,
        initializationStatus, annualInterestRate, isOnline
    ]);

    if (initializationStatus === 'not_configured') {
        return <AppNotConfigured />;
    }

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
