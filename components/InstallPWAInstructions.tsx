
import React from 'react';
import { X } from 'lucide-react';

// Specific icons for better visual guidance on iOS
const IosShareIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mx-1 text-blue-500 align-middle">
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
        <polyline points="16 6 12 2 8 6"/>
        <line x1="12" y1="2" x2="12" y2="15"/>
    </svg>
);

const IosAddIcon = () => (
    <div className="inline-flex items-center justify-center w-7 h-7 bg-slate-200 rounded-md mx-1 align-middle">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
    </div>
);


interface InstallPWAInstructionsProps {
    onClose: () => void;
}

const InstallPWAInstructions: React.FC<InstallPWAInstructionsProps> = ({ onClose }) => (
    <div
        className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
    >
        <div
            className="bg-white rounded-lg shadow-xl w-full max-w-sm transform transition-all animate-fade-in-down"
            onClick={e => e.stopPropagation()}
        >
            <div className="p-4 flex justify-between items-center border-b">
                <h3 className="text-lg font-bold text-slate-800">Instalar Aplicación</h3>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100"><X /></button>
            </div>
            <div className="p-6 space-y-4 text-center">
                <p className="text-slate-600">Para instalar la aplicación en tu iPhone o iPad, sigue estos sencillos pasos:</p>
                <div className="text-left space-y-4">
                    <div className="flex items-center">
                        <span className="flex items-center justify-center w-6 h-6 bg-primary-500 text-white rounded-full mr-3 font-bold text-sm flex-shrink-0">1</span>
                        <div>
                            <span>Toca el botón de <strong>Compartir</strong></span>
                            <IosShareIcon />
                            <span>en la barra de tu navegador.</span>
                        </div>
                    </div>
                     <div className="flex items-center">
                        <span className="flex items-center justify-center w-6 h-6 bg-primary-500 text-white rounded-full mr-3 font-bold text-sm flex-shrink-0">2</span>
                         <div>
                            <span>Busca y selecciona</span>
                            <IosAddIcon />
                            <strong>"Añadir a pantalla de inicio"</strong>.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

export default InstallPWAInstructions;
