
import React, { useState, useEffect } from 'react';
import { Handshake, LogIn, Key, Loader2, ShieldCheck, Mail } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';

const Auth: React.FC = () => {
    const { login, isAuthenticated, setCurrentView } = useAppContext();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
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

        try {
            const result = await login(email, password);
            if (!result.success) {
                let msg = 'Error de acceso.';
                const code = result.error || '';
                
                if (code.includes('auth/invalid-email')) msg = 'El formato del correo no es válido.';
                else if (code.includes('auth/user-not-found')) msg = 'No existe una cuenta con este correo.';
                else if (code.includes('auth/wrong-password')) msg = 'Contraseña incorrecta.';
                else if (code.includes('auth/invalid-credential')) msg = 'Credenciales incorrectas.';
                else if (code.includes('auth/too-many-requests')) msg = 'Cuenta bloqueada temporalmente. Intenta más tarde.';
                else if (code.includes('auth/network-request-failed')) msg = 'Error de conexión. Verifica tu internet.';
                else msg = `Error: ${code}`;
                
                setError(msg);
            }
        } catch (e) {
            setError('Ocurrió un error inesperado.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center p-4 min-h-[85vh]">
            <div className="w-full max-w-md animate-fade-in-down">
                
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-800/50 rounded-full mb-6 ring-8 ring-slate-800/30 backdrop-blur-sm">
                        <Handshake className="text-primary-500 h-10 w-10" />
                    </div>
                    <h1 className="text-4xl font-heading font-bold text-white tracking-tight">B.M Contigo</h1>
                    <p className="text-slate-400 mt-3 text-lg">
                        Portal de Administración
                    </p>
                </div>
                
                <div className="glass-panel p-8 rounded-2xl shadow-2xl relative overflow-hidden bg-slate-900/50 border border-slate-700">
                    {/* Elemento decorativo */}
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-32 h-32 bg-primary-500/10 rounded-full blur-2xl"></div>

                    <div className="mb-8 text-center relative z-10">
                        <h2 className="text-xl font-bold text-white mb-2">
                            Iniciar Sesión
                        </h2>
                        <p className="text-sm text-slate-400">
                            Acceso seguro al sistema de gestión.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                         <div>
                            <label htmlFor="auth-email" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Correo Electrónico</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                                <input 
                                    id="auth-email" 
                                    name="email"
                                    type="email" 
                                    autoComplete="email"
                                    value={email} 
                                    onChange={(e) => setEmail(e.target.value)} 
                                    required 
                                    placeholder="nombre@ejemplo.com"
                                    className="pl-10 w-full px-4 py-3 border border-slate-600 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 bg-slate-800 text-white placeholder-slate-500 transition-all outline-none" 
                                />
                            </div>
                        </div>

                        <div>
                             <label htmlFor="auth-password"className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 ml-1">Contraseña</label>
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                                <input 
                                    id="auth-password" 
                                    name="password"
                                    type="password" 
                                    autoComplete="current-password"
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)} 
                                    required 
                                    placeholder="••••••••"
                                    className="pl-10 w-full px-4 py-3 border border-slate-600 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 bg-slate-800 text-white placeholder-slate-500 transition-all outline-none" 
                                />
                            </div>
                        </div>
                       
                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-center animate-fade-in flex items-start gap-2 justify-center">
                                <ShieldCheck className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                                <p className="text-red-300 text-sm font-medium text-left">{error}</p>
                            </div>
                        )}
                        
                        <div className="pt-2">
                            <button 
                                type="submit" 
                                disabled={isLoading} 
                                className="w-full flex justify-center py-3.5 px-4 rounded-xl shadow-lg text-sm font-bold text-white bg-primary-600 hover:bg-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/20 disabled:bg-primary-900 disabled:text-slate-500 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5"
                            >
                                {isLoading ? (
                                    <Loader2 className="animate-spin h-5 w-5" />
                                ) : (
                                    <><LogIn size={18} className="mr-2"/> Entrar al Panel</>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
                 
                 <div className="text-center mt-8 flex items-center justify-center gap-2 text-slate-600">
                    <ShieldCheck size={14} />
                    <p className="text-xs">Conexión segura SSL/TLS</p>
                </div>
            </div>
        </div>
    );
};

export default Auth;
