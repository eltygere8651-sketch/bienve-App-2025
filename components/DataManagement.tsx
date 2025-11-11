import React from 'react';
import { DatabaseBackup, ShieldCheck, FlaskConical, Trash2 } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { useDataContext } from '../contexts/DataContext';

const DataManagement: React.FC = () => {
    const { showConfirmModal } = useAppContext();
    const { handleGenerateTestRequest, handleDeleteTestRequests } = useDataContext();

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
                <div className="flex items-center">
                    <ShieldCheck className="h-10 w-10 text-green-400 mr-4" />
                    <div>
                        <h2 className="text-xl font-bold text-slate-100">Tus Datos están Seguros en la Nube</h2>
                        <p className="text-slate-300 mt-1">
                            Esta aplicación utiliza Supabase para almacenar y gestionar todos los datos de forma segura. Ya no necesitas preocuparte por copias de seguridad manuales.
                        </p>
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-700">
                    <p className="text-sm text-slate-400">
                        Las herramientas para exportar colecciones completas de datos (clientes, préstamos, etc.) directamente desde la aplicación estarán disponibles en una futura actualización. Por ahora, puedes acceder y gestionar todos tus datos directamente desde tu panel de control de Supabase.
                    </p>
                </div>
            </div>

            <div className="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700">
                 <h2 className="text-xl font-bold text-slate-100 mb-2">Herramientas de Depuración</h2>
                 <p className="text-slate-300 mb-4">
                    Usa estas herramientas si encuentras problemas con los datos.
                 </p>
                 <div className="mt-4 pt-4 border-t border-slate-700">
                     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                        <div>
                             <h3 className="font-semibold text-amber-400">Generar Solicitud de Prueba</h3>
                             <p className="text-sm text-slate-400 mt-1">
                                Si tu lista de solicitudes está vacía, usa este botón para crear una entrada de prueba.
                                <br />
                                Si la solicitud de prueba aparece, el problema está en el formulario público. Si no aparece, el problema está en la lectura de datos o en las políticas de seguridad.
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