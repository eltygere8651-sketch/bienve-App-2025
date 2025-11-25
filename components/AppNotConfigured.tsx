
import React, { useState } from 'react';
import { Flame, Save } from 'lucide-react';
import { saveFirebaseConfig } from '../services/firebaseService';

const AppNotConfigured: React.FC = () => {
    const [configJson, setConfigJson] = useState('');
    const [error, setError] = useState('');

    const handleSave = () => {
        try {
            let input = configJson.trim();
            // Remove 'const firebaseConfig =' part if exists
            if (input.includes('=')) {
                input = input.split('=')[1].trim();
            }
            // Remove trailing semicolon
            if (input.endsWith(';')) {
                input = input.slice(0, -1).trim();
            }

            // Try standard JSON parse first
            let config;
            try {
                config = JSON.parse(input);
            } catch (e) {
                // If JSON fails, try to parse as JS Object (for unquoted keys)
                // Using new Function is safe enough here as this is a client-side setup tool
                // driven by the user pasting their own config.
                try {
                    // eslint-disable-next-line no-new-func
                    config = new Function('return ' + input)();
                } catch (e2) {
                    throw new Error("Formato no reconocido");
                }
            }
            
            if (!config || !config.apiKey || !config.authDomain) {
                throw new Error("El objeto parece incompleto.");
            }
            
            saveFirebaseConfig(config);
            window.location.reload();
        } catch (e) {
            console.error(e);
            setError("Código no válido. Asegúrate de copiar todo el bloque de configuración (puedes incluir 'const firebaseConfig = ...').");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 p-4 text-center">
            <div className="w-full max-w-2xl bg-slate-800 p-8 rounded-2xl shadow-lg border border-slate-700">
                <Flame className="text-amber-500 h-16 w-16 mx-auto" />
                <h1 className="text-2xl sm:text-3xl font-bold mt-4 text-slate-100">Configuración de Firebase</h1>
                
                <p className="mt-4 text-slate-300">
                    B.M Contigo utiliza Firebase (Base de Datos) para conectar a todos tus clientes. <br/>
                    <span className="text-green-400 font-bold">¡No requiere tarjeta de crédito!</span>
                </p>

                <div className="mt-6 text-left space-y-4">
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-600">
                        <h3 className="text-sm font-bold text-slate-200 mb-2">Instrucciones:</h3>
                        <ol className="list-decimal list-inside text-sm text-slate-400 space-y-1">
                            <li>Ve a <a href="https://console.firebase.google.com/" target="_blank" className="text-primary-400 underline" rel="noreferrer">console.firebase.google.com</a> y crea un proyecto.</li>
                            <li><strong>Paso Importante:</strong> Registra una App Web (icono <code>&lt;/&gt;</code>) en la configuración del proyecto.</li>
                            <li>Copia el código que aparece (<code>const firebaseConfig = ...</code>) y pégalo abajo.</li>
                            <li>Activa <strong>Firestore Database</strong> (en modo prueba o producción).</li>
                            <li>Activa <strong>Authentication</strong> (Email/Password).</li>
                        </ol>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Pega el código de configuración aquí:
                        </label>
                        <textarea
                            rows={8}
                            className="w-full p-3 font-mono text-xs bg-slate-900 text-green-400 border border-slate-600 rounded-md focus:ring-primary-500 focus:border-primary-500"
                            placeholder={'const firebaseConfig = {\n  apiKey: "AIzaSy...",\n  authDomain: "..."\n};'}
                            value={configJson}
                            onChange={(e) => setConfigJson(e.target.value)}
                        />
                        {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
                    </div>

                    <button 
                        onClick={handleSave}
                        className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                        <Save className="mr-2 h-5 w-5" />
                        Guardar y Conectar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AppNotConfigured;
