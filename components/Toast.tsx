import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'info';
    onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (message) {
            setIsVisible(true);
            const timer = setTimeout(() => {
                handleClose();
            }, 5000); // Auto-dismiss after 5 seconds

            return () => clearTimeout(timer);
        }
    }, [message, type]);

    const handleClose = () => {
        setIsVisible(false);
        // Allow animation to finish before calling onClose
        setTimeout(() => {
            onClose();
        }, 300);
    };

    if (!message) {
        return null;
    }

    const toastStyles = {
        success: {
            bg: 'bg-green-500',
            icon: <CheckCircle className="h-6 w-6 text-white" />,
        },
        error: {
            bg: 'bg-red-500',
            icon: <XCircle className="h-6 w-6 text-white" />,
        },
        info: {
            bg: 'bg-blue-500',
            icon: <Info className="h-6 w-6 text-white" />,
        },
    };

    const styles = toastStyles[type];

    return (
        <div
            className={`fixed top-5 right-5 z-50 flex items-center p-4 rounded-lg shadow-lg text-white transition-transform duration-300 ${styles.bg} ${
                isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
            }`}
        >
            <div className="flex-shrink-0">{styles.icon}</div>
            <div className="ml-3 text-sm font-medium">{message}</div>
            <button onClick={handleClose} className="ml-4 -mr-2 p-1.5 rounded-md hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white">
                <X className="h-5 w-5" />
            </button>
        </div>
    );
};

export default Toast;
