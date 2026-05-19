import React, { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw, User, CheckCircle2, AlertCircle, Clock, Check, Download, CalendarDays } from 'lucide-react';
import { Client, Loan, LoanStatus } from '../types';
import { formatCurrency } from '../services/utils';
import { generateLoanHistoryPDF } from '../services/pdfService';
import { getDocument, getCollection, where } from '../services/firebaseService';
import { TABLE_NAMES } from '../constants';

const ClientPortal: React.FC = () => {
    const [activeClient, setActiveClient] = useState<Client | null>(null);
    const [portalLoans, setPortalLoans] = useState<Loan[]>([]);
    const [errorMsg, setErrorMsg] = useState('');
    const [isPortalLinkLoading, setIsPortalLinkLoading] = useState(() => {
        const queryParams = new URLSearchParams(window.location.search);
        return queryParams.has('portal');
    });

    useEffect(() => {
        const loadPortalData = async (clientId: string) => {
            try {
                const clientDoc = await getDocument(TABLE_NAMES.CLIENTS, clientId);
                if (clientDoc) {
                    const loansData = await getCollection(TABLE_NAMES.LOANS, [where('clientId', '==', clientId)]);
                    setActiveClient(clientDoc as Client);
                    setPortalLoans(loansData as Loan[]);
                } else {
                    setErrorMsg('Enlace de portal inválido o cliente no encontrado.');
                }
            } catch (err: any) {
                console.error("Error loading portal data:", err);
                if (err.message?.includes('permission-denied') || err.code === 'permission-denied') {
                    setErrorMsg('Permisos insuficientes. Debes actualizar las reglas de Firestore (firestore.rules) en Firebase Console para permitir lectura pública de clientes y préstamos.');
                } else {
                    setErrorMsg('Error de conexión o permisos insuficientes.');
                }
            } finally {
                setIsPortalLinkLoading(false);
            }
        };

        const queryParams = new URLSearchParams(window.location.search);
        const urlClientId = queryParams.get('portal');
        
        if (urlClientId) {
            loadPortalData(urlClientId);
        } else {
            setIsPortalLinkLoading(false);
            setErrorMsg('Enlace de portal no proporcionado.');
        }
    }, []);

    if (isPortalLinkLoading) {
        return (
            <div className="flex flex-col justify-center items-center h-full min-h-[70vh] animate-pulse px-4">
                 <RefreshCw className="h-12 w-12 text-primary-400 mb-4 animate-spin" />
                 <h2 className="text-xl font-bold text-slate-300">Cargando su portal...</h2>
                 <p className="text-slate-500 text-sm mt-2">Verificando enlace seguro</p>
            </div>
        );
    }

    if (!activeClient) {
        return (
            <div className="flex justify-center items-center h-full min-h-[70vh] animate-fade-in px-4">
                <div className="w-full max-w-md bg-slate-800/80 backdrop-blur-xl p-8 rounded-3xl border border-red-500/30 shadow-2xl text-center">
                    <ShieldAlert className="h-16 w-16 text-red-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Acceso Denegado</h2>
                    <p className="text-slate-400 text-sm">{errorMsg || 'Enlace no válido.'}</p>
                </div>
            </div>
        );
    }

    const activeLoans = portalLoans.filter(l => l.status === LoanStatus.PENDING || l.status === LoanStatus.OVERDUE);
    const pastLoans = portalLoans.filter(l => l.status === LoanStatus.PAID);

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
                                            
                                            <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-slate-700/50">
                                                <div className="flex justify-between items-end">
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
                                                        <div className="text-right">
                                                            <span className="text-xs text-slate-500 italic">Sin pagos aún</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex justify-between items-center bg-primary-900/10 border border-primary-500/20 p-3 rounded-lg">
                                                    <div className="flex items-center gap-2">
                                                        <CalendarDays className="text-primary-400" size={16} />
                                                        <span className="text-xs font-semibold text-primary-300">Próximo Pago Est.</span>
                                                    </div>
                                                    <span className="text-sm font-bold text-primary-400">
                                                        {(() => {
                                                            const baseDateStr = loan.lastPaymentDate || loan.startDate;
                                                            const baseDate = new Date(baseDateStr);
                                                            baseDate.setMonth(baseDate.getMonth() + 1);
                                                            return baseDate.toLocaleDateString();
                                                        })()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-4 flex justify-end">
                                            <button
                                                onClick={() => generateLoanHistoryPDF(loan, false)}
                                                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors shadow-md"
                                            >
                                                <Download size={16} />
                                                Descargar Historial
                                            </button>
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
