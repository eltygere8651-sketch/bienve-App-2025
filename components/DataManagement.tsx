
import React, { useState } from 'react';
import { DatabaseBackup, ShieldCheck, FlaskConical, Trash2, Download, Loader2, Activity, CheckCircle, XCircle } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { useDataContext } from '../contexts/DataContext';
import { exportDatabase } from '../services/dbService';
import { testConnection } from '../services/firebaseService';

const DataManagement: React.FC = () => {
    const { showConfirmModal, showToast } = useAppContext();
    const { handleGenerateTestRequest, handleDeleteTestRequests } = useDataContext();
    const [isExporting, setIsExporting] = useState(false);
    const [isTesting, setIsTesting] = useState(false);

    const handleExportBackup = async () => {
        setIsExporting(true);
        try {
            const data = await exportDatabase();

            const backupData = {
                timestamp: new Date().toISOString(),
                version: '3.0 (IndexedDB)',
                app: 'B.M Contigo',
                data: data
            };

            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bm_contigo_local_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showToast('Copia de seguridad descargada correctamente.', 'success');

        } catch (error: any) {
            console.error("Backup error:", error);
            showToast(`Error al crear la copia de seguridad: ${error.message || 'Error desconocido'}`, 'error');
        } finally {
            setIsExporting(false);
        }
    };

    const handleTestConnection = async () => {
        setIsTesting(true);
        try {
            const success = await testConnection();
            if (success) {
                showToast('¡Conexión a Firebase exitosa! La base de datos responde.', 'success');
            } else {
                showToast('Falló la prueba de conexión.', 'error');
            }
        } catch (e: any) {
            showToast('Error de conexión: ' + e.message, 'error');
        } finally {
            setIsTesting(false);
        }
    };

    const onGenerateTestRequest = () => {
        showConfirmModal({
            title: 'Generar Solicitud de Prueba',
            message: 'Esto añadirá una solicitud con datos falsos al sistema. Es útil para depurar si no ves ninguna solicitud. ¿Continuar?',
            onConfirm: () => {
                handleGenerateTestRequest();
            },
            type: 'info',
        });
    };

    const onDeleteTestRequests = () => {
        showConfirmModal({
            title: 'Eliminar Solicitudes de Prueba',
            message: 'Esta acción eliminará permanentemente todas las solicitudes cuyo nombre comience con "Cliente de Prueba". Esta acción no se puede deshacer. ¿Deseas continuar?',
            onConfirm: handleDeleteTestRequests,
            type: 'warning',
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center">
                <DatabaseBackup className="h-8 w-8 mr-3 text-primary-400" />
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">Gestión de Datos</h1>
            </div>

            <div className="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700">
                <div className="flex items-start sm:items-center">
                    <Activity className="h-10 w-10 text-emerald-400 mr-4 flex-shrink-0" />
                    <div>
                        <h2 className="text-xl font-bold text-slate-100">Diagnóstico de Conexión</h2>
                        <p className="text-slate-300 mt-1">
                            Verifica que tu aplicación está conectada correctamente a los servidores de Google Firebase.
                        </p>
                    </div>
                </div>
                <div className="mt-6 pt-6 border-t border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                     <p className="text-sm text-slate-400">
                        Esta prueba intenta escribir y borrar un documento temporal en la nube.
                    </p>
                    <button
                        onClick={handleTestConnection}
                        disabled={isTesting}
                        className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-emerald-600 text-white font-bold rounded-lg shadow-md hover:bg-emerald-700 disabled:bg-emerald-400 transition-all hover:scale-105"
                    >
                        {isTesting ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Activity size={18} className="mr-2" />}
                        {isTesting ? 'Probando...' : 'Probar Conexión a la Nube'}
                    </button>
                </div>
            </div>

            <div className="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700">
                <div className="flex items-start sm:items-center">
                    <ShieldCheck className="h-10 w-10 text-primary-400 mr-4 flex-shrink-0" />
                    <div>
                        <h2 className="text-xl font-bold text-slate-100">Copia de Seguridad</h2>
                        <p className="text-slate-300 mt-1">
                            Descarga una copia local de todos tus datos almacenados en la nube.
                        </p>
                    </div>
                </div>
                <div className="mt-6 pt-6 border-t border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-slate-400">
                        El archivo descargado contiene toda la base de datos en formato JSON.
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
                 <h2 className="text-xl font-bold text-slate-100 mb-2">Herramientas de Depuración</h2>
                 <p className="text-slate-300 mb-4">
                    Usa estas herramientas si encuentras problemas con los datos o para realizar pruebas.
                 </p>
                 <div className="mt-4 pt-4 border-t border-slate-700">
                     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                        <div>
                             <h3 className="font-semibold text-amber-400">Generar Solicitud de Prueba</h3>
                             <p className="text-sm text-slate-400 mt-1">
                                Crea una solicitud con datos ficticios para verificar el funcionamiento del sistema.
                             </p>
                        </div>
                        <button
                            onClick={onGenerateTestRequest}
                            className="mt-3 sm:mt-0 inline-flex items-center justify-center px-4 py-2 bg-amber-600/80 text-white font-bold rounded-lg shadow-md hover:bg-amber-700/80 transition-transform hover:scale-105"
                        >
                            <FlaskConical size={18} className="mr-2" />
                            Generar Prueba
                        </button>
                    </div>
                 </div>
                 <div className="mt-4 pt-4 border-t border-slate-700">
                     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                        <div>
                             <h3 className="font-semibold text-red-400">Eliminar Solicitudes de Prueba</h3>
                             <p className="text-sm text-slate-400 mt-1">
                                Limpia la base de datos eliminando todas las solicitudes generadas con la herramienta de prueba.
                             </p>
                        </div>
                        <button
                            onClick={onDeleteTestRequests}
                            className="mt-3 sm:mt-0 inline-flex items-center justify-center px-4 py-2 bg-red-600/80 text-white font-bold rounded-lg shadow-md hover:bg-red-700/80 transition-transform hover:scale-105"
                        >
                            <Trash2 size={18} className="mr-2" />
                            Eliminar Datos de Prueba
                        </button>
                    </div>
                 </div>
            </div>
        </div>
    );
};

export default DataManagement;
