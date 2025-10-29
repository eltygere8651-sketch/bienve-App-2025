import React, { useRef } from 'react';
import { DatabaseBackup, Download, Upload, AlertTriangle, Construction } from 'lucide-react';
import { useDataContext } from '../contexts/DataContext';

const DataManagement: React.FC = () => {
    // const { handleExportData, handleImportData } = useDataContext();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImportClick = () => {
        // fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // handleImportData(file);
        }
        if(fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center">
                <DatabaseBackup className="h-8 w-8 mr-3 text-blue-600 dark:text-blue-400" />
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Gestión de Datos</h1>
            </div>

            <div className="bg-amber-100 dark:bg-amber-900/50 border-l-4 border-amber-500 text-amber-700 dark:text-amber-200 p-4 rounded-md flex items-center shadow-md">
                <Construction className="h-5 w-5 mr-3" />
                <p>
                    <span className="font-bold">Función en desarrollo:</span> La importación/exportación de datos para la versión en la nube está siendo rediseñada. Sus datos están seguros en Firebase.
                </p>
            </div>


            <p className="text-gray-600 dark:text-gray-400">
                Sus datos ahora se almacenan de forma segura en la nube de Firebase. Las herramientas para exportar e importar colecciones completas estarán disponibles en una futura actualización.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-50 cursor-not-allowed">
                {/* Export Card */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md flex flex-col items-center text-center">
                    <Download className="h-12 w-12 text-blue-500 mb-4" />
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Exportar Datos</h2>
                    <p className="text-gray-500 dark:text-gray-400 my-2">
                        Crea una copia de seguridad de todos tus clientes, préstamos y solicitudes en un único archivo. Guarda este archivo en un lugar seguro.
                    </p>
                    <button
                        disabled
                        className="mt-4 inline-flex items-center px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform hover:scale-105"
                    >
                        <Download className="mr-2 h-5 w-5" />
                        Descargar Copia de Seguridad
                    </button>
                </div>

                {/* Import Card */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md flex flex-col items-center text-center">
                    <Upload className="h-12 w-12 text-green-500 mb-4" />
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Importar Datos</h2>
                    <p className="text-gray-500 dark:text-gray-400 my-2">
                        Restaura la aplicación desde un archivo de copia de seguridad. Puedes usarlo para mover datos a este dispositivo.
                    </p>
                    <div className="my-2 p-3 bg-amber-100 dark:bg-amber-900/50 rounded-lg text-amber-700 dark:text-amber-200 text-sm flex items-start">
                        <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
                        <div>
                            <span className="font-bold">Atención:</span> La importación reemplazará TODOS los datos actuales en la aplicación.
                        </div>
                    </div>
                    <button
                        disabled
                        className="mt-4 inline-flex items-center px-6 py-3 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-transform hover:scale-105"
                    >
                        <Upload className="mr-2 h-5 w-5" />
                        Seleccionar Archivo para Importar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DataManagement;