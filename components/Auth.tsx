import React, { useState } from 'react';
import { Handshake, LogIn, Mail, Key } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { signIn } from '../services/supabaseService';

const Auth: React.FC = () => {
    const { showToast, setCurrentView } = useAppContext();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        
        try {
            const { error: authError } = await signIn(email, password);
            if (authError) throw authError;

            showToast('Inicio de sesión exitoso.', 'success');
            // Supabase onAuthStateChanged will handle redirection to dashboard
            setCurrentView('dashboard');

        } catch (err: any) {
            console.error("Supabase Auth Error:", err);
            if (err.message.includes('Invalid login credentials')) {
                setError('Correo electrónico o contraseña incorrectos.');
            } else {
                setError(err.message || 'Ocurrió un error. Por favor, inténtalo de nuevo.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <Handshake className="text-blue-600 h-12 w-12 mx-auto" />
                    <h1 className="text-3xl font-bold text-gray-800 mt-2">B.M Contigo</h1>
                    <p className="text-gray-600">Acceso exclusivo para administradores.</p>
                </div>
                <div className="bg-white p-8 rounded-2xl shadow-lg">
                    <div className="mb-6 text-center">
                        <h2 className="text-xl font-bold text-gray-800">Iniciar Sesión</h2>
                        <p className="text-sm text-gray-500 mt-1">Usa la cuenta creada en tu panel de Supabase.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Correo Electrónico</label>
                            <div className="relative mt-1">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900" />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="password"className="block text-sm font-medium text-gray-700">Contraseña</label>
                             <div className="relative mt-1">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900" />
                            </div>
                        </div>
                       
                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                        
                        <div>
                            <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400">
                                {isLoading ? 'Procesando...' : <><LogIn size={18} className="mr-2"/> Iniciar Sesión</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Auth;
