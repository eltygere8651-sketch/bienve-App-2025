
import React, { useState, useEffect, useMemo } from 'react';
import { PenSquare, Handshake, Download, Search, Share2, Users, QrCode } from 'lucide-react';
import BudgetCalculator from './BudgetCalculator';
import { useAppContext } from '../contexts/AppContext';
import InstallPWAInstructions from './InstallPWAInstructions';
import ShareApp from './ShareApp';

const LargeLogo = () => (
    <div className="flex items-center justify-center w-full h-full">
        <div className="bg-slate-700/50 rounded-full w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center shadow-2xl shadow-primary-500/10 border-4 border-slate-700">
            <Handshake className="text-primary-500 w-32 h-32 sm:w-48 sm:h-48" strokeWidth={1.5} />
        </div>
    </div>
);


const Welcome: React.FC = () => {
    const { setCurrentView, showToast } = useAppContext();
    
    // --- PWA Installation Logic ---
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [showInstructions, setShowInstructions] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
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

    const handleInstallClick = () => {
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
            setShowInstructions(true);
        }
    };
    // --- End PWA Installation Logic ---

    return (
        <>
            <InstallPWAInstructions isOpen={showInstructions} onClose={() => setShowInstructions(false)} />
            <ShareApp isOpen={showShareModal} onClose={() => setShowShareModal(false)} />
            
            <div className="space-y-8 animate-fade-in-down">
                <div className="bg-slate-800 p-8 rounded-2xl shadow-lg border border-slate-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        <div className="text-center md:text-left">
                            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">
                                Tus ideas, <span className="text-primary-400">nuestro impulso.</span>
                            </h1>
                            <p className="mt-4 text-lg text-slate-300">
                                B.M Contigo fortalece lazos de confianza, permitiendo que el apoyo entre personas cercanas sea una realidad tangible y transparente para todos.
                            </p>
                             <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                                <button 
                                    onClick={() => setCurrentView('loanRequest')}
                                    className="inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white font-bold rounded-lg shadow-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-transform hover:scale-105"
                                 >
                                    <PenSquare size={18} className="mr-2" />
                                    Iniciar una Solicitud
                                 </button>
                                 <button 
                                    onClick={() => setShowShareModal(true)}
                                    className="inline-flex items-center justify-center px-6 py-3 bg-slate-700 text-slate-100 font-bold rounded-lg shadow-md hover:bg-slate-600 border border-slate-600 transition-transform hover:scale-105"
                                 >
                                    <Share2 size={18} className="mr-2 text-primary-400" />
                                    Invitar a un amigo
                                 </button>
                             </div>
                        </div>
                        <div className="hidden md:block">
                            <LargeLogo />
                        </div>
                    </div>
                </div>

                {/* Card de Compartir Destacada */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center">
                                <div className="bg-emerald-500/10 text-emerald-400 p-3 rounded-full mr-4">
                                <Search className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-100">Estado de Solicitud</h3>
                                <p className="text-sm text-slate-400">Verifica tu préstamo con tu DNI/NIE.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setCurrentView('requestStatus')}
                            className="w-full sm:w-auto flex-shrink-0 inline-flex items-center justify-center px-5 py-2 bg-emerald-600 text-white font-bold rounded-lg shadow-md hover:bg-emerald-700 transition-transform hover:scale-105"
                        >
                            Consultar
                        </button>
                    </div>

                    {!isInStandaloneMode && (
                        <div className="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center">
                                <div className="bg-primary-500/10 text-primary-400 p-3 rounded-full mr-4">
                                    <Download className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-100">App en tu móvil</h3>
                                    <p className="text-sm text-slate-400">Instala para acceso rápido.</p>
                                </div>
                            </div>
                            <button
                                onClick={handleInstallClick}
                                className="w-full sm:w-auto flex-shrink-0 inline-flex items-center justify-center px-5 py-2 bg-primary-600 text-white font-bold rounded-lg shadow-md hover:bg-primary-700 transition-transform hover:scale-105"
                            >
                                Instalar
                            </button>
                        </div>
                    )}
                </div>

                <BudgetCalculator />

                <div className="bg-gradient-to-r from-primary-900/20 to-slate-800 p-6 rounded-xl border border-primary-500/20 flex flex-col items-center text-center space-y-4">
                    <div className="bg-primary-500/20 p-3 rounded-full">
                        <Users className="text-primary-400 h-8 w-8" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-100">¿Conoces a alguien que necesite un impulso?</h3>
                        <p className="text-slate-400 mt-1 max-w-md">Comparte B.M Contigo con tus familiares y amigos para que también puedan beneficiarse de esta red de confianza.</p>
                    </div>
                    <button 
                        onClick={() => setShowShareModal(true)}
                        className="px-8 py-3 bg-primary-600 text-white font-bold rounded-xl shadow-lg hover:bg-primary-700 transition-all flex items-center gap-2"
                    >
                        <QrCode size={20} />
                        Mostrar código QR para compartir
                    </button>
                </div>
            </div>
        </>
    );
};

export default Welcome;
