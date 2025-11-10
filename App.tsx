
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
import { Handshake, LayoutDashboard, Users, FileText, GitPullRequest, Loader2, LogOut, LogIn, ChevronLeft, ChevronRight, Home, ReceiptText, Settings, DatabaseBackup, Wrench, AlertTriangle, ShieldCheck, Menu, X, Calculator, Search } from 'lucide-react';
import { useAppContext } from './contexts/AppContext';
import { useDataContext } from './contexts/DataContext';
import ReceiptGenerator from './components/ReceiptGenerator';
import SettingsComponent from './components/Settings';
import DataManagement from './components/DataManagement';
import Accounting from './components/Accounting';
import NewClientForm from './components/NewClientForm';
import InstallNavItem from './components/InstallNavItem';

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
        isAuthenticated,
        logout,
        initializationStatus,
        supabaseConfig,
    } = useAppContext();
    
    const { requests, isLoading, error } = useDataContext();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isAdminBannerVisible, setIsAdminBannerVisible] = useState(true);

    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [currentView]);

    const handleLogoClick = () => {
        setCurrentView(isAuthenticated ? 'dashboard' : 'welcome');
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

    if (initializationStatus === 'pending') {
        return (
            <div className="flex flex-col justify-center items-center h-screen bg-slate-900">
                <Loader2 className="h-16 w-16 animate-spin text-primary-500" />
                <p className="mt-4 text-slate-400">Inicializando aplicación...</p>
            </div>
        );
    }
    
    if (initializationStatus === 'failed') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-red-900/20 p-4">
                <div className="w-full max-w-lg bg-slate-800 p-8 rounded-xl shadow-lg text-center border border-red-500/30">
                     <AlertTriangle className="text-red-500 h-16 w-16 mx-auto" />
                     <h1 className="text-2xl font-bold mt-4 text-slate-100">Error Crítico de Configuración</h1>
                     <p className="text-slate-400 mt-2">
                        La aplicación no pudo conectarse. Por favor, verifica tu configuración de Supabase.
                     </p>
                </div>
            </div>
        );
    }
    
    const renderContent = () => {
        if (isLoading && isAuthenticated) {
            return (
                <div className="flex justify-center items-center h-full">
                    <Loader2 className="h-12 w-12 animate-spin text-primary-500" />
                </div>
            );
        }

        if (error) {
            return (
                <div className="bg-red-900/30 border-l-4 border-red-500 text-red-300 p-6 rounded-lg shadow-md">
                    <h3 className="font-bold text-lg text-red-200">Error de Carga</h3>
                    <p className="mt-2">{error}</p>
                </div>
            );
        }
        
        switch (currentView) {
            case 'welcome': return <Welcome />;
            case 'dashboard': return <Dashboard />;
            case 'clients': return isAuthenticated ? <ClientList /> : <Auth />;
            case 'newClient': return isAuthenticated ? <NewClientForm /> : <Auth />;
            case 'loanRequest': return <LoanRequestForm />;
            case 'requests': return isAuthenticated ? <RequestList /> : <Auth />;
            case 'auth': return <Auth />;
            case 'receiptGenerator': return isAuthenticated ? <ReceiptGenerator /> : <Auth />;
            case 'settings': return isAuthenticated ? <SettingsComponent /> : <Auth />;
            case 'dataManagement': return isAuthenticated ? <DataManagement /> : <Auth />;
            case 'accounting': return isAuthenticated ? <Accounting /> : <Auth />;
            default: return isAuthenticated ? <Dashboard /> : <Welcome />;
        }
    };

    const SidebarContent = () => (
        <>
            <div 
                className="flex items-center justify-center p-4 border-b border-slate-700 h-16 cursor-pointer"
                onClick={handleLogoClick}
                title="Ir al inicio"
            >
                 <Handshake className="text-primary-500 h-8 w-8" />
                 {(isSidebarOpen || isMobileMenuOpen) && <h1 className="text-xl font-bold ml-2 text-slate-100">B.M Contigo</h1>}
            </div>
            <nav className="flex-1 p-2">
                <ul>
                   {isAuthenticated ? (
                        <>
                            {/* Admin Order */}
                            <NavItem icon={<LayoutDashboard />} label="Panel" view="dashboard" currentView={currentView} onClick={(v) => setCurrentView(v!)} isSidebarOpen={isSidebarOpen || isMobileMenuOpen} />
                            <NavItem icon={<FileText />} label="Iniciar una Solicitud" view="loanRequest" currentView={currentView} onClick={(v) => setCurrentView(v!)} isSidebarOpen={isSidebarOpen || isMobileMenuOpen} />
                            <NavItem icon={<GitPullRequest />} label="Solicitudes" view="requests" currentView={currentView} onClick={(v) => setCurrentView(v!)} isSidebarOpen={isSidebarOpen || isMobileMenuOpen} badge={requests.length} />
                            <NavItem icon={<Users />} label="Clientes" view="clients" currentView={currentView} onClick={(v) => setCurrentView(v!)} isSidebarOpen={isSidebarOpen || isMobileMenuOpen} />
                        </>
                    ) : (
                        <>
                            {/* Public Order */}
                            <NavItem icon={<Home />} label="Bienvenida" view="welcome" currentView={currentView} onClick={(v) => setCurrentView(v!)} isSidebarOpen={isSidebarOpen || isMobileMenuOpen} />
                            <NavItem icon={<FileText />} label="Iniciar una Solicitud" view="loanRequest" currentView={currentView} onClick={(v) => setCurrentView(v!)} isSidebarOpen={isSidebarOpen || isMobileMenuOpen} />
                        </>
                    )}
                    <InstallNavItem isSidebarOpen={isSidebarOpen || isMobileMenuOpen} />
                </ul>
                 {isAuthenticated && (isSidebarOpen || isMobileMenuOpen) && (
                    <>
                        <div className="mt-4 pt-4 border-t border-slate-700">
                            <h3 className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Herramientas</h3>
                             <ul className="p-2">
                                <NavItem icon={<Calculator />} label="Contabilidad" view="accounting" currentView={currentView} onClick={(v) => setCurrentView(v!)} isSidebarOpen={isSidebarOpen || isMobileMenuOpen} />
                                <NavItem icon={<Settings />} label="Ajustes" view="settings" currentView={currentView} onClick={(v) => setCurrentView(v!)} isSidebarOpen={isSidebarOpen || isMobileMenuOpen} />
                                <NavItem icon={<ReceiptText />} label="Generar Recibo" view="receiptGenerator" currentView={currentView} onClick={(v) => setCurrentView(v!)} isSidebarOpen={isSidebarOpen || isMobileMenuOpen} />
                                <NavItem icon={<DatabaseBackup />} label="Gestión de Datos" view="dataManagement" currentView={currentView} onClick={(v) => setCurrentView(v!)} isSidebarOpen={isSidebarOpen || isMobileMenuOpen} />
                            </ul>
                        </div>
                    </>
                )}
            </nav>
             <div className="p-4 border-t border-slate-700">
                {isAuthenticated ? (
                     <button
                        onClick={logout}
                        className="w-full flex items-center justify-center p-3 my-1 rounded-lg cursor-pointer text-slate-300 hover:bg-slate-700 hover:text-white"
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
                        className="w-full flex items-center justify-center p-3 my-1 rounded-lg cursor-pointer text-slate-300 hover:bg-slate-700 hover:text-white"
                        aria-label="Acceder o registrarse"
                    >
                        <LogIn />
                        <span className={`ml-4 transition-opacity duration-300 ${(isSidebarOpen || isMobileMenuOpen) ? 'opacity-100' : 'opacity-0 h-0 w-0'}`}>
                            Acceder
                        </span>
                    </button>
                )}
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="w-full hidden md:flex justify-center p-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white mt-2">
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
                type={confirmState.type}
            />
            <div className="flex h-screen bg-slate-900 font-sans">
                 {/* Mobile Header */}
                <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-800/80 backdrop-blur-sm text-slate-100 flex items-center justify-between px-4 z-30 border-b border-slate-700">
                    <div className="flex items-center gap-2">
                         <Handshake className="text-primary-500 h-7 w-7" />
                         <h1 className="text-lg font-bold">B.M Contigo</h1>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(true)} className="p-2">
                        <Menu />
                    </button>
                </header>

                {/* Mobile Sidebar (Overlay) */}
                <div className={`md:hidden fixed inset-0 z-40 transition-transform transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                     <div className="fixed inset-0 bg-black/60" onClick={() => setIsMobileMenuOpen(false)}></div>
                     <aside className="relative bg-slate-800 text-slate-100 w-64 h-full flex flex-col border-r border-slate-700">
                        <SidebarContent />
                     </aside>
                </div>

                 {/* Desktop Sidebar */}
                 <aside className={`bg-slate-800 text-slate-100 hidden md:flex flex-col transition-all duration-300 border-r border-slate-700 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
                    <SidebarContent />
                </aside>
                
                <main className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 overflow-y-auto md:pt-6 pt-20">
                     {isAuthenticated && isAdminBannerVisible && (
                        <div className="bg-green-900/50 border border-green-800 text-green-300 p-4 rounded-xl mb-6 flex items-center justify-between shadow-sm">
                            <div className="flex items-center">
                                <ShieldCheck className="h-6 w-6 mr-4 flex-shrink-0 text-green-400" />
                                <div>
                                    <p className="font-bold">Conectado a Supabase</p>
                                    {projectRef ? (
                                        <p className="text-xs font-mono">Proyecto: {projectRef}</p>
                                    ) : (
                                        <p className="text-xs">No se pudo identificar el ID del proyecto.</p>
                                    )}
                                </div>
                            </div>
                            <button onClick={() => setIsAdminBannerVisible(false)} className="p-1 rounded-full hover:bg-green-800/50">
                                <X className="h-4 w-4 text-green-200" />
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
