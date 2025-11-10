import React from 'react';
import { PenSquare, Handshake } from 'lucide-react';
import BudgetCalculator from './BudgetCalculator';
import { useAppContext } from '../contexts/AppContext';

const LargeLogo = () => (
    <div className="flex items-center justify-center w-full h-full">
        <div className="bg-slate-700/50 rounded-full w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center shadow-2xl shadow-primary-500/10 border-4 border-slate-700">
            <Handshake className="text-primary-500 w-32 h-32 sm:w-48 sm:h-48" strokeWidth={1.5} />
        </div>
    </div>
);


const Welcome: React.FC = () => {
    const { setCurrentView } = useAppContext();

    return (
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

            <BudgetCalculator />
        </div>
    );
};

export default Welcome;