import React, { useState } from 'react';
import { Database, CheckCircle, AlertTriangle, Loader2, Link, KeyRound, ClipboardCopy, ShieldCheck, ExternalLink, Info, FilePlus } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { createClient } from '@supabase/supabase-js';

const Step: React.FC<{ icon: React.ReactNode; number: number; title: string; children: React.ReactNode }> = ({ icon, number, title, children }) => (
    <div className="flex items-start space-x-4">
        <div className="flex-shrink-0 flex flex-col items-center">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center">
                {icon}
            </div>
            { number < 4 && <div className="h-full border-l-2 border-dashed border-gray-300 dark:border-gray-600 my-1 min-h-[2rem]"></div>}
        </div>
        <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                <span className="text-gray-500 dark:text-gray-400 mr-2">Paso {number}:</span>
                {title}
            </h3>
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-400 space-y-2">
                {children}
            </div>
        </div>
    </div>
);


const Setup: React.FC = () => {
    const { setSupabaseConfig, showToast } = useAppContext();
    const [url, setUrl] = useState('');
    const [anonKey, setAnonKey] = useState('');
    const [error, setError] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);

    const handleSave = async () => {
        setError('');
        setIsVerifying(true);
        
        if (!url.trim() || !anonKey.trim()) {
            setError('La URL y la Clave Anon no pueden estar vacías.');
            setIsVerifying(false);
            return;
        }

        try {
            // --- Verification Step ---
            const tempSupabase = createClient(url, anonKey);
            // This is a simple, low-impact query to verify the connection and key.
            // It tries to list buckets, which should work with an anon key if RLS is set up, or fail gracefully.
            const { error: connectionError } = await tempSupabase.storage.from('documents').list();

            // Some errors are expected (like bucket not found) but indicate a successful connection.
            // A "failed to fetch" or auth error is a real problem.
            if (connectionError && connectionError.message !== 'The resource was not found') {
               throw connectionError;
            }

            showToast('¡Conexión con Supabase exitosa!', 'success');
            
            setSupabaseConfig({ url, anonKey });

        } catch (e: any) {
            console.error("Config verification error:", e);
            if (e.message.includes('fetch')) {
                 setError('Error de Red: No se pudo conectar a la URL de Supabase. Revisa que la URL sea correcta y que no haya problemas de CORS.');
            } else if (e.message.includes('JWT')) {
                 setError('Error de Autenticación: La Clave Anon no es válida.');
            } else {
                setError(`Error inesperado: ${e.message}`);
            }
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4 font-sans">
            <div className="w-full max-w-3xl bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg text-gray-800 dark:text-gray-100">
                <div className="text-center mb-8">
                    <Database className="text-emerald-500 h-16 w-16 mx-auto" />
                    <h1 className="text-3xl font-bold mt-4">Configuración Inicial de Supabase</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        Sigue estos pasos para conectar la aplicación a tu propia base de datos de Supabase.
                    </p>
                </div>

                <div className="space-y-4">
                     <Step icon={<FilePlus size={20} />} number={1} title="Crea tu Proyecto en Supabase">
                        <p>Si aún no tienes uno, crea un nuevo proyecto en Supabase. El plan gratuito es muy generoso.</p>
                        <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg shadow-sm hover:bg-emerald-700 transition-colors text-sm">
                            <ExternalLink size={16} className="mr-2" />
                            Ir a Supabase
                        </a>
                    </Step>

                     <Step icon={<ClipboardCopy size={20} />} number={2} title="Obtén tus Claves API">
                        <p>Dentro de tu proyecto, ve a <strong>Settings (rueda dentada) &gt; API</strong>.</p>
                        <p>Ahí encontrarás la <strong>URL del Proyecto</strong> y la clave pública <strong>`anon`</strong>. Estas son las dos credenciales que necesitas.</p>
                    </Step>

                     <Step icon={<ShieldCheck size={20} />} number={3} title="Ingresa las Claves y Verifica">
                        <p>Pega la URL y la clave `anon` en los campos de abajo. La aplicación verificará la conexión con tu proyecto antes de guardar.</p>
                    </Step>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-4">
                     <div>
                        <label htmlFor="supabaseUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 font-semibold">URL del Proyecto</label>
                        <div className="relative">
                            <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input id="supabaseUrl" type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://xxxxxxxx.supabase.co" className="pl-10 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100" />
                        </div>
                    </div>
                     <div>
                        <label htmlFor="supabaseAnonKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 font-semibold">Clave Pública (anon)</label>
                        <div className="relative">
                             <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input id="supabaseAnonKey" type="password" value={anonKey} onChange={(e) => setAnonKey(e.target.value)} placeholder="ey..." className="pl-10 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100" />
                        </div>
                    </div>
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
                        className="w-full flex items-center justify-center px-6 py-3 bg-emerald-600 text-white font-bold rounded-lg shadow-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all hover:scale-105 disabled:bg-emerald-400 disabled:cursor-not-allowed"
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