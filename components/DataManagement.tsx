
import React, { useState } from 'react';
import { DatabaseBackup, ShieldCheck, FileText, FileDown, Loader2, Share2 } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { useDataContext } from '../contexts/DataContext';

const DataManagement: React.FC = () => {
    const { showToast } = useAppContext();
    const { triggerMasterBackup } = useDataContext();
    const [isGenerating, setIsGenerating] = useState<false | 'download' | 'share'>(false);

    const handleAction = async (mode: 'download' | 'share') => {
        setIsGenerating(mode);
        try {
            // Use a small timeout to allow UI to show loading state if process is heavy
            setTimeout(() => {
                triggerMasterBackup(mode);
                setIsGenerating(false);
                const actionMsg = mode === 'share' ? 'lista para compartir' : 'descargada con éxito';
                showToast(`Copia maestra PDF ${actionMsg}.`, 'success');
            }, 500);
        } catch (error: any) {
            console.error("PDF Backup error:", error);
            showToast(`Error al gestionar copia maestra: ${error.message || 'Error desconocido'}`, 'error');
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center">
                <DatabaseBackup className="h-8 w-8 mr-3 text-rose-400" />
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">Seguridad de Datos</h1>
            </div>

            {/* PDF Master Backup - ONLY BACKUP OPTION NOW */}
            <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                    <ShieldCheck size={120} />
                </div>
                
                <div className="flex items-start sm:items-center relative z-10">
                    <div className="p-4 bg-rose-500/10 rounded-2xl text-rose-400 mr-5 border border-rose-500/20">
                        <FileText className="h-10 w-10" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-100">Copia Maestra Unificada (PDF)</h2>
                        <p className="text-slate-300 mt-2 max-w-2xl text-sm leading-relaxed">
                            Este es el sistema central de respaldo de B.M Contigo. Genera un documento PDF blindado que incluye:
                        </p>
                        <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-400">
                            <li className="flex items-center gap-2">
                                <div className="w-1 h-1 bg-rose-500 rounded-full" /> Directorio Detallado de Clientes
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="w-1 h-1 bg-rose-500 rounded-full" /> Cartera de Deudas Activas
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="w-1 h-1 bg-rose-500 rounded-full" /> Historial de 50 Últimos Pagos
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="w-1 h-1 bg-rose-500 rounded-full" /> Solicitudes de Préstamo
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="w-1 h-1 bg-rose-500 rounded-full" /> Reinversiones y Fondos Personales
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-700/50 flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                    <div className="flex flex-col text-center md:text-left">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Frecuencia Automática</p>
                        <p className="text-sm text-slate-300">Cada 15 días te recordaremos descargar esta copia.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <button
                            onClick={() => handleAction('download')}
                            disabled={!!isGenerating}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-4 bg-rose-600 text-white font-bold rounded-xl shadow-lg shadow-rose-900/20 hover:bg-rose-500 transition-all hover:scale-105 active:scale-95 border-t border-white/10 disabled:opacity-70"
                        >
                            {isGenerating === 'download' ? (
                                <Loader2 size={18} className="mr-2 animate-spin" />
                            ) : (
                                <FileDown size={18} className="mr-2" />
                            )}
                            Descargar
                        </button>
                        
                        <button
                            onClick={() => handleAction('share')}
                            disabled={!!isGenerating}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-4 bg-slate-700 text-white font-bold rounded-xl shadow-lg shadow-slate-900/20 hover:bg-slate-600 transition-all hover:scale-105 active:scale-95 border-t border-white/10 disabled:opacity-70"
                        >
                            {isGenerating === 'share' ? (
                                <Loader2 size={18} className="mr-2 animate-spin" />
                            ) : (
                                <Share2 size={18} className="mr-2" />
                            )}
                            Compartir
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700 flex items-start gap-4">
                <ShieldCheck className="text-emerald-400 h-5 w-5 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-slate-400 leading-relaxed">
                    <span className="text-slate-200 font-bold">Privacidad Total:</span> Esta copia de seguridad se genera directamente en tu navegador. Tus datos críticos están a salvo en este documento maestro incluso si pierdes acceso a la nube.
                </p>
            </div>
        </div>
    );
};

export default DataManagement;
