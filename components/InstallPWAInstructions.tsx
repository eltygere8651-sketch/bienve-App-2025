
import React from 'react';
import { X, Share, PlusSquare } from 'lucide-react';

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
                <p className="text-slate-600">Para instalar la aplicación en tu dispositivo iOS, sigue estos pasos:</p>
                <div className="text-left space-y-3">
                    <p className="flex items-center"><span className="flex items-center justify-center w-6 h-6 bg-primary-500 text-white rounded-full mr-3 font-bold text-sm">1</span> Toca el botón de <strong>Compartir</strong> <Share className="inline-block mx-1 h-5 w-5 text-primary-600" /> en la barra de herramientas de Safari.</p>
                    <p className="flex items-center"><span className="flex items-center justify-center w-6 h-6 bg-primary-500 text-white rounded-full mr-3 font-bold text-sm">2</span> Desliza hacia arriba y selecciona <strong>"Añadir a la pantalla de inicio"</strong> <PlusSquare className="inline-block mx-1 h-5 w-5 text-primary-600" />.</p>
                </div>
            </div>
        </div>
    </div>
);

export default InstallPWAInstructions;
