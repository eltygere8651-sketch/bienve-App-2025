import React, { useState } from 'react';
import { Database, Settings, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signOut } from 'firebase/auth';

const Setup: React.FC = () => {
    const { setFirebaseConfig, showToast } = useAppContext();
    const [configJson, setConfigJson] = useState('');
    const [error, setError] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);

    const handleSave = async () => {
        setError('');
        setIsVerifying(true);
        const userInput = configJson.trim();
        if (!userInput) {
            setError('El campo de configuración no puede estar vacío.');
            setIsVerifying(false);
            return;
        }

        try {
            let configObject: any;

            // Use a robust regex to find the JavaScript object part within the pasted text.
            const match = userInput.match(/(\{[\s\S]+\})/);
            if (!match || !match[1]) {
                throw new Error("Formato no reconocido. Asegúrate de pegar el código que contiene el objeto de configuración, empezando con `{` y terminando con `}`.");
            }
            const objectString = match[1];

            try {
                // Use the Function constructor to safely parse the JavaScript object literal.
                // This is more robust than regex fixes and safer than eval().
                // It correctly handles unquoted keys, trailing commas, etc.
                configObject = new Function('return ' + objectString)();

                if (typeof configObject !== 'object' || configObject === null || Array.isArray(configObject)) {
                    throw new Error("La configuración proporcionada no es un objeto válido.");
                }

            } catch (e) {
                console.error("Failed to parse config object string:", e);
                throw new Error("El formato del código de configuración es inválido. Por favor, asegúrate de que sea un objeto de JavaScript correcto.");
            }
            
            // --- Key Validation ---
            const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
            for (const key of requiredKeys) {
                if (!configObject[key] || typeof configObject[key] !== 'string' || configObject[key].trim() === '') {
                    throw new Error(`La configuración parece incompleta. Falta la clave "${key}" o su valor está vacío.`);
                }
            }
            
            // --- Verification Step ---
            // Initialize a temporary app instance to verify credentials without breaking the main app.
            const tempApp = initializeApp(configObject, `temp-check-${Date.now()}`);
            const tempAuth = getAuth(tempApp);
            // This will fail if Anonymous Auth is not enabled or if keys are invalid.
            await signInAnonymously(tempAuth);
            await signOut(tempAuth); // Clean up immediately

            showToast('¡Conexión con Firebase exitosa!', 'success');
            
            // Wait for the toast to be visible before reloading.
            setTimeout(() => {
                setFirebaseConfig(configObject);
            }, 1000);

        } catch (e: any) {
            console.error("Config verification error:", e);
            let errorMessage;
            if (e.message.includes("JSON")) {
                errorMessage = e.message;
            } else if (e.code === 'auth/invalid-api-key') {
                errorMessage = 'Error de Verificación: La API Key no es válida. Por favor, copia y pega la configuración de nuevo desde tu consola de Firebase.';
            } else if (e.code === 'auth/operation-not-allowed') {
                errorMessage = 'Error de Verificación: El inicio de sesión anónimo está deshabilitado. Por favor, sigue el Paso 2 de las instrucciones para habilitarlo en tu Consola de Firebase.';
            } else if (e.code && typeof e.code === 'string') {
                errorMessage = `No se pudo conectar a Firebase. Razón: ${e.code}. Revisa que tu configuración sea correcta y que los servicios estén activos.`;
            } else if (e instanceof Error) {
                errorMessage = e.message;
            } else {
                errorMessage = 'Ocurrió un error inesperado durante la verificación.';
            }
            setError(errorMessage);
        } finally {
            setIsVerifying(false);
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
                        <span className="font-bold">Paso 1:</span> Ve a la <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Consola de Firebase</a> y crea un nuevo proyecto.
                    </p>
                    <p>
                        <span className="font-bold">Paso 2:</span> En el menú de la izquierda, ve a <strong>Authentication</strong>.
                        <ul className="list-disc list-inside pl-4 mt-1">
                            <li>Haz clic en la pestaña <strong>"Sign-in method"</strong>.</li>
                            <li>Habilita los proveedores <strong>"Correo electrónico/Contraseña"</strong> y <strong>"Anónimo"</strong>. Ambos son necesarios para que la app funcione.</li>
                        </ul>
                    </p>
                    <p>
                        <span className="font-bold">Paso 3:</span> Vuelve a la página principal del proyecto (haz clic en <Settings className="inline h-4 w-4" /> <strong>Project settings</strong>) y crea una "Aplicación web" (icono {'`</>`'}). Dale un apodo y registra la aplicación.
                    </p>
                    <p>
                        <span className="font-bold">Paso 4:</span> Firebase te mostrará un objeto de configuración `firebaseConfig`. **Selecciona la opción "Config"** y copia el bloque de código completo.
                    </p>
                    <p>
                        <span className="font-bold">Paso 5:</span> Pega el objeto de configuración en el campo de texto de abajo y haz clic en "Guardar y Verificar".
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
                        disabled={isVerifying}
                        className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all hover:scale-105 disabled:bg-blue-400 disabled:cursor-not-allowed"
                    >
                        {isVerifying ? (
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                            <CheckCircle className="mr-2 h-5 w-5" />
                        )}
                        {isVerifying ? 'Verificando Conexión...' : 'Guardar y Verificar'}
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
