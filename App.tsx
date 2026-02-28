
import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { AppView } from './types';
import Dashboard from './components/Dashboard';
import Auth from './components/Auth';
import Welcome from './components/Welcome';
import Toast from './components/Toast';
import ConfirmationModal from './components/ConfirmationModal';
import NavItem from './components/NavItem';
import { Handshake, LayoutDashboard, Users, FileText, GitPullRequest, Loader2, LogOut, LogIn, ChevronLeft, ChevronRight, Home, ReceiptText, Settings, DatabaseBackup, Menu, Share2, Download, History, PieChart, Calculator } from 'lucide-react';
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
const Accounting = React.lazy(() => import('./components/Accounting'));
const LoanCalculator = React.lazy(() => import('./components/LoanCalculator'));

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
    
    // Close mobile menu when view changes (Integration Fix)
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [currentView]);

    const handleLogoClick = () => {
        setCurrentView(isAuthenticated ? 'dashboard' : 'welcome');
        setIsMobileMenuOpen(false);
    };

    const handleNavClick = (view?: AppView) => {
        if (view) setCurrentView(view);
        setIsMobileMenuOpen(false); // Auto close menu on click
    };

    // Componente interno para los botones de acción
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
            <div className="flex flex-col justify-center items-center h-screen bg-slate-900 fixed inset-0 z-50">
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
                <div className="bg-red-900/20 border border-red-500/20 backdrop-blur-md text-red-200 p-6 rounded-2xl shadow-lg m-4">
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
                        case 'accounting': return isAuthenticated ? <Accounting /> : <Auth />;
                        case 'history': return isAuthenticated ? <HistoryPanel /> : <Auth />;
                        case 'settings': return isAuthenticated ? <SettingsComponent /> : <Auth />;
                        case 'dataManagement': return isAuthenticated ? <DataManagement /> : <Auth />;
                        case 'loanCalculator': return isAuthenticated ? <LoanCalculator /> : <Auth />;
                        default: return isAuthenticated ? <Dashboard /> : <Welcome />;
                    }
                })()}
            </Suspense>
        );
    };

    const SidebarContent = () => (
        <div className="flex flex-col h-full">
            <div 
                className="flex items-center justify-center h-24 cursor-pointer mb-2 flex-shrink-0"
                onClick={handleLogoClick}
                title="Ir al inicio"
            >
                <div className="relative flex items-center">
                    <div className="absolute -inset-4 bg-primary-500/20 blur-xl rounded-full opacity-40"></div>
                    <Handshake className="text-primary-400 h-9 w-9 relative z-10" />
                    {(isSidebarOpen || isMobileMenuOpen) && (
                        <h1 className="text-2xl font-heading font-bold ml-3 text-white tracking-tight relative z-10">
                            B.M Contigo
                        </h1>
                    )}
                </div>
            </div>

            <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto scrollbar-hide">
                {isAuthenticated ? (
                    <>
                        <NavItem icon={<LayoutDashboard />} label="Panel" view="dashboard" currentView={currentView} onClick={handleNavClick} isSidebarOpen={isSidebarOpen || isMobileMenuOpen} />
                        <NavItem icon={<PieChart />} label="Contabilidad" view="accounting" currentView={currentView} onClick={handleNavClick} isSidebarOpen={isSidebarOpen || isMobileMenuOpen} />
                        <NavItem icon={<GitPullRequest />} label="Solicitudes" view="requests" currentView={currentView} onClick={handleNavClick} isSidebarOpen={isSidebarOpen || isMobileMenuOpen} badge={requests.length} />
                        <NavItem icon={<Users />} label="Clientes" view="clients" currentView={currentView} onClick={handleNavClick} isSidebarOpen={isSidebarOpen || isMobileMenuOpen} />
                        <NavItem icon={<History />} label="Historial" view="history" currentView={currentView} onClick={handleNavClick} isSidebarOpen={isSidebarOpen || isMobileMenuOpen} />
                    </>
                ) : (
                    <>
                        <NavItem icon={<Home />} label="Bienvenida" view="welcome" currentView={currentView} onClick={handleNavClick} isSidebarOpen={isSidebarOpen || isMobileMenuOpen} />
                        <NavItem icon={<FileText />} label="Iniciar Solicitud" view="loanRequest" currentView={currentView} onClick={handleNavClick} isSidebarOpen={isSidebarOpen || isMobileMenuOpen} />
                    </>
                )}

                 {isAuthenticated && (isSidebarOpen || isMobileMenuOpen) && (
                    <>
                        <div className="mt-8 mb-3 px-3">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Herramientas</h3>
                        </div>
                        <NavItem icon={<Calculator />} label="Calculadora" view="loanCalculator" currentView={currentView} onClick={handleNavClick} isSidebarOpen={isSidebarOpen || isMobileMenuOpen} />
                        <NavItem icon={<ReceiptText />} label="Recibos" view="receiptGenerator" currentView={currentView} onClick={handleNavClick} isSidebarOpen={isSidebarOpen || isMobileMenuOpen} />
                        <NavItem icon={<DatabaseBackup />} label="Base de Datos" view="dataManagement" currentView={currentView} onClick={handleNavClick} isSidebarOpen={isSidebarOpen || isMobileMenuOpen} />
                        <NavItem icon={<Settings />} label="Ajustes" view="settings" currentView={currentView} onClick={handleNavClick} isSidebarOpen={isSidebarOpen || isMobileMenuOpen} />
                    </>
                )}
            </nav>

             <div className="p-5 border-t border-white/5 bg-black/10 flex-shrink-0 safe-area-bottom">
                {/* BOTONES DE UTILIDAD (PC) */}
                <div className={`grid ${isSidebarOpen || isMobileMenuOpen ? 'grid-cols-2' : 'grid-cols-1'} gap-3 mb-4`}>
                     {!isInStandaloneMode && (
                        <button 
                            onClick={handleInstallApp}
                            className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all border border-white/5 group shadow-sm hover:shadow-md"
                            title="Instalar App"
                        >
                            <Download size={20} className="group-hover:text-emerald-400 transition-colors" />
                            {(isSidebarOpen || isMobileMenuOpen) && <span className="text-[10px] mt-1 font-bold uppercase tracking-wide">Instalar</span>}
                        </button>
                    )}
                    <button 
                        onClick={() => setIsShareModalOpen(true)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all border border-white/5 group shadow-sm hover:shadow-md ${isInStandaloneMode ? 'col-span-2' : ''}`}
                        title="Compartir App"
                    >
                        <Share2 size={20} className="group-hover:text-primary-400 transition-colors" />
                        {(isSidebarOpen || isMobileMenuOpen) && <span className="text-[10px] mt-1 font-bold uppercase tracking-wide">Compartir</span>}
                    </button>
                </div>

                {isAuthenticated ? (
                     <button
                        onClick={logout}
                        className="w-full flex items-center justify-center p-3 rounded-xl cursor-pointer text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all group border border-transparent hover:border-red-500/20"
                        aria-label="Cerrar sesión"
                    >
                        <LogOut size={20} />
                        <span className={`ml-3 font-medium transition-all duration-300 ${(isSidebarOpen || isMobileMenuOpen) ? 'opacity-100' : 'opacity-0 h-0 w-0 overflow-hidden'}`}>
                            Cerrar Sesión
                        </span>
                    </button>
                ) : (
                    <button
                        onClick={() => { setCurrentView('auth'); setIsMobileMenuOpen(false); }}
                        className="w-full flex items-center justify-center p-3 rounded-xl cursor-pointer text-slate-400 hover:bg-white/5 hover:text-white transition-all border border-transparent hover:border-white/10"
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
            
            {/* 
                LAYOUT FIXED PARA IOS/MOBILE 
                Usamos fixed inset-0 en lugar de h-screen para evitar rebotes de scroll en body
            */}
            <div className="fixed inset-0 flex bg-slate-900 font-sans text-slate-300 overflow-hidden">
                 {/* Mobile Header */}
                <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900/90 backdrop-blur-xl flex items-center justify-between px-4 z-30 border-b border-white/5">
                    <div className="flex items-center gap-2" onClick={handleLogoClick}>
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
                <div className={`md:hidden fixed inset-0 z-50 transition-transform duration-300 ease-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                     <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
                     <aside className="relative bg-slate-900 w-[85vw] max-w-sm h-full border-r border-white/5 shadow-2xl flex flex-col">
                        <SidebarContent />
                     </aside>
                </div>

                 {/* Desktop Sidebar */}
                 <aside className={`hidden md:flex transition-all duration-300 ease-in-out border-r border-white/5 bg-slate-900/40 backdrop-blur-xl flex-col ${isSidebarOpen ? 'w-72' : 'w-20'}`}>
                    <SidebarContent />
                </aside>
                
                {/* Main Content Area */}
                <main className="flex-1 flex flex-col h-full relative w-full">
                    {/* Background Ambient Glow */}
                    <div className="absolute top-0 left-0 w-full h-96 bg-primary-900/10 rounded-full blur-[120px] -translate-y-1/2 pointer-events-none"></div>

                    {/* Scrollable Container - FIX: Added pb-32 for extra mobile spacing */}
                    <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-10 pt-20 md:pt-8 scroll-smooth pb-32 touch-pan-y">
                        <div className="max-w-7xl mx-auto w-full h-full">
                            {renderContent()}
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
};

export default App;
