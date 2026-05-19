import React, { useState, useEffect } from 'react';
import { useDataContext } from '../contexts/DataContext';
import { ShieldAlert, Search, RefreshCw, FileText, ChevronRight, User, Phone, CheckCircle2, AlertCircle, Clock, Check, X } from 'lucide-react';
import { Client, Loan, LoanStatus } from '../types';
import { formatCurrency } from '../services/utils';

const ClientPortal: React.FC = () => {
    const { clients, loans } = useDataContext();
    const [loginMode, setLoginMode] = useState(true);
    const [idNumberInput, setIdNumberInput] = useState('');
    const [phoneInput, setPhoneInput] = useState('');
    const [activeClient, setActiveClient] = useState<Client | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [isPortalLinkLoading, setIsPortalLinkLoading] = useState(() => {
        const queryParams = new URLSearchParams(window.location.search);
        return queryParams.has('portal');
    });

    useEffect(() => {
        // Auto-login if a valid clientId is in the query params
        const queryParams = new URLSearchParams(window.location.search);
        const urlClientId = queryParams.get('portal');
        
        if (urlClientId) {
            if (clients.length > 0) {
                const foundUrlClient = clients.find(c => c.id === urlClientId);
                if (foundUrlClient) {
                    setActiveClient(foundUrlClient);
                    setLoginMode(false);
                } else {
                    setErrorMsg('Enlace de portal inválido o cliente no encontrado.');
                    setIsPortalLinkLoading(false);
                }
                setIsPortalLinkLoading(false); // Stop loading once clients are checked
            }
        } else {
            setIsPortalLinkLoading(false);
        }
    }, [clients]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');

        if (!idNumberInput) {
            setErrorMsg('Por favor ingrese su número de identificación (Cédula).');
            return;
        }

        const found = clients.find(c => 
            c.idNumber === idNumberInput && 
            (!phoneInput || (c.phone && c.phone === phoneInput))
        );

        if (found) {
            setActiveClient(found);
            setLoginMode(false);
        } else {
            setErrorMsg('Credenciales no válidas. Revise su número de cédula y teléfono o contacte con administración.');
        }
    };

    const handleLogout = () => {
        setActiveClient(null);
        setLoginMode(true);
        setIdNumberInput('');
        setPhoneInput('');
        setErrorMsg('');
        
        // Remove portal param from URL if it exists
        const url = new URL(window.location.href);
        if (url.searchParams.has('portal')) {
            url.searchParams.delete('portal');
            window.history.pushState({}, '', url.toString());
        }
    };

    if (isPortalLinkLoading) {
        return (
            <div className="flex flex-col justify-center items-center h-full min-h-[70vh] animate-pulse px-4">
                 <RefreshCw className="h-12 w-12 text-primary-400 mb-4 animate-spin" />
                 <h2 className="text-xl font-bold text-slate-300">Cargando su portal...</h2>
                 <p className="text-slate-500 text-sm mt-2">Verificando enlace seguro</p>
            </div>
        );
    }

    if (loginMode) {
        return (
            <div className="flex justify-center items-center h-full min-h-[70vh] animate-fade-in px-4">
                <div className="w-full max-w-md bg-slate-800/80 backdrop-blur-xl p-8 rounded-3xl border border-slate-700/50 shadow-2xl">
                    <div className="flex justify-center mb-6">
                        <div className="bg-primary-500/20 p-4 rounded-full">
                            <User className="h-10 w-10 text-primary-400" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-center text-white mb-2">Portal del Cliente</h2>
                    <p className="text-center text-slate-400 text-sm mb-8">
                        Consulte el estado de sus préstamos y pagos
                    </p>

                    {errorMsg && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                            <ShieldAlert className="text-red-400 shrink-0 mt-0.5" size={18} />
                            <p className="text-sm text-red-200 leading-relaxed font-medium">{errorMsg}</p>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">No. Identificación (Cédula)</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    type="text"
                                    value={idNumberInput}
                                    onChange={(e) => setIdNumberInput(e.target.value)}
                                    placeholder="Ej. Cédula o DPI"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all font-medium"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Teléfono (Opcional)</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    type="tel"
                                    value={phoneInput}
                                    onChange={(e) => setPhoneInput(e.target.value)}
                                    placeholder="Número registrado"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all font-medium"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-primary-900/20 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-slate-900 mt-2"
                        >
                            Acceder a mi portal
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    if (!activeClient) return null;

    const clientLoans = loans.filter(l => l.clientId === activeClient.id);
    const activeLoans = clientLoans.filter(l => l.status === LoanStatus.PENDING || l.status === LoanStatus.OVERDUE);
    const pastLoans = clientLoans.filter(l => l.status === LoanStatus.PAID);

    return (
        <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-800 to-slate-800/40 p-6 rounded-3xl border border-slate-700/50 shadow-xl overflow-hidden relative">
                 <div className="absolute top-0 right-0 p-8 opacity-5">
                    <User size={120} />
                </div>
                <div className="relative z-10">
                    <h2 className="text-2xl font-bold text-white mb-1">¡Hola, {activeClient.name}!</h2>
                    <p className="text-slate-400 text-sm">Resumen de tus préstamos y aportaciones.</p>
                </div>
                <button
                    onClick={handleLogout}
                    className="relative z-10 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors shadow flex items-center gap-2"
                >
                    <X size={16} /> Cerrar Sesión
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Clock className="text-blue-400" size={20} />
                        Préstamos Activos
                    </h3>
                    
                    {activeLoans.length === 0 ? (
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 text-center text-slate-400">
                             No tienes préstamos activos actualmente.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {activeLoans.map(loan => {
                                const progressStatus = Math.min((loan.paymentsMade / loan.term) * 100, 100) || 0;
                                const isOverdue = loan.status === LoanStatus.OVERDUE;
                                
                                return (
                                    <div key={loan.id} className={`bg-slate-800 border ${isOverdue ? 'border-red-500/50' : 'border-slate-700/50'} rounded-2xl p-5 shadow-lg relative overflow-hidden`}>
                                         {isOverdue && (
                                            <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
                                        )}
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold mb-3 border ${
                                                    isOverdue ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                }`}>
                                                    {isOverdue ? 'Atrasado' : 'Al Día'}
                                                </span>
                                                <h4 className="text-xl font-bold text-white mb-1">{formatCurrency(loan.amount)}</h4>
                                                <p className="text-xs text-slate-400">
                                                    Iniciado: {new Date(loan.startDate).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm text-slate-400 mb-1">Cuota</div>
                                                <div className="font-bold text-emerald-400 text-lg">{formatCurrency(loan.monthlyPayment)}</div>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-slate-900/50 rounded-xl p-4 mt-4 border border-slate-700/30">
                                            <div className="flex justify-between text-sm mb-2">
                                                <span className="text-slate-400">Progreso ({loan.paymentsMade}/{loan.term})</span>
                                                <span className="text-white font-medium">{progressStatus.toFixed(0)}%</span>
                                            </div>
                                            <div className="w-full bg-slate-700 rounded-full h-2">
                                                <div 
                                                    className={`h-2 rounded-full ${isOverdue ? 'bg-red-500' : 'bg-primary-500'}`} 
                                                    style={{ width: `${progressStatus}%` }}
                                                ></div>
                                            </div>
                                            
                                            <div className="flex justify-between items-end mt-4 pt-4 border-t border-slate-700/50">
                                                <div>
                                                    <span className="block text-xs text-slate-500 mb-1">Saldo Pendiente</span>
                                                    <span className="font-bold text-white">{formatCurrency(loan.remainingCapital)}</span>
                                                </div>
                                                {loan.lastPaymentDate ? (
                                                    <div className="text-right">
                                                         <span className="block text-xs text-slate-500 mb-1">Último Pago</span>
                                                         <span className="text-sm font-medium text-slate-300">
                                                            {new Date(loan.lastPaymentDate).toLocaleDateString()}
                                                         </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-500 italic">Sin pagos aún</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                
                <div>
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <CheckCircle2 className="text-emerald-400" size={20} />
                        Historial Completado
                    </h3>
                    
                    {pastLoans.length === 0 ? (
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 text-center text-slate-400">
                             No tienes préstamos completados.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {pastLoans.map(loan => (
                                <div key={loan.id} className="bg-slate-800/80 border border-emerald-500/20 rounded-2xl p-5 shadow-lg flex items-center gap-4">
                                     <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex flex-shrink-0 items-center justify-center text-emerald-400">
                                        <Check size={24} />
                                     </div>
                                     <div className="flex-1">
                                        <h4 className="text-white font-bold">{formatCurrency(loan.amount)}</h4>
                                        <div className="flex gap-4 mt-1 text-xs text-slate-400">
                                            <span>Otorgado: {new Date(loan.startDate).toLocaleDateString()}</span>
                                            {loan.lastPaymentDate && <span>Completado: {new Date(loan.lastPaymentDate).toLocaleDateString()}</span>}
                                        </div>
                                     </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-8 bg-blue-500/10 border border-blue-500/20 p-5 rounded-2xl flex gap-4">
                        <div className="mt-1">
                            <AlertCircle className="text-blue-400" size={24} />
                        </div>
                        <div>
                            <h4 className="text-blue-300 font-bold mb-1">¿Dudas sobre su saldo?</h4>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                Esta información se actualiza tras cada periodo de facturación y abono. Si hay alguna discrepancia, por favor contáctese con su asesor.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClientPortal;
