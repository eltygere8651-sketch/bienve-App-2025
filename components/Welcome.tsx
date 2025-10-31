import React from 'react';
import { HeartHandshake, FileText } from 'lucide-react';
import BudgetCalculator from './BudgetCalculator';
import { useAppContext } from '../contexts/AppContext';

const Welcome: React.FC = () => {
    const { setCurrentView } = useAppContext();

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="bg-white p-8 rounded-2xl shadow-lg">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">
                    Bienvenido a <span className="text-blue-600">B.M Contigo</span>
                </h1>
                <p className="mt-2 text-lg text-gray-600">Tu aliado para alcanzar tus metas financieras.</p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-md">
                 <div className="flex items-center text-blue-600">
                    <HeartHandshake className="h-8 w-8 mr-3" />
                    <h2 className="text-xl font-bold">Nuestro Compromiso</h2>
                 </div>
                 <p className="mt-4 text-gray-600">
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