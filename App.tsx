import React from 'react';
import { AppView } from './types';
import Dashboard from './components/Dashboard';
import ClientList from './components/ClientList';
import LoanRequestForm from './components/LoanRequestForm';
import RequestList from './components/RequestList';
import Auth from './components/Auth';
import Welcome from './components/Welcome';
import Toast from './components/Toast';
import ConfirmationModal from './components/ConfirmationModal';
import NavItem from './components/NavItem';
import { Handshake, LayoutDashboard, Users, FileText, Sun, Moon, GitPullRequest, Loader2, LogOut, LogIn, ChevronLeft, ChevronRight, Home, ReceiptText, Settings, DatabaseBackup, Wrench, AlertTriangle } from 'lucide-react';
import { useAppContext } from './contexts/AppContext';
import { useDataContext } from './contexts/DataContext';
import ReceiptGenerator from './components/ReceiptGenerator';
import SettingsComponent from './components/Settings';
import DataManagement from './components/DataManagement';
import Setup from './components/Setup';

const App: React.FC = () => {
    const { 
        theme, 
        currentView, 
        isSidebarOpen,
        toast,
        confirmState,
        handleThemeToggle, 
        setCurrentView, 
        setIsSidebarOpen,
        showToast,
        hideConfirmModal,
        isConfigReady,
        isAuthenticated,
        logout,
        initializationStatus
    } = useAppContext();
    
    const { requests, isLoading, error } = useDataContext();

    const handleLogoClick = () => {
        setCurrentView(isAuthenticated ? 'dashboard' : 'welcome');
    };

    if (initializationStatus === 'pending') {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-100 dark:bg-gray-900">
                <Loader2 className="h-16 w-16 animate-spin text-blue-600" />
            </div>
        );
    }
    
    if (initializationStatus === 'failed') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-red-50 dark:bg-gray-900 p-4">
                <div className="w-full max-w-lg bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg text-center">
                     <AlertTriangle className="text-red-500 h-16 w-16 mx-auto" />
                     <h1 className="text-2xl font-bold mt-4 text-gray-800 dark:text-gray-100">Error Crítico de Configuración</h1>
                     <p className="text-gray-600 dark:text-gray-400 mt-2">
                        La aplicación no pudo conectarse. Por favor, verifica tu configuración de Supabase.
                     </p>
                </div>
            </div>
        );
    }

    if (!isConfigReady) {
        return <Setup />;
    }

    if (!isAuthenticated && currentView !== 'welcome' && currentView !== 'loanRequest' && currentView !== 'auth') {
        return <Auth />;
    }
    
    const renderContent = () => {
        if (isLoading && isAuthenticated) { // Show loader only when logged in and loading data
            return (
                <div className="flex justify-center items-center h-full">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                </div>
            );
        }

        if (error) {
            return (
                <div className="bg-red-100 dark:bg-red-900/50 border-l-4 border-red-500 text-red-700 dark:text-red-200 p-6 rounded-lg shadow-md">
                    <h3 className="font-bold text-lg">Error de Carga</h3>
                    <p className="mt-2">{error}</p>
                </div>
            );
        }
        
        switch (currentView) {
            case 'welcome': return <Welcome />;
            case 'dashboard': return isAuthenticated ? <Dashboard /> : <Auth />;
            case 'clients': return isAuthenticated ? <ClientList /> : <Auth />;
            case 'loanRequest': return <LoanRequestForm />;
            case 'requests': return isAuthenticated ? <RequestList /> : <Auth />;
            case 'auth': return <Auth />;
            case 'receiptGenerator': return isAuthenticated ? <ReceiptGenerator /> : <Auth />;
            case 'settings': return isAuthenticated ? <SettingsComponent /> : <Auth />;
            case 'dataManagement': return isAuthenticated ? <DataManagement /> : <Auth />;
            default: return isAuthenticated ? <Dashboard /> : <Welcome />;
        }
    };

    return (
        <>
            <Toast message={toast.message} type={toast.type} onClose={() => showToast('', 'info')} />
            <ConfirmationModal
                isOpen={confirmState.isOpen}
                title={confirmState.title}
                message={confirmState.message}
                onConfirm={confirmState.onConfirm}
                onCancel={hideConfirmModal}
            />
            <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
                 <aside className={`bg-gray-800 dark:bg-black text-white flex flex-col transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
                    <div 
                        className="flex items-center justify-center p-4 border-b border-gray-700 dark:border-gray-800 h-16 cursor-pointer"
                        onClick={handleLogoClick}
                        title="Ir al inicio"
                    >
                         <Handshake className="text-blue-400 h-8 w-8" />
                         {isSidebarOpen && <h1 className="text-xl font-bold ml-2">B.M Contigo</h1>}
                    </div>
                    <nav className="flex-1 p-4">
                        <ul>
                            {isAuthenticated && <NavItem icon={<LayoutDashboard />} label="Dashboard" view="dashboard" currentView={currentView} onClick={(v) => setCurrentView(v!)} isSidebarOpen={isSidebarOpen} />}
                            {!isAuthenticated && <NavItem icon={<Home />} label="Bienvenida" view="welcome" currentView={currentView} onClick={(v) => setCurrentView(v!)} isSidebarOpen={isSidebarOpen} />}
                            <NavItem icon={<FileText />} label="Solicitud de Préstamo" view="loanRequest" currentView={currentView} onClick={(v) => setCurrentView(v!)} isSidebarOpen={isSidebarOpen} />
                            {isAuthenticated && <NavItem icon={<GitPullRequest />} label="Gestión de Solicitudes" view="requests" currentView={currentView} onClick={(v) => setCurrentView(v!)} isSidebarOpen={isSidebarOpen} badge={requests.length} />}
                            {isAuthenticated && <NavItem icon={<Users />} label="Clientes" view="clients" currentView={currentView} onClick={(v) => setCurrentView(v!)} isSidebarOpen={isSidebarOpen} />}
                        </ul>
                         {isAuthenticated && isSidebarOpen && (
                            <>
                                <div className="mt-4 pt-4 border-t border-gray-700">
                                    <h3 className="px-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Herramientas</h3>
                                     <ul>
                                        <NavItem icon={<Settings />} label="Ajustes" view="settings" currentView={currentView} onClick={(v) => setCurrentView(v!)} isSidebarOpen={isSidebarOpen} />
                                        <NavItem icon={<ReceiptText />} label="Generar Recibo" view="receiptGenerator" currentView={currentView} onClick={(v) => setCurrentView(v!)} isSidebarOpen={isSidebarOpen} />
                                        <NavItem icon={<DatabaseBackup />} label="Gestión de Datos" view="dataManagement" currentView={currentView} onClick={(v) => setCurrentView(v!)} isSidebarOpen={isSidebarOpen} />
                                    </ul>
                                </div>
                            </>
                        )}
                    </nav>
                     <div className="p-4 border-t border-gray-700 dark:border-gray-800">
                         <button
                            onClick={handleThemeToggle}
                            className="w-full flex items-center justify-center p-3 my-1 rounded-lg cursor-pointer text-gray-300 hover:bg-gray-700 hover:text-white"
                            aria-label={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
                        >
                            {theme === 'light' ? <Moon /> : <Sun />}
                            <span className={`ml-4 transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 h-0 w-0'}`}>
                                {theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}
                            </span>
                        </button>
                        {isAuthenticated ? (
                             <button
                                onClick={logout}
                                className="w-full flex items-center justify-center p-3 my-1 rounded-lg cursor-pointer text-gray-300 hover:bg-gray-700 hover:text-white"
                                aria-label="Cerrar sesión"
                            >
                                <LogOut />
                                <span className={`ml-4 transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 h-0 w-0'}`}>
                                    Cerrar Sesión
                                </span>
                            </button>
                        ) : (
                            <button
                                onClick={() => setCurrentView('auth')}
                                className="w-full flex items-center justify-center p-3 my-1 rounded-lg cursor-pointer text-gray-300 hover:bg-gray-700 hover:text-white"
                                aria-label="Acceder o registrarse"
                            >
                                <LogIn />
                                <span className={`ml-4 transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 h-0 w-0'}`}>
                                    Acceder
                                </span>
                            </button>
                        )}
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="w-full flex justify-center p-2 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white mt-2">
                            {isSidebarOpen ? <ChevronLeft /> : <ChevronRight />}
                        </button>
                    </div>
                </aside>
                <main className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 overflow-y-auto">
                     {isAuthenticated && (
                        <div className="bg-green-100 dark:bg-green-900/50 border-l-4 border-green-500 text-green-700 dark:text-green-200 p-4 rounded-md mb-6 flex items-center shadow-md">
                            <Wrench className="h-5 w-5 mr-3" />
                            <p className="font-bold">Modo Administrador Activo (Datos en la nube de Supabase).</p>
                        </div>
                    )}
                    <div className="flex-grow">
                         {renderContent()}
                    </div>
                </main>
            </div>
        </>
    );
};

export default App;