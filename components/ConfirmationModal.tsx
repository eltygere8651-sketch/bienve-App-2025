import React from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    type: 'info' | 'warning';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    type,
}) => {
    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm();
        onCancel(); // Close modal after action
    };

    const isWarning = type === 'warning';
    const iconContainerClasses = isWarning ? 'bg-red-900/50' : 'bg-primary-900/50';
    const iconClasses = isWarning ? 'text-red-400' : 'text-primary-400';
    const buttonClasses = isWarning 
        ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
        : 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500';

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4 animate-modal-backdrop" 
            onClick={onCancel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div
                className="bg-slate-800 rounded-lg shadow-xl w-full max-w-md transform transition-all border border-slate-700 animate-modal-content"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6">
                    <div className="flex items-start">
                        <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full sm:mx-0 sm:h-10 sm:w-10 ${iconContainerClasses}`}>
                           {isWarning ? (
                                <AlertTriangle className={`h-6 w-6 ${iconClasses}`} aria-hidden="true" />
                           ) : (
                                <CheckCircle className={`h-6 w-6 ${iconClasses}`} aria-hidden="true" />
                           )}
                        </div>
                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                            <h3 className="text-lg leading-6 font-bold text-slate-100" id="modal-title">
                                {title}
                            </h3>
                            <div className="mt-2">
                                <p className="text-sm text-slate-400">
                                    {message}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-900/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg">
                    <button
                        type="button"
                        className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${buttonClasses}`}
                        onClick={handleConfirm}
                    >
                        Confirmar
                    </button>
                    <button
                        type="button"
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-600 shadow-sm px-4 py-2 bg-slate-700 text-base font-medium text-slate-200 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm"
                        onClick={onCancel}
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;