
import React, { useState } from 'react';
import { DatabaseBackup, Download, Loader2, ShieldCheck, Zap, PlusCircle } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { useDataContext } from '../contexts/DataContext';

const DataManagement: React.FC = () => {
    const { showToast } = useAppContext();
    const { clients, loans, requests, handleGenerateTestClient } = useDataContext();
    const [isExporting, setIsExporting] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleExportBackup = async () => {
        setIsExporting(true);
        try {
            const data = {
                clients,
                loans,
                requests
            };

            const backupData = {
                timestamp: new Date().toISOString(),
                version: '3.1 (Cloud Data)',
                app: 'B.M Contigo',
                data: data
            };

            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bm_contigo_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showToast(`Copia de seguridad descargada. (${clients.length} Clientes, ${loans.length} Préstamos)`, 'success');

        } catch (error: any) {
            console.error("Backup error:", error);
            showToast(`Error al crear la copia de seguridad: ${error.message || 'Error desconocido'}`, 'error');
        } finally {
            setIsExporting(false);
        }
    };

    const handleGenerateClick = async () => {
        setIsGenerating(true);
        await handleGenerateTestClient();
        setIsGenerating(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center">
                <DatabaseBackup className="h-8 w-8 mr-3 text-primary-400" />
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">Gestión de Datos</h1>
            </div>

            <div className="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700">
                <div className="flex items-start sm:items-center">
                    <ShieldCheck className="h-10 w-10 text-primary-400 mr-4 flex-shrink-0" />
                    <div>
                        <h2 className="text-xl font-bold text-slate-100">Copia de Seguridad</h2>
                        <p className="text-slate-300 mt-1">
                            Descarga una copia local de todos tus datos (clientes, préstamos y solicitudes) almacenados en la nube.
                        </p>
                    </div>
                </div>
                <div className="mt-6 pt-6 border-t border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-slate-400">
                        El archivo descargado contiene toda la base de datos en formato JSON para tu seguridad.
                    </p>
                    <button
                        onClick={handleExportBackup}
                        disabled={isExporting}
                        className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white font-bold rounded-lg shadow-md hover:bg-primary-700 disabled:bg-primary-400 transition-all hover:scale-105"
                    >
                        {isExporting ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Download size={18} className="mr-2" />}
                        {isExporting ? 'Exportando...' : 'Descargar Copia Completa'}
                    </button>
                </div>
            </div>

            <div className="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700">
                <div className="flex items-start sm:items-center">
                    <Zap className="h-10 w-10 text-amber-400 mr-4 flex-shrink-0" />
                    <div>
                        <h2 className="text-xl font-bold text-slate-100">Zona de Pruebas</h2>
                        <p className="text-slate-300 mt-1">
                            Genera datos ficticios para probar la generación de recibos y el flujo de la aplicación.
                        </p>
                    </div>
                </div>
                <div className="mt-6 pt-6 border-t border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-slate-400">
                        Se creará un cliente con un préstamo activo de 1.000€ para que puedas emitir recibos de prueba.
                    </p>
                    <button
                        onClick={handleGenerateClick}
                        disabled={isGenerating}
                        className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 border border-amber-600/50 font-bold rounded-lg transition-all hover:scale-105"
                    >
                        {isGenerating ? <Loader2 size={18} className="mr-2 animate-spin" /> : <PlusCircle size={18} className="mr-2" />}
                        Generar Cliente Test
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DataManagement;
