import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
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
    const [isProcessing, setIsProcessing] = useState(false);

    // Reset processing state if the modal is closed externally (e.g., by navigation)
    useEffect(() => {
        if (!isOpen) {
            setIsProcessing(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        setIsProcessing(true);
        try {
            await onConfirm();
            onCancel(); // Close modal ONLY on success
        } catch (error) {
            console.error("Confirmation action failed:", error);
            // On error, stop the spinner but keep the modal open.
            // The user will see the error toast and can then click "Cancel".
            setIsProcessing(false);
        }
    };

    const isWarning = type === 'warning';
    const iconContainerClasses = isWarning ? 'bg-red-900/50' : 'bg-primary-900/50';
    const iconClasses = isWarning ? 'text-red-400' : 'text-primary-400';
    const buttonClasses = isWarning 
        ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500 disabled:bg-red-400' 
        : 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500 disabled:bg-primary-400';

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4 animate-modal-backdrop" 
            onClick={!isProcessing ? onCancel : undefined}
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
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                                Procesando...
                            </>
                        ) : 'Confirmar'}
                    </button>
                    <button
                        type="button"
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-slate-600 shadow-sm px-4 py-2 bg-slate-700 text-base font-medium text-slate-200 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50"
                        onClick={onCancel}
                        disabled={isProcessing}
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;