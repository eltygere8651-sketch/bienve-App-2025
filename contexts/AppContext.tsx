import React, { createContext, useState, useContext, useEffect } from 'react';
import { AppView } from '../types';

// --- Admin Credentials ---
const ADMIN_USER = 'domipro';
const ADMIN_PASS = 'Hy82788278?';
// -------------------------

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
  const storedTheme = localStorage.getItem('theme');
  if (storedTheme === 'dark' || storedTheme === 'light') {
    return storedTheme;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const AppContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(getInitialTheme);
    const [toast, setToast] = useState<ToastMessage>({ message: '', type: 'info' });
    const [isAdmin, setIsAdmin] = useState<boolean>(() => sessionStorage.getItem('isAdmin') === 'true');
    const [currentView, setCurrentView] = useState<AppView>(() => (
        sessionStorage.getItem('isAdmin') === 'true' ? 'dashboard' : 'loanRequest'
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
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [theme]);
    
    useEffect(() => {
        const adminOnlyViews: AppView[] = ['dashboard', 'clients', 'requests'];
        if (!isAdmin && adminOnlyViews.includes(currentView)) {
            setCurrentView('loanRequest');
        }
    }, [isAdmin, currentView]);

    const handleThemeToggle = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ message, type });
    };

    const handleLogin = (user: string, pass: string): boolean => {
        if (user === ADMIN_USER && pass === ADMIN_PASS) {
            sessionStorage.setItem('isAdmin', 'true');
            setIsAdmin(true);
            setCurrentView('dashboard');
            showToast('Sesión de administrador iniciada.', 'success');
            return true;
        }
        return false;
    };

    const handleLogout = () => {
        sessionStorage.removeItem('isAdmin');
        setIsAdmin(false);
        setCurrentView('loanRequest');
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