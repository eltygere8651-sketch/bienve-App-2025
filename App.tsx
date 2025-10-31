import React, { useMemo, useState, useEffect } from 'react';
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
import { Handshake, LayoutDashboard, Users, FileText, GitPullRequest, Loader2, LogOut, LogIn, ChevronLeft, ChevronRight, Home, ReceiptText, Settings, DatabaseBackup, Wrench, AlertTriangle, ShieldCheck, Menu, X, SearchCheck } from 'lucide-react';
import { useAppContext } from './contexts/AppContext';
import { useDataContext } from './contexts/DataContext';
import ReceiptGenerator from './components/ReceiptGenerator';
import SettingsComponent from './components/Settings';
import DataManagement from './components/DataManagement';
import Setup from './components/Setup';
import SchemaSetup from './components/SchemaSetup';
import RequestStatusChecker from './components/RequestStatusChecker';

const App: React.FC = () => {
    const { 
        currentView, 
        isSidebarOpen,
        toast,
        confirmState,
        setCurrentView, 
        setIsSidebarOpen,
        showToast,
        hideConfirmModal,
        isConfigReady,
        isAuthenticated,
        logout,
        initializationStatus,
        isSchemaReady,
        isStorageReady,
        schemaVerificationStatus,
        supabaseConfig,
    } = useAppContext();
    
    const { requests, isLoading, error } = useDataContext();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isAdminBannerVisible, setIsAdminBannerVisible] = useState(true);

    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [currentView]);

    const handleLogoClick = () => {
        if (isSchemaReady && isStorageReady) {
            setCurrentView(isAuthenticated ? 'dashboard' : 'welcome');
        }
    };

    const projectRef = useMemo(() => {
        if (!supabaseConfig?.url) return null;
        try {
            const url = new URL(supabaseConfig.url);
            return url.hostname.split('.')[0];
        } catch (e) {
            console.error("Could not parse Supabase URL", e);
            return null;
        }
    }, [supabaseConfig]);

    if (initializationStatus === 'pending' || (isConfigReady && schemaVerificationStatus === 'verifying')) {
        return (
            <div className="flex flex-col justify-center items-center h-screen bg-gray-100">
                <Loader2 className="h-16 w-16 animate-spin text-blue-600" />
                <p className="mt-4 text-gray-600">Inicializando aplicación...</p>
            </div>
        );
    }
    
    if (initializationStatus === 'failed') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-red-50 p-4">
                <div className="w-full max-w-lg bg-white p-8 rounded-2xl shadow-lg text-center">
                     <AlertTriangle className="text-red-500 h-16 w-16 mx-auto" />
                     <h1 className="text-2xl font-bold mt-4 text-gray-800">Error Crítico de Configuración</h1>
                     <p className="text-gray-600 mt-2">
                        La aplicación no pudo conectarse. Por favor, verifica tu configuración de Supabase.
                     </p>
                </div>
            </div>
        );
    }

    if (!isConfigReady) {
        return <Setup />;
    }

    if (!isSchemaReady || !isStorageReady) {
        return <SchemaSetup />;
    }
    
    const renderContent = () => {
        if (isLoading && isAuthenticated) {
            return (
                <div className="flex justify-center items-center h-full">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                </div>
            );
        }

        if (error) {
            return (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-6 rounded-lg shadow-md">
                    <h3 className="font-bold text-lg">Error de Carga</h3>
                    <p className="mt-2">{error}</p>
                </div>
            );
        }
        
        switch (currentView) {
            case 'welcome': return <Welcome />;
            case 'dashboard': return <Dashboard />;
            case 'clients': return isAuthenticated ? <ClientList /> : <Auth />;
            case 'loanRequest': return <LoanRequestForm />;
            case 'requestStatusChecker': return <RequestStatusChecker />;
            case 'requests': return isAuthenticated ? <RequestList /> : <Auth />;
            case 'auth': return <Auth />;
            case 'receiptGenerator': return isAuthenticated ? <ReceiptGenerator /> : <Auth />;
            case 'settings': return isAuthenticated ? <SettingsComponent /> : <Auth />;
            case 'dataManagement': return isAuthenticated ? <DataManagement /> : <Auth />;
            default: return isAuthenticated ? <Dashboard /> : <Welcome />;
        }
    };

    const SidebarContent = () => (
        <>
            <div 
                className="flex items-center justify-center p-4 border-b border-gray-700 h-16 cursor-pointer"
                onClick={handleLogoClick}
                title="Ir al inicio"
            >
                 <Handshake className="text-blue-400 h-8 w-8" />
                 {(isSidebarOpen || isMobileMenuOpen) && <h1 className="text-xl font-bold ml-2">B.M Contigo</h1>}
            </div>
            <nav className="flex-1 p-4">
                <ul>
                   {isAuthenticated ? (
                        <>
                            {/* Admin Order */}
                            <NavItem icon={<LayoutDashboard />} label="Panel" view="dashboard" currentView={currentView} onClick={(v) => setCurrentView(v!)} isSidebarOpen={isSidebarOpen || isMobileMenuOpen} />
                            <NavItem icon={<FileText />} label="Solicitud de Préstamo" view="loanRequest" currentView={currentView} onClick={(v) => setCurrentView(v!)} isSidebarOpen={isSidebarOpen || isMobileMenuOpen} />
                            <NavItem icon={<GitPullRequest />} label="Gestión de Solicitudes" view="requests" currentView={currentView} onClick={(v) => setCurrentView(v!)} isSidebarOpen={isSidebarOpen || isMobileMenuOpen} badge={requests.length} />
                            <NavItem icon={<Users />} label="Clientes" view="clients" currentView={currentView} onClick={(v) => setCurrentView(v!)} isSidebarOpen={isSidebarOpen || isMobileMenuOpen} />
                        </>
                    ) : (
                        <>
                            {/* Public Order */}
                            <NavItem icon={<Home />} label="Bienvenida" view="welcome" currentView={currentView} onClick={(v) => setCurrentView(v!)} isSidebarOpen={isSidebarOpen || isMobileMenuOpen} />
                            <NavItem icon={<FileText />} label="Solicitud de Préstamo" view="loanRequest" currentView={currentView} onClick={(v) => setCurrentView(v!)} isSidebarOpen={isSidebarOpen || isMobileMenuOpen} />
                            <NavItem icon={<SearchCheck />} label="Consultar Solicitud" view="requestStatusChecker" currentView={currentView} onClick={(v) => setCurrentView(v!)} isSidebarOpen={isSidebarOpen || isMobileMenuOpen} />
                        </>
                    )}
                </ul>
                 {isAuthenticated && (isSidebarOpen || isMobileMenuOpen) && (
                    <>
                        <div className="mt-4 pt-4 border-t border-gray-700">
                            <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Herramientas</h3>
                             <ul>
                                <NavItem icon={<Settings />} label="Ajustes" view="settings" currentView={currentView} onClick={(v) => setCurrentView(v!)} isSidebarOpen={isSidebarOpen || isMobileMenuOpen} />
                                <NavItem icon={<ReceiptText />} label="Generar Recibo" view="receiptGenerator" currentView={currentView} onClick={(v) => setCurrentView(v!)} isSidebarOpen={isSidebarOpen || isMobileMenuOpen} />
                                <NavItem icon={<DatabaseBackup />} label="Gestión de Datos" view="dataManagement" currentView={currentView} onClick={(v) => setCurrentView(v!)} isSidebarOpen={isSidebarOpen || isMobileMenuOpen} />
                            </ul>
                        </div>
                    </>
                )}
            </nav>
             <div className="p-4 border-t border-gray-700">
                {isAuthenticated ? (
                     <button
                        onClick={logout}
                        className="w-full flex items-center justify-center p-3 my-1 rounded-lg cursor-pointer text-gray-300 hover:bg-gray-700 hover:text-white"
                        aria-label="Cerrar sesión"
                    >
                        <LogOut />
                        <span className={`ml-4 transition-opacity duration-300 ${(isSidebarOpen || isMobileMenuOpen) ? 'opacity-100' : 'opacity-0 h-0 w-0'}`}>
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
                        <span className={`ml-4 transition-opacity duration-300 ${(isSidebarOpen || isMobileMenuOpen) ? 'opacity-100' : 'opacity-0 h-0 w-0'}`}>
                            Acceder
                        </span>
                    </button>
                )}
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="w-full hidden md:flex justify-center p-2 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white mt-2">
                    {isSidebarOpen ? <ChevronLeft /> : <ChevronRight />}
                </button>
            </div>
        </>
    );

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
            <div className="flex h-screen bg-gray-100">
                 {/* Mobile Header */}
                <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-gray-800 text-white flex items-center justify-between px-4 z-30 shadow-lg">
                    <div className="flex items-center gap-2">
                         <Handshake className="text-blue-400 h-7 w-7" />
                         <h1 className="text-lg font-bold">B.M Contigo</h1>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(true)} className="p-2">
                        <Menu />
                    </button>
                </header>

                {/* Mobile Sidebar (Overlay) */}
                <div className={`md:hidden fixed inset-0 z-40 transition-transform transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                     <div className="fixed inset-0 bg-black/60" onClick={() => setIsMobileMenuOpen(false)}></div>
                     <aside className="relative bg-gray-800 text-white w-64 h-full flex flex-col">
                        <SidebarContent />
                     </aside>
                </div>

                 {/* Desktop Sidebar */}
                 <aside className={`bg-gray-800 text-white hidden md:flex flex-col transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
                    <SidebarContent />
                </aside>
                
                <main className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 overflow-y-auto md:pt-6 pt-20">
                     {isAuthenticated && isAdminBannerVisible && (
                        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-md mb-6 flex items-center justify-between shadow-md">
                            <div className="flex items-center">
                                <ShieldCheck className="h-6 w-6 mr-4 flex-shrink-0" />
                                <div>
                                    <p className="font-bold">Conectado a Supabase</p>
                                    {projectRef ? (
                                        <p className="text-xs font-mono text-green-800">ID del Proyecto: {projectRef}</p>
                                    ) : (
                                        <p className="text-xs">No se pudo identificar el ID del proyecto.</p>
                                    )}
                                </div>
                            </div>
                            <button onClick={() => setIsAdminBannerVisible(false)} className="p-1 rounded-full hover:bg-green-200">
                                <X className="h-4 w-4 text-green-800" />
                            </button>
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