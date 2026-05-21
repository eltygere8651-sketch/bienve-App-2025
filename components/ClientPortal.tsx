import React, { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw, User, CheckCircle2, AlertCircle, Clock, Check, Download, CalendarDays, FileText, Lock, Shield } from 'lucide-react';
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
                 <RefreshCw className="h-10 w-10 text-amber-500 mb-4 animate-spin" />
                 <h2 className="text-lg font-bold text-stone-200 font-heading">Iniciando portal seguro...</h2>
                 <p className="text-stone-500 text-xs mt-2 font-medium">B.M Contigo • Enlace Confidencial</p>
            </div>
        );
    }

    if (!activeClient) {
        return (
            <div className="flex justify-center items-center h-full min-h-[70vh] animate-fade-in px-4">
                <div className="w-full max-w-md bg-stone-900/90 backdrop-blur-xl p-8 rounded-3xl border border-stone-850 shadow-2xl text-center">
                    <ShieldAlert className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-stone-100 mb-2 font-heading">Acceso Privado</h2>
                    <p className="text-stone-400 text-xs font-semibold leading-relaxed">{errorMsg || 'Enlace no válido.'}</p>
                </div>
            </div>
        );
    }

    const activeLoans = portalLoans.filter(l => l.status === LoanStatus.PENDING || l.status === LoanStatus.OVERDUE);
    const pastLoans = portalLoans.filter(l => l.status === LoanStatus.PAID);

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pb-12 px-4 selection:bg-amber-500/20">
            {/* Elegant Header with Warm Ambient Look */}
            <div className="text-center py-6">
                <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/15 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest text-[#d97706] uppercase mb-4 shadow-sm">
                    <Lock size={10} className="text-amber-500" />
                    <span>Conexión Encriptada SSL</span>
                </div>
                <p className="text-stone-500 text-[11px] font-bold uppercase tracking-widest mb-1 font-mono">
                    Portal de Cliente Oficial
                </p>
                <h1 className="text-3xl sm:text-4xl font-black text-stone-100 font-heading tracking-tight leading-tight">
                    B.M Contigo
                </h1>
            </div>

            {activeLoans.length === 0 ? (
                /* Empty Active Loans State wrapped in premium Warm Card */
                <div className="bg-gradient-to-b from-[#1c1816]/95 via-[#161312] to-[#120f0f] border border-stone-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden text-center">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>
                    
                    <div className="w-16 h-16 bg-[#241e1b]/80 border border-stone-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-500/85 shadow-md">
                        <Check size={28} className="stroke-[2.5]" />
                    </div>
                    <h2 className="text-xl font-bold text-stone-100 font-heading">Sin créditos activos</h2>
                    <p className="text-stone-400 text-xs mt-2 max-w-sm mx-auto leading-relaxed">
                        ¡Hola, {formatClientName(activeClient.name)}! Actualmente no posee ningún deudor o crédito activo registrado en nuestro deudor.
                    </p>

                    {/* Compact finished history nested below if any */}
                    {pastLoans.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-stone-800/80 text-left">
                            <h4 className="text-xs font-black uppercase tracking-wider text-stone-400 mb-3 flex items-center gap-1.5">
                                <CheckCircle2 className="text-amber-500" size={13} />
                                Historial de Préstamos Completados
                            </h4>
                            <div className="grid grid-cols-1 gap-2.5">
                                {pastLoans.map(loan => (
                                    <div key={loan.id} className="bg-[#181514] border border-stone-800 rounded-xl p-3 flex items-center gap-3">
                                         <div className="h-7 w-7 rounded bg-amber-500/10 flex flex-shrink-0 items-center justify-center text-amber-500 border border-amber-500/10">
                                            <Check size={14} />
                                         </div>
                                         <div className="flex-1 min-w-0">
                                            <p className="text-stone-200 text-xs font-semibold truncate">Crédito Liquidado con Éxito</p>
                                            <p className="text-[10px] text-stone-550">Otorgado: {new Date(loan.startDate).toLocaleDateString()}</p>
                                         </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* Map active loans inside cohesive luxury frame */
                <div className="space-y-6">
                    {activeLoans.map(loan => {
                        const isOverdue = loan.status === LoanStatus.OVERDUE;
                        
                        // Sort payment history for latest
                        const paymentsSorted = loan.paymentHistory
                            ? [...loan.paymentHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            : [];
                        const lastPayment = paymentsSorted[0];
                        
                        return (
                            <div 
                                key={loan.id} 
                                className="bg-gradient-to-b from-[#1d1917]/95 via-[#161312] to-[#120f0f] border border-[#d97706]/15 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden transition-all"
                            >
                                {/* Core Client Heading with secure emblem inside card frame */}
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-stone-800/80 pb-5 mb-6">
                                    <div>
                                        <span className="text-[10px] uppercase tracking-widest text-[#d97706] font-bold block mb-0.5 font-mono">ESTADO DE CUENTA</span>
                                        <h2 className="text-xl sm:text-2xl font-black text-stone-100 tracking-tight font-heading">
                                            {formatClientName(activeClient.name)}
                                        </h2>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        {!isOverdue ? (
                                            <span className="inline-flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/20 text-amber-400 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                                Servicio Al Día
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 bg-orange-600/10 border border-orange-500/20 text-orange-400 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping"></span>
                                                Pendiente de Abono
                                            </span>
                                        )}
                                        <span className="text-3xs text-stone-500 font-mono font-bold bg-stone-950 border border-stone-850 px-2 py-1 rounded">
                                            REF: {loan.id.substring(loan.id.length - 6).toUpperCase()}
                                        </span>
                                    </div>
                                </div>

                                {/* Main outstanding balance & max due dates in dynamic layout */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                                    {/* Outstanding Balance */}
                                    <div className="bg-[#241e1b] border border-stone-850 p-5 rounded-2xl relative shadow-inner flex flex-col justify-center">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none"></div>
                                        <span className="block text-[10px] uppercase tracking-[0.15em] text-stone-400 font-bold mb-1 font-mono">
                                            Saldo Contratado y Mora
                                        </span>
                                        <span className="text-3xl sm:text-4xl font-extrabold text-amber-400 tracking-tight block">
                                            {(() => {
                                                const totalOverdue = loan.overdueHistory
                                                    ?.filter((h) => h.status === "pendiente")
                                                    .reduce((sum, item) => sum + item.amount, 0) || 0;
                                                return formatCurrency(loan.remainingCapital + totalOverdue);
                                            })()}
                                        </span>
                                        {(() => {
                                            const totalOverdue = loan.overdueHistory
                                                ?.filter((h) => h.status === "pendiente")
                                                .reduce((sum, item) => sum + item.amount, 0) || 0;
                                            if (totalOverdue > 0) {
                                                return (
                                                    <div className="mt-3 pt-2.5 border-t border-stone-800/80 space-y-1">
                                                        <div className="flex justify-between text-[11px] font-semibold text-stone-400">
                                                            <span>Capital pendiente:</span>
                                                            <span className="font-mono text-stone-300 font-extrabold">{formatCurrency(loan.remainingCapital)}</span>
                                                        </div>
                                                        <div className="flex justify-between text-[11px] font-semibold text-orange-400">
                                                            <span>Mora pendiente:</span>
                                                            <span className="font-mono font-extrabold">{formatCurrency(totalOverdue)}</span>
                                                        </div>
                                                        <div className="flex justify-between text-xs font-black text-white pt-1.5 border-t border-stone-800/40">
                                                            <span>Total general deuda:</span>
                                                            <span className="font-mono text-amber-500">{formatCurrency(loan.remainingCapital + totalOverdue)}</span>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <span className="block text-[9px] text-stone-500 mt-1 font-semibold">
                                                    Actualizado automáticamente por B.M Contigo
                                                </span>
                                            );
                                        })()}
                                    </div>

                                    {/* Maximum Payment Date Box */}
                                    <div className="bg-[#241e1b] border border-stone-850 p-5 rounded-2xl relative shadow-inner flex flex-col justify-center">
                                        <span className="block text-[10px] uppercase tracking-[0.15em] text-stone-400 font-bold mb-1.5 font-mono flex items-center gap-1">
                                            📅 Vencimiento Mensual
                                        </span>
                                        <div className="text-sm font-extrabold text-stone-100 flex items-center gap-1.5">
                                            <CalendarDays className="text-[#d97706] shrink-0" size={16} />
                                            <span>
                                                {(() => {
                                                    const baseDateStr = loan.lastPaymentDate || loan.startDate;
                                                    const baseDate = getSafeLocalDate(baseDateStr);
                                                    
                                                    // Calculate next month
                                                    const nextDate = new Date(baseDate);
                                                    nextDate.setMonth(nextDate.getMonth() + 1);
                                                    nextDate.setDate(5);
                                                    
                                                    try {
                                                        const options: Intl.DateTimeFormatOptions = { 
                                                            day: 'numeric', 
                                                            month: 'long', 
                                                            year: 'numeric' 
                                                        };
                                                        const formatted = nextDate.toLocaleDateString('es-ES', options);
                                                        return formatted.charAt(0).toUpperCase() + formatted.slice(1);
                                                    } catch(e) {
                                                        return `5 de ${nextDate.toLocaleString('es-ES', { month: 'long' })} de ${nextDate.getFullYear()}`;
                                                    }
                                                })()}
                                            </span>
                                        </div>
                                        <span className="block text-[9.5px] text-[#d97706] mt-1.5 font-bold leading-tight animate-pulse">
                                            ⚠️ Favor de pagar a más tardar el día 5 del mes
                                        </span>
                                    </div>
                                </div>

                                {/* Meses Vencidos - Detalle de Historia de Moras / Intereses */}
                                {loan.overdueHistory && loan.overdueHistory.length > 0 && (
                                    <div className="mb-6 bg-[#211a17]/50 border border-orange-500/15 p-5 rounded-2xl relative overflow-hidden shadow-inner">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl pointer-events-none"></div>
                                        <div className="flex items-center gap-2.5 mb-4">
                                            <div className="p-2 bg-orange-500/10 rounded-xl text-orange-400 border border-orange-500/10 shrink-0">
                                                <AlertCircle size={18} className="stroke-[2]" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black uppercase tracking-wider text-orange-400 font-heading">
                                                    Control de Mensualidades y Moras
                                                </h4>
                                                <p className="text-[10px] text-stone-450 mt-0.5 leading-relaxed">
                                                    Detalle oficial de las cuotas e intereses de mora registrados en su estado de cuenta.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-2.5 max-h-[280px] overflow-y-auto pr-1">
                                            {loan.overdueHistory.map((item) => {
                                                const isPend = item.status === "pendiente";
                                                const isRecl = item.status === "reclamado";
                                                return (
                                                    <div 
                                                        key={item.id} 
                                                        className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                                                            isPend 
                                                                ? "bg-red-950/20 border-red-500/20 text-red-100" 
                                                                : isRecl 
                                                                    ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-100" 
                                                                    : "bg-stone-900/60 border-stone-850 text-stone-400"
                                                        }`}
                                                    >
                                                        <div>
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-xs font-black font-heading tracking-wide">
                                                                    {item.monthName} {item.year}
                                                                </span>
                                                                <span className={`text-[8.5px] px-2 py-0.5 rounded-full border font-black uppercase tracking-wider font-mono ${
                                                                    isPend 
                                                                        ? "bg-red-500/10 text-red-400 border-red-500/20 animate-pulse" 
                                                                        : isRecl 
                                                                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                                                            : "bg-amber-950/40 text-amber-500 border-amber-500/20"
                                                                }`}>
                                                                    {isPend ? "Deuda de Mora" : isRecl ? "Cobrada con éxito" : "Mora Perdonada / Anulada"}
                                                                </span>
                                                            </div>
                                                            <p className={`text-[10px] mt-1 font-semibold ${isPend ? "text-red-300/80" : isRecl ? "text-emerald-300/80" : "text-stone-500"}`}>
                                                                Importe adicional: <span className="font-extrabold">{formatCurrency(item.amount)}</span>
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            {isPend && (
                                                                <span className="text-[10px] text-red-400 font-extrabold flex items-center gap-1 leading-none font-sans">
                                                                    ⚠️ Pendiente
                                                                </span>
                                                            )}
                                                            {isRecl && (
                                                                <span className="text-[10px] text-emerald-400 font-extrabold flex items-center gap-1 leading-none font-sans">
                                                                    ✓ Cobrado
                                                                </span>
                                                            )}
                                                            {!isPend && !isRecl && (
                                                                <span className="text-[10px] text-[#f59e0b] font-extrabold flex items-center gap-1 leading-none font-sans">
                                                                    🤝 Condonado
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Integrated last payment receipts - REUNIFICATION AT ITS FINEST */}
                                {lastPayment ? (
                                    <div className="bg-[#181514] border border-stone-850 rounded-2xl p-5 shadow-inner relative overflow-hidden">
                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-5">
                                            <div className="flex items-start gap-4">
                                                <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 text-amber-500 shrink-0">
                                                    <FileText size={20} className="stroke-[2]" />
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="bg-amber-500/10 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/15 uppercase tracking-widest font-mono">
                                                            Último Pago Confirmado
                                                        </span>
                                                        <span className="text-[10px] text-stone-500 font-mono font-bold">
                                                            #{lastPayment.id?.substring(0, 6).toUpperCase() || 'PAGO'}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm font-semibold text-stone-200">
                                                        Abono de <span className="text-[#d97706] font-extrabold">{formatCurrency(lastPayment.amount)}</span>
                                                    </p>
                                                    <p className="text-[11px] text-stone-400">
                                                        Registrado el {formatDateToSpanishFull(lastPayment.date)}
                                                    </p>
                                                </div>
                                            </div>

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
                                                className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-[#d97706] hover:from-amber-400 hover:to-amber-500 active:scale-[0.98] text-stone-950 font-black text-xs py-3 px-4 rounded-xl shadow-[0_4px_12px_rgba(245,158,11,0.2)] hover:shadow-[0_6px_16px_rgba(245,158,11,0.3)] duration-200 flex items-center justify-center gap-2 cursor-pointer border border-amber-400/20"
                                            >
                                                <Download size={14} className="stroke-[2.5]" />
                                                <span>Descargar Recibo Digital</span>
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-[#181514]/50 border border-stone-850 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                                        <FileText size={24} className="text-stone-500 mb-2" />
                                        <h4 className="text-xs font-bold text-stone-300">Sin recibos emitidos</h4>
                                        <p className="text-[11px] text-[#a8a29e] max-w-sm mt-1">Su recibo oficial de pago aparecerá aquí automáticamente al registrar su primer abono.</p>
                                    </div>
                                )}

                                {/* Collapsible past loans nested right in same card to keep layout compact and ultra premium */}
                                {pastLoans.length > 0 && (
                                    <div className="mt-8 pt-6 border-t border-stone-800/80">
                                        <h4 className="text-xs font-black uppercase tracking-wider text-stone-400 mb-4 flex items-center gap-2 font-mono">
                                            <CheckCircle2 className="text-amber-500" size={13} />
                                            Historial de Préstamos Completados
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {pastLoans.map(pLoan => (
                                                <div key={pLoan.id} className="bg-[#181514] border border-[#d97706]/10 rounded-xl p-4 flex items-center gap-3">
                                                     <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex flex-shrink-0 items-center justify-center text-amber-500 border border-amber-500/10">
                                                        <Check size={16} />
                                                     </div>
                                                     <div className="flex-1 min-w-0">
                                                        <h5 className="text-stone-200 text-xs font-bold truncate font-heading">Crédito Liquidado con Éxito</h5>
                                                        <span className="text-[9px] text-stone-500 block uppercase font-mono tracking-wide mt-0.5">Ref: {pLoan.id.substring(pLoan.id.length - 6).toUpperCase()}</span>
                                                        <p className="text-[10px] text-stone-450 mt-1">
                                                            Otorgado: {new Date(pLoan.startDate).toLocaleDateString()}
                                                        </p>
                                                     </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Redesigned, comforting and extremely elegant footer disclaimer */}
            <div className="text-center max-w-lg mx-auto mt-8 px-4 border-t border-stone-800/40 pt-6">
                <p className="text-[10px] text-stone-400 leading-relaxed flex items-center justify-center gap-1.5 flex-wrap">
                    <ShieldAlert size={11} className="text-amber-500/65" />
                    <span>Toda la información se actualiza de forma automática y oficial.</span>
                </p>
                <p className="text-[10px] text-stone-500 mt-1">
                    Si posee alguna duda sobre su balance, por favor póngase en contacto con su gestor personal.
                </p>
            </div>
        </div>
    );
};

export default ClientPortal;
