import React, { createContext, useState, useContext, useEffect } from 'react';
import { AppView } from '../types';
import { LOCAL_STORAGE_KEYS } from '../constants';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth, isFirebaseConfigured, getFirebaseConfig } from '../services/firebaseService';

type Theme = 'light' | 'dark';

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
    isConfigured: boolean;
    firebaseConfig: any;
    setFirebaseConfig: (config: any) => void;
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
    const [firebaseConfig, setFirebaseConfigState] = useState(() => getFirebaseConfig());
    const isConfigured = isFirebaseConfigured(firebaseConfig);

    useEffect(() => {
        if (!isConfigured) return;

        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setIsAuthenticated(!!currentUser);
            if (currentUser) {
                setCurrentView(v => (v === 'auth' || v === 'welcome' || v === 'loanRequest' || v === 'setup') ? 'dashboard' : v);
            } else {
                setCurrentView('welcome');
            }
        });

        return () => unsubscribe();
    }, [isConfigured]);

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
        const adminOnlyViews: AppView[] = ['dashboard', 'clients', 'requests', 'receiptGenerator', 'settings', 'dataManagement'];
        if (!isAuthenticated && adminOnlyViews.includes(currentView)) {
            setCurrentView('auth');
        }
    }, [isAuthenticated, currentView]);

    const handleThemeToggle = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ message, type });
    };

    const logout = async () => {
        try {
            await signOut(auth);
            showToast('Sesión cerrada.', 'info');
            setCurrentView('welcome');
        } catch (error) {
            console.error("Error signing out:", error);
            showToast('Error al cerrar sesión.', 'error');
        }
    };
    
    const setFirebaseConfig = (config: any) => {
        localStorage.setItem(LOCAL_STORAGE_KEYS.FIREBASE_CONFIG, JSON.stringify(config));
        setFirebaseConfigState(config);
        window.location.reload(); // Reload to re-initialize firebase with new config
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
        isConfigured,
        firebaseConfig,
        setFirebaseConfig
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