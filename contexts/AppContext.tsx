import React, { createContext, useState, useContext, useEffect } from 'react';
import { AppView } from '../types';
import { ADMIN_CREDENTIALS } from '../config';
import { LOCAL_STORAGE_KEYS, SESSION_STORAGE_KEYS } from '../constants';

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
    isAdmin: boolean;
    handleLogin: (user: string, pass: string) => boolean;
    handleLogout: () => void;
    isSidebarOpen: boolean,
    setIsSidebarOpen: (isOpen: boolean) => void;
    confirmState: ConfirmState;
    showConfirmModal: (options: Omit<ConfirmState, 'isOpen'>) => void;
    hideConfirmModal: () => void;
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
    const [isAdmin, setIsAdmin] = useState<boolean>(() => sessionStorage.getItem(SESSION_STORAGE_KEYS.IS_ADMIN) === 'true');
    const [currentView, setCurrentView] = useState<AppView>(() => (
        sessionStorage.getItem(SESSION_STORAGE_KEYS.IS_ADMIN) === 'true' ? 'dashboard' : 'welcome'
    ));
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [confirmState, setConfirmState] = useState<ConfirmState>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
    });

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
        const adminOnlyViews: AppView[] = ['dashboard', 'clients', 'requests', 'receiptGenerator'];
        if (!isAdmin && adminOnlyViews.includes(currentView)) {
            setCurrentView('welcome');
        }
    }, [isAdmin, currentView]);

    const handleThemeToggle = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ message, type });
    };

    const handleLogin = (user: string, pass: string): boolean => {
        if (user === ADMIN_CREDENTIALS.USER && pass === ADMIN_CREDENTIALS.PASS) {
            sessionStorage.setItem(SESSION_STORAGE_KEYS.IS_ADMIN, 'true');
            setIsAdmin(true);
            showToast('Sesión de administrador iniciada.', 'success');
            return true;
        }
        return false;
    };

    const handleLogout = () => {
        sessionStorage.removeItem(SESSION_STORAGE_KEYS.IS_ADMIN);
        setIsAdmin(false);
        setCurrentView('welcome');
        showToast('Sesión cerrada.', 'info');
    };

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
        isAdmin,
        handleLogin,
        handleLogout,
        isSidebarOpen,
        setIsSidebarOpen,
        confirmState,
        showConfirmModal,
        hideConfirmModal,
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
