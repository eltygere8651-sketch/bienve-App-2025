
import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { AppView } from './types';
import Dashboard from './components/Dashboard';
import Auth from './components/Auth';
import Welcome from './components/Welcome';
import Toast from './components/Toast';
import ConfirmationModal from './components/ConfirmationModal';
import NavItem from './components/NavItem';
import { Handshake, LayoutDashboard, Users, FileText, GitPullRequest, Loader2, LogOut, LogIn, ChevronLeft, ChevronRight, Home, ReceiptText, Settings, DatabaseBackup, Menu, Share2, Download, History } from 'lucide-react';
import { useAppContext } from './contexts/AppContext';
import { useDataContext } from './contexts/DataContext';
import LoanRequestForm from './components/LoanRequestForm';
import ShareApp from './components/ShareApp';
import InstallPWAInstructions from './components/InstallPWAInstructions';

// Lazy load heavy components to optimize initial load time
const ClientList = React.lazy(() => import('./components/ClientList'));
const RequestList = React.lazy(() => import('./components/RequestList'));
const ReceiptGenerator = React.lazy(() => import('./components/ReceiptGenerator'));
const SettingsComponent = React.lazy(() => import('./components/Settings'));
const DataManagement = React.lazy(() => import('./components/DataManagement'));
const NewClientForm = React.lazy(() => import('./components/NewClientForm'));
const HistoryPanel = React.lazy(() => import('./components/HistoryPanel'));

const LoadingFallback = () => (
    <div className="flex justify-center items-center h-full min-h-[50vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary-500" />
    </div>
);

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
    } = useAppContext();
    
    const { requests, isLoading: dataIsLoading, error } = useDataContext();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    // --- SHARE & PWA LOGIC ---
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [showInstallInstructions, setShowInstallInstructions] = useState(false);
    const isInStandaloneMode = useMemo(() => window.matchMedia('(display-mode: standalone)').matches, []);

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        // Solo escuchar si no estamos ya en modo app
        if (!isInStandaloneMode) {
            window.addEventListener('beforeinstallprompt', handler);
        }
        return () => {
            if (!isInStandaloneMode) {
                window.removeEventListener('beforeinstallprompt', handler);
            }
        };
    }, [isInStandaloneMode]);

    const handleInstallApp = () => {
        if (installPrompt) {
            installPrompt.prompt();
            installPrompt.userChoice.then((choiceResult: { outcome: string }) => {
                if (choiceResult.outcome === 'accepted') {
                    showToast('¡Aplicación instalada con éxito!', 'success');
                } else {
                    showToast('Instalación cancelada.', 'info');
                }
                setInstallPrompt(null);
            });
        } else {
            setShowInstallInstructions(true);
        }
    };
    // ---------------------------
    
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [currentView]);

    const handleLogoClick = () => {
        setCurrentView(isAuthenticated ? 'dashboard' : 'welcome');
    };

    // Componente interno para los botones de acción (Solo usado en Mobile Header ahora)
    const HeaderActionsMobile = () => (
        <div className="flex items-center gap-1">
            {!isInStandaloneMode && (
                <button 
                    onClick={handleInstallApp}
                    className="p-2 text-slate-300 hover:text-white hover:bg-white/5 rounded-full transition-colors"
                    title="Instalar App"
                >
                    <Download size={20} />
                </button>
            )}
            <button 
                onClick={() => setIsShareModalOpen(true)}
                className="p-2 text-primary-300 hover:text-white hover:bg-primary-500/20 rounded-full transition-colors"
                title="Compartir"
            >
                <Share2 size={20} />
            </button>
        </div>
    );

    if (initializationStatus === 'pending') {
        return (
            <div className="flex flex-col justify-center items-center h-screen bg-slate-900">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary-500/20 blur-xl rounded-full"></div>
                    <Loader2 className="h-16 w-16 animate-spin text-primary-500 relative z-10" />
                </div>
                <p className="mt-6 text-slate-400 font-medium tracking-wide">Conectando...</p>
            </div>
        );
    }
    
    const renderContent = () => {
        if (isAuthenticated && dataIsLoading) {
            return (
                <div className="flex justify-center items-center h-full">
                    <Loader2 className="h-12 w-12 animate-spin text-primary-500" />
                </div>
            );
        }

        if (error) {
            return (
                <div className="bg-red-900/20 border border-red-500/20 backdrop-blur-md text-red-200 p-6 rounded-2xl shadow-lg">
                    <h3 className="font-heading font-bold text-lg">Error de Conexión</h3>
                    <p className="mt-2 text-sm opacity-80">{error}</p>
                </div>
            );
        }
        
        return (
            <Suspense fallback={<LoadingFallback />}>
                {(() => {
                    switch (currentView) {
                        case 'welcome': return <Welcome />;
                        case 'dashboard': return isAuthenticated ? <Dashboard /> : <Auth />;
                        case 'clients': return isAuthenticated ? <ClientList /> : <Auth />;
                        case 'newClient': return isAuthenticated ? <NewClientForm /> : <Auth />;
                        case 'loanRequest': return <LoanRequestForm />;
                        case 'requests': return isAuthenticated ? <RequestList /> : <Auth />;
                        case 'auth': return <Auth />;
                        case 'receiptGenerator': return isAuthenticated ? <ReceiptGenerator /> : <Auth />;
                        case 'history': return isAuthenticated ? <HistoryPanel /> : <Auth />;
                        case 'settings': return isAuthenticated ? <SettingsComponent /> : <Auth />;
                        case 'dataManagement': return isAuthenticated ? <DataManagement /> : <Auth />;
                        default: return isAuthenticated ? <Dashboard /> : <Welcome />;
                    }
                })()}
            </Suspense>
        );
    };

    const SidebarContent = () => (
        <div className="flex flex-col h-full">
            <div 
                className="flex items-center justify-center h-20 cursor-pointer mb-2"
                onClick={handleLogoClick}
                title="Ir al inicio"
            >
                <div className="relative flex items-center">
                    <div className="absolute -inset-2 bg-primary-500/20 blur-lg rounded-full opacity-50"></div>
                    <Handshake className="text-primary-400 h-8 w-8 relative z-10" />
                    {(isSidebarOpen || isMobileMenuOpen) && (
                        <h1 className="text-xl font-heading font-bold ml-3 text-white tracking-tight relative z-10">
                            B.M Contigo
                        </h1>
                    )}
                </div>
            </div>

            <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
                {isAuthenticated ? (
                    <>
                        <NavItem icon={<LayoutDashboard />} label="Panel" view="dashboard" currentView={currentView} onClick={(v) => setCurrentView(v!)} isSidebarOpen={isSidebarOpen || isMobileMenuOpen} />
                        <NavItem icon={<GitPullRequest />} label="Solicitudes" view="requests" currentView={currentView} onClick={(v) => setCurrentView(v!)} isSidebarOpen={isSidebarOpen || isMobileMenuOpen} badge={requests.length} />
                        <NavItem icon={<Users />} label="Clientes" view="clients" currentView={currentView} onClick={(v) => setCurrentView(v!)} isSidebarOpen={isSidebarOpen || isMobileMenuOpen} />
                        <NavItem icon={<History />} label="Historial" view="history" currentView={currentView} onClick={(v) => setCurrentView(v!)} isSidebarOpen={isSidebarOpen || isMobileMenuOpen} />
                    </>
                ) : (
                    <>
                        <NavItem icon={<Home />} label="Bienvenida" view="welcome" currentView={currentView} onClick={(v) => setCurrentView(v!)} isSidebarOpen={isSidebarOpen || isMobileMenuOpen} />
                        <NavItem icon={<FileText />} label="Iniciar Solicitud" view="loanRequest" currentView={currentView} onClick={(v) => setCurrentView(v!)} isSidebarOpen={isSidebarOpen || isMobileMenuOpen} />
                    </>
                )}

                 {isAuthenticated && (isSidebarOpen || isMobileMenuOpen) && (
                    <>
                        <div className="mt-8 mb-2 px-3">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Herramientas</h3>
                        </div>
                        <NavItem icon={<ReceiptText />} label="Recibos" view="receiptGenerator" currentView={currentView} onClick={(v) => setCurrentView(v!)} isSidebarOpen={isSidebarOpen || isMobileMenuOpen} />
                        <NavItem icon={<DatabaseBackup />} label="Base de Datos" view="dataManagement" currentView={currentView} onClick={(v) => setCurrentView(v!)} isSidebarOpen={isSidebarOpen || isMobileMenuOpen} />
                        <NavItem icon={<Settings />} label="Ajustes" view="settings" currentView={currentView} onClick={(v) => setCurrentView(v!)} isSidebarOpen={isSidebarOpen || isMobileMenuOpen} />
                    </>
                )}
            </nav>

             <div className="p-4 border-t border-white/5 bg-black/10">
                {/* BOTONES DE UTILIDAD (PC) - Movidos aquí para no obstruir el contenido principal */}
                <div className={`grid ${isSidebarOpen || isMobileMenuOpen ? 'grid-cols-2' : 'grid-cols-1'} gap-2 mb-4`}>
                     {!isInStandaloneMode && (
                        <button 
                            onClick={handleInstallApp}
                            className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all border border-white/5 group"
                            title="Instalar App"
                        >
                            <Download size={20} className="group-hover:text-emerald-400 transition-colors" />
                            {(isSidebarOpen || isMobileMenuOpen) && <span className="text-[10px] mt-1 font-bold uppercase tracking-wide">Instalar</span>}
                        </button>
                    )}
                    <button 
                        onClick={() => setIsShareModalOpen(true)}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all border border-white/5 group ${isInStandaloneMode ? 'col-span-2' : ''}`}
                        title="Compartir App"
                    >
                        <Share2 size={20} className="group-hover:text-primary-400 transition-colors" />
                        {(isSidebarOpen || isMobileMenuOpen) && <span className="text-[10px] mt-1 font-bold uppercase tracking-wide">Compartir</span>}
                    </button>
                </div>

                {isAuthenticated ? (
                     <button
                        onClick={logout}
                        className="w-full flex items-center justify-center p-3 rounded-xl cursor-pointer text-slate-400 hover:bg-white/5 hover:text-white transition-all group"
                        aria-label="Cerrar sesión"
                    >
                        <LogOut size={20} className="group-hover:text-red-400 transition-colors" />
                        <span className={`ml-3 font-medium transition-all duration-300 ${(isSidebarOpen || isMobileMenuOpen) ? 'opacity-100' : 'opacity-0 h-0 w-0 overflow-hidden'}`}>
                            Cerrar Sesión
                        </span>
                    </button>
                ) : (
                    <button
                        onClick={() => setCurrentView('auth')}
                        className="w-full flex items-center justify-center p-3 rounded-xl cursor-pointer text-slate-400 hover:bg-white/5 hover:text-white transition-all"
                        aria-label="Acceder"
                    >
                        <LogIn size={20} />
                        <span className={`ml-3 font-medium transition-all duration-300 ${(isSidebarOpen || isMobileMenuOpen) ? 'opacity-100' : 'opacity-0 h-0 w-0 overflow-hidden'}`}>
                            Admin
                        </span>
                    </button>
                )}
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="w-full hidden md:flex justify-center p-2 mt-2 text-slate-600 hover:text-slate-300 transition-colors">
                    {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                </button>
            </div>
        </div>
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
            <ShareApp isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} />
            <InstallPWAInstructions isOpen={showInstallInstructions} onClose={() => setShowInstallInstructions(false)} />
            
            {/* Opción 2: Azul Corporativo Profundo (Solid Deep Navy) */}
            <div className="flex h-screen bg-slate-900 font-sans text-slate-300">
                 {/* Mobile Header */}
                <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900/80 backdrop-blur-xl flex items-center justify-between px-4 z-30 border-b border-white/5">
                    <div className="flex items-center gap-2">
                         <Handshake className="text-primary-500 h-6 w-6" />
                         <h1 className="text-lg font-heading font-bold text-white">B.M Contigo</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <HeaderActionsMobile />
                        <div className="w-px h-6 bg-white/10 mx-1"></div>
                        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-slate-300 hover:text-white">
                            <Menu size={24} />
                        </button>
                    </div>
                </header>

                {/* Mobile Sidebar (Overlay) */}
                <div className={`md:hidden fixed inset-0 z-40 transition-transform duration-300 ease-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                     <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
                     <aside className="relative bg-slate-900 w-72 h-full border-r border-white/5 shadow-2xl">
                        <SidebarContent />
                     </aside>
                </div>

                 {/* Desktop Sidebar */}
                 <aside className={`hidden md:block transition-all duration-300 ease-in-out border-r border-white/5 bg-slate-900/40 backdrop-blur-xl ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
                    <SidebarContent />
                </aside>
                
                <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                    {/* Background Ambient Glow */}
                    <div className="absolute top-0 left-0 w-full h-96 bg-primary-900/10 rounded-full blur-[120px] -translate-y-1/2 pointer-events-none"></div>

                    {/* Desktop Header eliminado para no obstruir botones de acción */}

                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 pt-20 md:pt-8 scroll-smooth">
                        <div className="max-w-7xl mx-auto w-full">
                            {renderContent()}
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
};

export default App;
