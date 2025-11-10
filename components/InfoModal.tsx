import React from 'react';
import { X, Info } from 'lucide-react';

interface InfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4" 
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="info-modal-title"
        >
            <div
                className="bg-slate-800 rounded-lg shadow-xl w-full max-w-lg transform transition-all animate-fade-in-down border border-slate-700"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 flex justify-between items-center border-b border-slate-700">
                    <h3 className="text-lg leading-6 font-bold text-slate-100 flex items-center" id="info-modal-title">
                        <Info className="h-6 w-6 text-primary-400 mr-3" />
                        {title}
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-700">
                        <X className="h-6 w-6 text-slate-400" />
                    </button>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {children}
                </div>
                <div className="bg-slate-900/50 px-6 py-3 flex justify-end rounded-b-lg">
                    <button
                        type="button"
                        className="w-full inline-flex justify-center rounded-md border border-slate-600 shadow-sm px-4 py-2 bg-slate-700 text-base font-medium text-slate-200 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:w-auto sm:text-sm"
                        onClick={onClose}
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InfoModal;