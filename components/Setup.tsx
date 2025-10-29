
import React, { useState } from 'react';
import { Database, Settings, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';

const Setup: React.FC = () => {
    const { setFirebaseConfig } = useAppContext();
    const [configJson, setConfigJson] = useState('');
    const [error, setError] = useState('');

    const handleSave = () => {
        setError('');
        let configToParse = configJson.trim();
        if (!configToParse) {
            setError('El campo de configuración no puede estar vacío.');
            return;
        }

        // Attempt to extract the JSON object from common paste formats
        const jsonMatch = configToParse.match(/(\{[\s\S]*\})/);
        if (jsonMatch && jsonMatch[1]) {
            configToParse = jsonMatch[1];
        }

        try {
            const config = JSON.parse(configToParse);
            // Basic validation
            if (!config.apiKey || !config.authDomain || !config.projectId || !config.storageBucket || !config.messagingSenderId || !config.appId) {
                throw new Error('La configuración JSON parece incompleta o tiene un formato incorrecto.');
            }
            setFirebaseConfig(config);
            // The app will reload after setting the config
        } catch (e) {
            console.error(e);
            setError('Error al procesar la configuración. Asegúrate de copiar el objeto de configuración completo y válido, que empieza con `{` y termina con `}`.');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
            <div className="w-full max-w-2xl bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg text-gray-800 dark:text-gray-100">
                <div className="text-center mb-6">
                    <Database className="text-amber-500 h-16 w-16 mx-auto" />
                    <h1 className="text-3xl font-bold mt-4">Configuración Inicial</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        Para usar la aplicación, necesitas conectarla a tu propio proyecto de Firebase.
                    </p>
                </div>

                <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                    <p>
                        <span className="font-bold">Paso 1:</span> Ve a la <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Consola de Firebase</a> y crea un nuevo proyecto (es gratis).
                    </p>
                    <p>
                        {/* Fix: Escaped the `</>` sequence to prevent a JSX parsing error. */}
                        <span className="font-bold">Paso 2:</span> Dentro de tu proyecto, crea una "Aplicación web" (haz clic en el icono {'`</>`'}). Dale un apodo y registra la aplicación.
                    </p>
                    <p>
                        <span className="font-bold">Paso 3:</span> Firebase te mostrará un objeto de configuración `firebaseConfig`. Cópialo completo.
                    </p>
                    <p>
                        <span className="font-bold">Paso 4:</span> Pega el objeto de configuración que copiaste en el campo de texto a continuación y haz clic en "Guardar Configuración".
                    </p>
                </div>

                <div className="mt-6">
                    <label htmlFor="firebaseConfig" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Pega tu `firebaseConfig` aquí:
                    </label>
                    <textarea
                        id="firebaseConfig"
                        rows={8}
                        value={configJson}
                        onChange={(e) => setConfigJson(e.target.value)}
                        placeholder={`const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  ...
};`}
                        className="w-full p-3 font-mono text-xs border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                </div>

                {error && (
                    <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/50 rounded-lg text-red-700 dark:text-red-200 text-sm flex items-start">
                        <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="mt-6">
                    <button
                        onClick={handleSave}
                        className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform hover:scale-105"
                    >
                        <CheckCircle className="mr-2 h-5 w-5" />
                        Guardar Configuración y Empezar
                    </button>
                </div>
                 <div className="mt-8 text-xs text-gray-500 dark:text-gray-400 text-center">
                    <p className="font-bold">¡No te preocupes! Esta configuración se guarda localmente en tu navegador y solo necesitas hacer esto una vez por dispositivo.</p>
                </div>
            </div>
        </div>
    );
};

export default Setup;