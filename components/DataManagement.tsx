import React from 'react';
import { DatabaseBackup, ShieldCheck } from 'lucide-react';

const DataManagement: React.FC = () => {
    return (
        <div className="space-y-6">
            <div className="flex items-center">
                <DatabaseBackup className="h-8 w-8 mr-3 text-primary-600" />
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Gestión de Datos</h1>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex items-center">
                    <ShieldCheck className="h-10 w-10 text-green-500 mr-4" />
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Tus Datos están Seguros en la Nube</h2>
                        <p className="text-slate-600 mt-1">
                            Esta aplicación utiliza Supabase para almacenar y gestionar todos los datos de forma segura. Ya no necesitas preocuparte por copias de seguridad manuales.
                        </p>
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200">
                    <p className="text-sm text-slate-500">
                        Las herramientas para exportar colecciones completas de datos (clientes, préstamos, etc.) directamente desde la aplicación estarán disponibles en una futura actualización. Por ahora, puedes acceder y gestionar todos tus datos directamente desde tu panel de control de Supabase.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DataManagement;