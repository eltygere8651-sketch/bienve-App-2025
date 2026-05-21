import React, { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw, User, CheckCircle2, AlertCircle, Clock, Check, Download, CalendarDays, FileText } from 'lucide-react';
import { Client, Loan, LoanStatus, PaymentRecord } from '../types';
import { formatCurrency } from '../services/utils';
import { generatePaymentReceiptPdf, downloadPdf } from '../services/pdfService';
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

    const formatClientName = (fullName: string) => {
        const parts = fullName.trim().split(/\s+/);
        if (parts.length > 1) {
            return `${parts[0]} ${parts[1].substring(0, 1)}.`;
        }
        return parts[0];
    };

    const getSafeLocalDate = (dateStr: string) => {
        if (dateStr.includes('-') && !dateStr.includes('T')) {
            return new Date(dateStr + 'T12:00:00');
        }
        return new Date(dateStr);
    };

    const formatDateToSpanishFull = (dateStr: string) => {
        try {
            const date = getSafeLocalDate(dateStr);
            const options: Intl.DateTimeFormatOptions = { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
            };
            const formatted = date.toLocaleDateString('es-ES', options);
            return formatted.charAt(0).toUpperCase() + formatted.slice(1);
        } catch (e) {
            return dateStr;
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
                    <h2 className="text-2xl font-bold text-white mb-1">¡Hola, {formatClientName(activeClient.name)}!</h2>
                    <p className="text-slate-400 text-sm">Resumen de tus préstamos y aportaciones de manera segura 🔒</p>
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
                        <div className="space-y-6">
                            {activeLoans.map(loan => {
                                const isOverdue = loan.status === LoanStatus.OVERDUE;
                                
                                // Obtener el último pago del historial para mostrar su monto real y fecha
                                const paymentsSorted = loan.paymentHistory
                                    ? [...loan.paymentHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                    : [];
                                const lastPayment = paymentsSorted[0];
                                const last3Payments = paymentsSorted.slice(0, 3);
                                
                                return (
                                    <div key={loan.id} className="space-y-4">
                                        <div className={`bg-gradient-to-b from-slate-800 to-slate-900 border ${isOverdue ? 'border-red-500/50' : 'border-slate-700/50'} rounded-3xl p-6 shadow-xl relative overflow-hidden`}>
                                             {isOverdue && (
                                                <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
                                            )}
                                            
                                            {/* Cabecera de Estado simplificada */}
                                            <div className="flex justify-between items-center mb-4">
                                                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold border ${
                                                    isOverdue ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                }`}>
                                                    {isOverdue ? 'Pendiente con Atraso' : 'Servicio Al Día'}
                                                </span>
                                                <span className="text-xs text-slate-500 font-mono">ID: {loan.id.substring(loan.id.length - 6).toUpperCase()}</span>
                                            </div>

                                            {/* Información de Deuda Pendiente (Saldo) destacada */}
                                            <div className="mb-6">
                                                <span className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">Monto Pendiente Actual</span>
                                                <span className="text-4xl font-extrabold text-white tracking-tight">{formatCurrency(loan.remainingCapital)}</span>
                                            </div>

                                            {/* Detalles principales del último y próximo pago */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-700/30">
                                                {/* Registro de Último Pago */}
                                                <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-700/20">
                                                    <span className="block text-xs text-slate-500 font-medium mb-1">Último Pago Realizado</span>
                                                    {lastPayment ? (
                                                        <div>
                                                            <span className="text-base font-bold text-emerald-400">{formatCurrency(lastPayment.amount)}</span>
                                                            <span className="text-xs text-slate-400 block mt-0.5">Fecha: {new Date(lastPayment.date).toLocaleDateString()}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 font-medium block italic">Sin pagos registrados aún</span>
                                                    )}
                                                </div>

                                                {/* Fecha Aproximada de Siguiente Pago */}
                                                <div className="bg-primary-950/20 p-3 rounded-xl border border-primary-500/15">
                                                    <span className="block text-xs text-primary-400 font-semibold mb-1">Fecha Aprox. Siguiente Pago</span>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <CalendarDays className="text-primary-400 shrink-0" size={15} />
                                                        <span className="text-sm font-bold text-white">
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
                                        </div>

                                        {/* DESTACADO ESPECIAL: ÚLTIMO RECIBO DE PAGO EMITIDO (MÁS RECIENTE) */}
                                        {lastPayment ? (
                                            <div className="relative mt-2">
                                                <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900/80 backdrop-blur-xl border border-emerald-500/20 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden transition-all hover:border-emerald-500/40 group">
                                                    {/* Decorative Elements */}
                                                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none transition-opacity group-hover:opacity-100 opacity-70"></div>
                                                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-teal-500/10 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none transition-opacity group-hover:opacity-100 opacity-50"></div>
                                                    
                                                    <div className="relative z-10 flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start justify-between">
                                                        {/* Info Column */}
                                                        <div className="space-y-5 flex-1 w-full text-center md:text-left">
                                                            
                                                            <div className="inline-flex items-center gap-2 bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 text-xs font-semibold px-3 py-1.5 rounded-full shadow-inner">
                                                                <CheckCircle2 size={16} className="text-emerald-400" />
                                                                <span>Último abono procesado con éxito</span>
                                                            </div>

                                                            <div className="space-y-1">
                                                                <span className="block text-xs uppercase tracking-[0.2em] text-slate-400 font-medium">
                                                                    Monto Abonado
                                                                </span>
                                                                <span className="text-4xl md:text-5xl font-black text-white tracking-tight block font-mono">
                                                                    {formatCurrency(lastPayment.amount)}
                                                                </span>
                                                            </div>

                                                            <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-700/50 flex flex-col sm:flex-row items-center sm:items-start gap-4">
                                                                <div className="flex-shrink-0 bg-emerald-500/20 p-3 rounded-xl border border-emerald-500/20">
                                                                    <CalendarDays size={24} className="text-emerald-400" />
                                                                </div>
                                                                <div className="w-full">
                                                                    <span className="block text-xs text-slate-400 mb-1">Fecha de Operación</span>
                                                                    <span className="text-lg font-bold text-slate-200 block capitalize">
                                                                        {formatDateToSpanishFull(lastPayment.date)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Action Column */}
                                                        <div className="flex-shrink-0 w-full md:w-auto flex flex-col justify-center h-full pt-2 md:pt-0">
                                                            <div className="bg-slate-950/40 p-5 rounded-3xl border border-slate-800 backdrop-blur-sm w-full md:w-80 shadow-inner flex flex-col items-center">
                                                                <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl shadow-lg flex items-center justify-center mb-4 transform -translate-y-10 -mb-6 border-4 border-slate-900">
                                                                    <FileText className="text-slate-950" size={28} strokeWidth={2.5} />
                                                                </div>
                                                                
                                                                <h4 className="text-white font-bold text-lg mb-2">Recibo Digital</h4>
                                                                <p className="text-slate-400 text-xs text-center mb-5 px-2">
                                                                    Documento oficial en PDF. Su comprobante de pago está listo para ser guardado.
                                                                </p>

                                                                <button
                                                                    onClick={() => {
                                                                        if (!activeClient) return;
                                                                        const prevBal = lastPayment.remainingCapitalAfter + lastPayment.capitalPaid;
                                                                        const receiptPayload = {
                                                                            clientName: activeClient.name,
                                                                            loanId: loan.id,
                                                                            paymentAmount: lastPayment.amount,
                                                                            paymentType: 'Pago de Cuota',
                                                                            paymentDate: lastPayment.date,
                                                                            notes: lastPayment.notes || '',
                                                                            previousBalance: prevBal,
                                                                            newBalance: lastPayment.remainingCapitalAfter,
                                                                            interestPaid: lastPayment.interestPaid,
                                                                            capitalPaid: lastPayment.capitalPaid
                                                                        };
                                                                        const doc = generatePaymentReceiptPdf(receiptPayload);
                                                                        const fileName = `Recibo_${activeClient.name.replace(/\s/g, '_')}_${new Date(lastPayment.date).toISOString().split('T')[0]}.pdf`;
                                                                        const blob = doc.output('blob');
                                                                        downloadPdf(blob, fileName);
                                                                    }}
                                                                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm py-3.5 px-6 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] flex items-center justify-center gap-2.5 active:scale-[0.98] transition-all focus:outline-none"
                                                                >
                                                                    <Download size={18} className="stroke-[2.5]" />
                                                                    <span>Descargar PDF</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-slate-800/40 border border-slate-700/30 rounded-3xl p-8 flex flex-col items-center justify-center text-center">
                                                <div className="w-16 h-16 bg-slate-900/80 rounded-2xl flex items-center justify-center mb-4 border border-slate-700">
                                                    <FileText size={28} className="text-slate-500" />
                                                </div>
                                                <h4 className="text-base font-bold text-white mb-2">Sin recibos emitidos</h4>
                                                <p className="text-sm text-slate-400 max-w-sm">Su recibo oficial de pago aparecerá en esta sección de forma automática una vez registrado su primer abono.</p>
                                            </div>
                                        )}
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
                                        <h4 className="text-white font-bold">Crédito Finalizado</h4>
                                        <span className="text-2xs text-slate-500 block uppercase font-mono tracking-wide mt-0.5">ID: {loan.id.substring(loan.id.length - 6).toUpperCase()}</span>
                                        <div className="flex gap-4 mt-2 text-xs text-slate-400">
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
