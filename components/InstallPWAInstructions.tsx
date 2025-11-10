
import React, { useMemo } from 'react';
import { X, Share, PlusSquare, MoreVertical, MonitorDown, Compass } from 'lucide-react';

interface InstallPWAInstructionsProps {
    isOpen: boolean;
    onClose: () => void;
}

const InstructionStep: React.FC<{ number: number; children: React.ReactNode }> = ({ number, children }) => (
    <div className="flex items-center text-left">
        <span className="flex items-center justify-center w-6 h-6 bg-primary-500 text-white rounded-full mr-4 font-bold text-sm flex-shrink-0">{number}</span>
        <div>{children}</div>
    </div>
);

const InstallPWAInstructions: React.FC<InstallPWAInstructionsProps> = ({ isOpen, onClose }) => {
    const platform = useMemo(() => {
        const userAgent = navigator.userAgent;
        const isIos = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
        const isAndroid = /Android/.test(userAgent);
        const isChrome = /Chrome/.test(userAgent) && /Google Inc/.test(navigator.vendor);
        const isEdge = /Edg/.test(userAgent);

        if (isIos) return 'ios';
        if (isAndroid && isChrome) return 'android';
        if (!/Mobi|Android/.test(userAgent) && (isChrome || isEdge)) return 'desktop';
        return 'other';
    }, []);

    if (!isOpen) return null;

    const renderInstructions = () => {
        switch (platform) {
            case 'ios':
                return (
                    <div className="space-y-4">
                        <InstructionStep number={1}>
                            Toca el botón de <strong>Compartir</strong> <Share className="inline-block mx-1 h-5 w-5 text-blue-400 align-middle" /> en la barra de tu navegador.
                        </InstructionStep>
                        <InstructionStep number={2}>
                            Busca en la lista y selecciona <PlusSquare className="inline-block mx-1 h-5 w-5 text-slate-400 align-middle" /> <strong>"Añadir a pantalla de inicio"</strong>.
                        </InstructionStep>
                    </div>
                );
            case 'android':
                return (
                    <div className="space-y-4">
                        <InstructionStep number={1}>
                            Toca el menú de opciones <MoreVertical className="inline-block mx-1 h-5 w-5 text-slate-400 align-middle" /> (tres puntos) en la esquina superior derecha.
                        </InstructionStep>
                        <InstructionStep number={2}>
                            Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Añadir a pantalla de inicio"</strong> en el menú.
                        </InstructionStep>
                    </div>
                );
            case 'desktop':
                return (
                    <div className="space-y-4">
                        <InstructionStep number={1}>
                            Busca el icono de instalación <MonitorDown className="inline-block mx-1 h-5 w-5 text-slate-400 align-middle" /> en la barra de direcciones de tu navegador (a la derecha).
                        </InstructionStep>
                        <InstructionStep number={2}>
                            Haz clic en el icono y luego en <strong>"Instalar"</strong> para añadir la aplicación a tu escritorio.
                        </InstructionStep>
                    </div>
                );
            default:
                return (
                    <div className="flex items-center p-4 bg-slate-700 rounded-lg text-slate-300">
                        <Compass className="h-10 w-10 text-slate-500 mr-4 flex-shrink-0" />
                        <div>
                            <h4 className="font-bold">Navegador no compatible</h4>
                            <p className="text-sm">Tu navegador no soporta la instalación directa. Para un acceso rápido, puedes añadir esta página a tus marcadores.</p>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4 animate-modal-backdrop"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-modal-title"
        >
            <div
                className="bg-slate-800 rounded-2xl shadow-xl w-full max-w-md transform transition-all animate-modal-content border border-slate-700"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 flex justify-between items-center border-b border-slate-700">
                    <h3 className="text-lg font-bold text-slate-100" id="install-modal-title">Instalar Aplicación</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-700"><X className="text-slate-300" /></button>
                </div>
                <div className="p-6 space-y-4 text-center">
                    <p className="text-slate-300">Sigue estos sencillos pasos para añadir B.M Contigo a tu dispositivo y acceder a ella como una aplicación nativa.</p>
                    <div className="mt-6 text-slate-200">
                        {renderInstructions()}
                    </div>
                </div>
                 <div className="bg-slate-900/50 px-6 py-3 flex justify-end rounded-b-2xl">
                    <button
                        type="button"
                        className="w-full sm:w-auto inline-flex justify-center rounded-md border border-slate-600 shadow-sm px-4 py-2 bg-slate-700 text-base font-medium text-slate-200 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        onClick={onClose}
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InstallPWAInstructions;