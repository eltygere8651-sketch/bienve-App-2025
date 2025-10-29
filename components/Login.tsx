import React, { useState, useEffect } from 'react';
import { Handshake, Shield } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { LOCAL_STORAGE_KEYS } from '../constants';

const Login: React.FC = () => {
    const { handleLogin, isAdmin, setCurrentView } = useAppContext();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const savedCreds = localStorage.getItem(LOCAL_STORAGE_KEYS.CREDENTIALS);
        if (savedCreds) {
            try {
                const { username: savedUser, password: savedPass } = JSON.parse(savedCreds);
                setUsername(savedUser);
                setPassword(savedPass);
                setRememberMe(true);
            } catch (e) {
                console.error("Failed to parse saved credentials", e);
                localStorage.removeItem(LOCAL_STORAGE_KEYS.CREDENTIALS);
            }
        }
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const success = handleLogin(username, password);
        
        if (success) {
            if (rememberMe) {
                // SECURITY WARNING: Storing credentials in localStorage is not recommended in production environments.
                // This is a security risk as it can be accessed via XSS attacks.
                // For a real-world application, use secure authentication methods like OAuth, JWTs stored in httpOnly cookies, etc.
                localStorage.setItem(LOCAL_STORAGE_KEYS.CREDENTIALS, JSON.stringify({ username, password }));
            } else {
                localStorage.removeItem(LOCAL_STORAGE_KEYS.CREDENTIALS);
            }
            // Navigate after successful login and credential handling
            setCurrentView('dashboard');
        } else {
            setError('Usuario o contraseña incorrectos.');
        }
    };

    // This effect is a backup but handleSubmit is now the primary navigation trigger.
    // This handles cases where the user is already logged in and lands on this page.
    useEffect(() => {
        if (isAdmin) {
            setCurrentView('dashboard');
        }
    }, [isAdmin, setCurrentView]);

    return (
        <div className="flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <Handshake className="text-blue-600 dark:text-blue-400 h-12 w-12 mx-auto" />
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mt-2">B.M Contigo</h1>
                    <p className="text-gray-600 dark:text-gray-400">Panel de Administración</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label 
                                htmlFor="username" 
                                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                                Usuario
                            </label>
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="mt-1 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                        </div>
                        <div>
                            <label 
                                htmlFor="password"
                                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                                Contraseña
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="mt-1 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                        </div>
                        
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                                    Recordar usuario y contraseña
                                </label>
                            </div>
                        </div>

                        {error && (
                            <p className="text-red-500 text-sm text-center">{error}</p>
                        )}

                        <div>
                            <button
                                type="submit"
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                <Shield size={18} className="mr-2" />
                                Iniciar Sesión
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;