


import React, { useState, useEffect, useMemo } from 'react';
import { PenSquare, Handshake, Download, Search } from 'lucide-react';
import BudgetCalculator from './BudgetCalculator';
import { useAppContext } from '../contexts/AppContext';
import InstallPWAInstructions from './InstallPWAInstructions';

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
                             <button 
                                onClick={() => setCurrentView('loanRequest')}
                                className="mt-8 w-full md:w-auto inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white font-bold rounded-lg shadow-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-transform hover:scale-105"
                             >
                                <PenSquare size={18} className="mr-2" />
                                Iniciar una Solicitud
                             </button>
                        </div>
                        <div className="hidden md:block">
                            <LargeLogo />
                        </div>
                    </div>
                </div>

                {!isInStandaloneMode && (
                    <div className="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center">
                             <div className="bg-primary-500/10 text-primary-400 p-3 rounded-full mr-4">
                                <Download className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-100">Instala la Aplicación</h3>
                                <p className="text-sm text-slate-400">Accede a B.M Contigo directamente desde tu escritorio o pantalla de inicio.</p>
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

                 <div className="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center">
                                <div className="bg-emerald-500/10 text-emerald-400 p-3 rounded-full mr-4">
                                <Search className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-100">Consulta el Estado de tu Solicitud</h3>
                                <p className="text-sm text-slate-400">Verifica el estado actual de tu préstamo utilizando tu DNI/NIE.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setCurrentView('requestStatus')}
                            className="w-full sm:w-auto flex-shrink-0 inline-flex items-center justify-center px-5 py-2 bg-emerald-600 text-white font-bold rounded-lg shadow-md hover:bg-emerald-700 transition-transform hover:scale-105"
                        >
                            Consultar Ahora
                        </button>
                    </div>
                </div>

                <BudgetCalculator />
            </div>
        </>
    );
};

export default Welcome;