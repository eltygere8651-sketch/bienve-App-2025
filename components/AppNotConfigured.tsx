import React from 'react';
import { ServerCrash, Wrench } from 'lucide-react';

const AppNotConfigured: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 p-4 text-center">
            <div className="w-full max-w-2xl bg-slate-800 p-8 rounded-2xl shadow-lg border border-slate-700">
                <ServerCrash className="text-red-400 h-16 w-16 mx-auto" />
                <h1 className="text-2xl sm:text-3xl font-bold mt-4 text-slate-100">Aplicación No Configurada</h1>
                
                <div className="mt-6 text-left space-y-4 text-slate-300">
                    <div>
                        <h2 className="font-semibold text-lg text-slate-100">Para usuarios:</h2>
                        <p>
                            Esta aplicación aún no ha sido configurada por su propietario. Por favor, contacta a la persona que te compartió este enlace y notifícale de este mensaje.
                        </p>
                    </div>
                    
                    <div className="pt-4 border-t border-slate-700">
                         <h2 className="font-semibold text-lg text-slate-100 flex items-center">
                            <Wrench className="h-5 w-5 mr-2 text-primary-400" />
                            Para el propietario de la aplicación:
                         </h2>
                        <p>
                            Parece que las credenciales de Supabase no se han establecido correctamente. Para que la aplicación funcione, debes editar el siguiente archivo en el código fuente y volver a desplegar:
                        </p>
                        <code className="block bg-slate-900 text-amber-300 px-4 py-2 rounded-md text-sm my-2">
                            services/supabaseConfig.ts
                        </code>
                        <p>
                            Asegúrate de que las variables <code className="bg-slate-900 text-amber-300 px-1 rounded-sm text-xs">SUPABASE_URL</code> y <code className="bg-slate-900 text-amber-300 px-1 rounded-sm text-xs">SUPABASE_ANON_KEY</code> contienen tus credenciales reales del proyecto de Supabase.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AppNotConfigured;
