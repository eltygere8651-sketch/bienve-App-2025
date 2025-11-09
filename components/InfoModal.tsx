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
            className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" 
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="info-modal-title"
        >
            <div
                className="bg-white rounded-lg shadow-xl w-full max-w-lg transform transition-all animate-fade-in-down"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 flex justify-between items-center border-b border-slate-200">
                    <h3 className="text-lg leading-6 font-bold text-slate-900 flex items-center" id="info-modal-title">
                        <Info className="h-6 w-6 text-primary-500 mr-3" />
                        {title}
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100">
                        <X className="h-6 w-6 text-slate-500" />
                    </button>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {children}
                </div>
                <div className="bg-slate-50 px-6 py-3 flex justify-end rounded-b-lg">
                    <button
                        type="button"
                        className="w-full inline-flex justify-center rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:w-auto sm:text-sm"
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