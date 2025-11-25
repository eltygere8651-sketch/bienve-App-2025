
import React, { useState, useEffect } from 'react';
import { Handshake, LogIn, Key, Loader2, ShieldCheck, UserPlus, Mail } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';

const Auth: React.FC = () => {
    const { login, registerAdmin, isAuthenticated, setCurrentView } = useAppContext();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Si ya estamos autenticados, ir al dashboard inmediatamente
    useEffect(() => {
        if (isAuthenticated) {
            setCurrentView('dashboard');
        }
    }, [isAuthenticated, setCurrentView]);

    // Cargar email guardado al iniciar
    useEffect(() => {
        const savedEmail = localStorage.getItem('adminEmail');
        if (savedEmail) {
            setEmail(savedEmail);
        } else {
            setEmail('admin@bmcontigo.com');
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Guardar email para el futuro
        localStorage.setItem('adminEmail', email);

        // Simular pequeño retardo para UX
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!isRegistering) {
            // Login mode
            const success = await login(email, password);
            if (!success) {
                setError('Credenciales incorrectas o usuario no encontrado.');
            }
        } else {
            // Register mode
            if (password.length < 6) {
                setError('La contraseña debe tener al menos 6 caracteres.');
                setIsLoading(false);
                return;
            }
            if (password !== confirmPassword) {
                setError('Las contraseñas no coinciden.');
                setIsLoading(false);
                return;
            }
            const success = await registerAdmin(email, password);
            if (!success) {
                // El error ya se muestra en el toast del context
            }
        }
        setIsLoading(false);
    };

    const toggleMode = () => {
        setIsRegistering(!isRegistering);
        setError('');
        setPassword('');
        setConfirmPassword('');
    };

    return (
        <div className="flex items-center justify-center p-4 min-h-[80vh]">
            <div className="w-full max-w-md animate-fade-in-down">
                <div className="text-center mb-8">
                    <Handshake className="text-primary-500 h-16 w-16 mx-auto" />
                    <h1 className="text-3xl font-bold text-slate-100 mt-4">B.M Contigo</h1>
                    <p className="text-slate-400 mt-2">
                        Gestión de Préstamos y Clientes
                    </p>
                </div>
                
                <div className="bg-slate-800 p-8 rounded-xl shadow-lg border border-slate-700 relative overflow-hidden">
                    {/* Decorative element */}
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-primary-500/10 rounded-full blur-xl"></div>

                    <div className="mb-6 text-center relative z-10">
                        <div className="bg-slate-900/50 w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 border border-slate-600">
                             {!isRegistering ? <ShieldCheck className="text-green-400 h-8 w-8" /> : <UserPlus className="text-primary-400 h-8 w-8" />}
                        </div>
                        <h2 className="text-xl font-bold text-slate-100">
                            {isRegistering ? 'Crear Cuenta de Admin' : 'Acceso Administrativo'}
                        </h2>
                        <p className="text-sm text-slate-400 mt-2">
                            {isRegistering 
                                ? 'Registra un nuevo usuario para gestionar la aplicación.' 
                                : 'Introduce tus credenciales para acceder al panel.'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
                         <div>
                            <label htmlFor="auth-email" className="block text-sm font-medium text-slate-300">Correo Electrónico</label>
                            <div className="relative mt-1">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input 
                                    id="auth-email" 
                                    name="email"
                                    type="email" 
                                    autoComplete="email"
                                    value={email} 
                                    onChange={(e) => setEmail(e.target.value)} 
                                    required 
                                    placeholder="admin@ejemplo.com"
                                    className="pl-10 w-full px-4 py-3 border border-slate-600 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-slate-900/50 text-slate-100 placeholder-slate-500 transition-all focus:bg-slate-900" 
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="auth-password"className="block text-sm font-medium text-slate-300">Contraseña</label>
                            <div className="relative mt-1">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input 
                                    id="auth-password" 
                                    name="password"
                                    type="password" 
                                    autoComplete="current-password"
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)} 
                                    required 
                                    placeholder="••••••••"
                                    className="pl-10 w-full px-4 py-3 border border-slate-600 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-slate-900/50 text-slate-100 placeholder-slate-500 transition-all focus:bg-slate-900" 
                                />
                            </div>
                        </div>

                        {isRegistering && (
                            <div className="animate-fade-in">
                                <label htmlFor="confirm-password"className="block text-sm font-medium text-slate-300">Confirmar Contraseña</label>
                                <div className="relative mt-1">
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                    <input 
                                        id="confirm-password" 
                                        name="confirm-password"
                                        type="password" 
                                        autoComplete="new-password"
                                        value={confirmPassword} 
                                        onChange={(e) => setConfirmPassword(e.target.value)} 
                                        required 
                                        placeholder="••••••••"
                                        className="pl-10 w-full px-4 py-3 border border-slate-600 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-slate-900/50 text-slate-100 placeholder-slate-500 transition-all focus:bg-slate-900" 
                                    />
                                </div>
                            </div>
                        )}
                       
                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-center animate-fade-in">
                                <p className="text-red-400 text-sm font-medium">{error}</p>
                            </div>
                        )}
                        
                        <div className="pt-2">
                            <button 
                                type="submit" 
                                disabled={isLoading} 
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-400 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : <><LogIn size={18} className="mr-2"/> {isRegistering ? 'Registrar y Entrar' : 'Entrar'}</>}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6 text-center">
                        <button 
                            onClick={toggleMode}
                            className="text-sm text-primary-400 hover:text-primary-300 hover:underline transition-colors"
                        >
                            {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
                        </button>
                    </div>
                </div>
                 <p className="text-center text-xs text-slate-500 mt-6">
                    Tus datos se almacenan de forma segura en Google Cloud (Firebase).
                </p>
            </div>
        </div>
    );
};

export default Auth;
