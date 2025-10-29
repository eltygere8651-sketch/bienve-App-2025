import React, { useState, useEffect, useCallback } from 'react';
import { getRandomFact } from '../services/geminiService';
import { Lightbulb, Loader2, HeartHandshake, FileText } from 'lucide-react';
import BudgetCalculator from './BudgetCalculator';
import { useAppContext } from '../contexts/AppContext';

const Welcome: React.FC = () => {
    const { setCurrentView } = useAppContext();
    const [fact, setFact] = useState<string>('');
    const [isLoadingFact, setIsLoadingFact] = useState<boolean>(true);

    const fetchFact = useCallback(async () => {
        setIsLoadingFact(true);
        const newFact = await getRandomFact();
        setFact(newFact);
        setIsLoadingFact(false);
    }, []);

    useEffect(() => {
        fetchFact();
    }, [fetchFact]);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
                <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-100">
                    Bienvenido a <span className="text-blue-600 dark:text-blue-400">B.M Contigo</span>
                </h1>
                <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">Tu aliado para alcanzar tus metas financieras.</p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md">
                 <div className="flex items-center text-blue-600 dark:text-blue-400">
                    <HeartHandshake className="h-8 w-8 mr-3" />
                    <h2 className="text-xl font-bold">Nuestro Compromiso</h2>
                 </div>
                 <p className="mt-4 text-gray-600 dark:text-gray-300">
                    En B.M Contigo, creemos en las relaciones basadas en la confianza y el apoyo mutuo. No somos solo un servicio de préstamos; somos una comunidad que te ayuda a construir tus sueños y a navegar tus necesidades financieras con seguridad y transparencia.
                 </p>
                 <button 
                    onClick={() => setCurrentView('loanRequest')}
                    className="mt-6 w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                 >
                    <FileText size={16} className="mr-2" />
                    Iniciar una Solicitud
                 </button>
            </div>

            <BudgetCalculator />

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/50 dark:to-indigo-900/50 p-6 rounded-2xl shadow-md text-gray-700 dark:text-blue-200">
                <div className="flex items-start">
                    <Lightbulb className="h-6 w-6 mr-4 text-blue-500 flex-shrink-0 mt-1" />
                    <div>
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">¿Sabías que...?</h2>
                        {isLoadingFact ? (
                             <div className="h-6 flex items-center mt-2">
                                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                             </div>
                         ) : (
                            <p className="mt-1 text-lg italic">"{fact}"</p>
                         )}
                    </div>
                </div>
            </div>

           
        </div>
    );
};

// Add fade-in animation
if (!document.getElementById('welcome-animations')) {
    const style = document.createElement('style');
    style.id = 'welcome-animations';
    style.innerHTML = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
            animation: fadeIn 0.5s ease-out forwards;
        }
    `;
    document.head.appendChild(style);
}

export default Welcome;