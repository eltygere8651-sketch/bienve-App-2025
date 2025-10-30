import React, { useState } from 'react';
import { Handshake, UserPlus, LogIn, Mail, Key } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { signUp, signIn } from '../services/supabaseService';

const Auth: React.FC = () => {
    const { showToast, setCurrentView } = useAppContext();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (!isLogin && password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setIsLoading(true);
        try {
            let authError;
            if (isLogin) {
                const { error } = await signIn(email, password);
                authError = error;
                if (!error) showToast('Inicio de sesión exitoso.', 'success');
            } else {
                const { error } = await signUp(email, password);
                authError = error;
                if (!error) showToast('Cuenta creada con éxito. Revisa tu email para confirmar.', 'success');
            }
            
            if (authError) throw authError;

            // Supabase handles session and onAuthStateChanged will redirect.
            // If sign up, user might need to confirm email, so stay on page.
            if(isLogin) {
                 setCurrentView('dashboard');
            }

        } catch (err: any) {
            console.error("Supabase Auth Error:", err);
            if (err.message.includes('Invalid login credentials')) {
                setError('Correo electrónico o contraseña incorrectos.');
            } else if (err.message.includes('already registered')) {
                setError('Este correo electrónico ya está registrado.');
            } else if (err.message.includes('short')) {
                setError('La contraseña debe tener al menos 6 caracteres.');
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
                    <Handshake className="text-blue-600 dark:text-blue-400 h-12 w-12 mx-auto" />
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mt-2">B.M Contigo</h1>
                    <p className="text-gray-600 dark:text-gray-400">Acceso al Panel de Administración</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
                    <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
                        <button
                            onClick={() => { setIsLogin(true); setError(''); }}
                            className={`flex-1 py-2 text-sm font-medium ${isLogin ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Iniciar Sesión
                        </button>
                        <button
                            onClick={() => { setIsLogin(false); setError(''); }}
                            className={`flex-1 py-2 text-sm font-medium ${!isLogin ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Registrarse
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Correo Electrónico</label>
                            <div className="relative mt-1">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-10 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="password"className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contraseña</label>
                             <div className="relative mt-1">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="pl-10 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                            </div>
                        </div>
                        {!isLogin && (
                            <div>
                                <label htmlFor="confirmPassword"className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirmar Contraseña</label>
                                 <div className="relative mt-1">
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="pl-10 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                                </div>
                            </div>
                        )}
                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                        <div>
                            <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400">
                                {isLoading ? 'Procesando...' : (isLogin ? <><LogIn size={18} className="mr-2"/> Iniciar Sesión</> : <><UserPlus size={18} className="mr-2"/> Crear Cuenta</>)}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Auth;