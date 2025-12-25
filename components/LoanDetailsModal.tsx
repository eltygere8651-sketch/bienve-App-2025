
import React, { useState, useEffect, useMemo } from 'react';
import { Loan, Client, LoanStatus } from '../types';
import { X, Banknote, Calendar, Percent, Clock, AlertTriangle, Edit, Trash2, Save, Loader2, TrendingDown, Infinity as InfinityIcon, User, MapPin, Phone, Mail, FileText, Check, Copy, History, ArrowRight, LayoutDashboard, Wallet, ShieldAlert, CheckCircle } from 'lucide-react';
import { formatCurrency, exportLoanToCSV, calculateLoanProgress, formatPhone } from '../services/utils';
import { useDataContext } from '../contexts/DataContext';
import { useAppContext } from '../contexts/AppContext';
import { InputField, MoneyInput } from './FormFields';
import { calculateMonthlyInterest } from '../config';

interface LoanDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    loan: Loan | null;
    client: Client | null;
    initialTab?: 'details' | 'payment' | 'history' | 'edit';
}

const InfoRow = ({ icon: Icon, label, value, onCopy }: { icon: any, label: string, value: string | undefined, onCopy?: boolean }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        if(value) {
            navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }
    };

    return (
        <div className="flex items-center gap-3 py-3 border-b border-slate-700/40 last:border-0 group">
            <div className="p-2 rounded-lg bg-slate-800 text-slate-400 group-hover:text-primary-400 transition-colors"><Icon size={16} /></div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-0.5">{label}</p>
                <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-200 truncate">{value || 'No especificado'}</p>
                    {onCopy && value && (
                        <button onClick={handleCopy} className="text-slate-600 hover:text-primary-400 transition-colors opacity-0 group-hover:opacity-100">
                            {copied ? <Check size={12} className="text-green-500"/> : <Copy size={12} />}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const TabButton = ({ active, onClick, icon: Icon, label, colorClass }: { active: boolean, onClick: () => void, icon: any, label: string, colorClass: string }) => (
    <button 
        type="button"
        onClick={onClick}
        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all duration-300 border ${
            active 
            ? `bg-slate-800 text-white border-${colorClass} shadow-lg shadow-${colorClass}/10 scale-[1.02]` 
            : 'bg-transparent text-slate-500 border-transparent hover:bg-slate-800/50 hover:text-slate-300'
        }`}
    >
        <Icon size={18} className={active ? `text-${colorClass}` : ''} />
        <span className={`text-sm font-bold ${active ? '' : 'font-medium'}`}>{label}</span>
    </button>
);

const LoanDetailsModal: React.FC<LoanDetailsModalProps> = ({ isOpen, onClose, loan, client, initialTab = 'details' }) => {
    const { handleUpdateLoan, handleDeleteLoan, handleRegisterPayment } = useDataContext();
    const { showConfirmModal, showToast } = useAppContext();
    const [activeTab, setActiveTab] = useState(initialTab);
    const [formData, setFormData] = useState<Partial<Loan>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Payment Form State
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentNotes, setPaymentNotes] = useState('');

    useEffect(() => {
        if (loan) {
            setFormData({
                initialCapital: loan.initialCapital || loan.amount,
                remainingCapital: loan.remainingCapital,
                term: loan.term,
                interestRate: loan.interestRate,
                startDate: new Date(loan.startDate).toISOString().split('T')[0],
                status: loan.status,
                notes: loan.notes || ''
            });
            setActiveTab(initialTab);
            setPaymentAmount('');
            setPaymentNotes('');
        }
    }, [loan, isOpen, initialTab]);

    const paymentPreview = useMemo(() => {
        if (!loan || !paymentAmount) return null;
        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) return null;
        
        const { interest } = calculateMonthlyInterest(loan.remainingCapital, loan.interestRate);
        const interestPart = Math.min(amount, interest);
        const capitalPart = Math.max(0, amount - interest);
        const newBalance = Math.max(0, loan.remainingCapital - capitalPart);

        return { interestPart, capitalPart, newBalance, interestDue: interest };
    }, [loan, paymentAmount]);

    const interestDueDisplay = useMemo(() => {
        if (!loan) return 0;
        return calculateMonthlyInterest(loan.remainingCapital, loan.interestRate).interest;
    }, [loan]);

    if (!isOpen || !loan || !client) return null;

    const isIndefinite = loan.term === 0;

    const handleUpdateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await handleUpdateLoan(loan.id, formData);
            setActiveTab('details');
            showToast('Préstamo actualizado correctamente', 'success');
        } catch (error) { } finally { setIsSubmitting(false); }
    };

    const handlePaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!paymentAmount) return;
        setIsSubmitting(true);
        try {
            await handleRegisterPayment(loan.id, parseFloat(paymentAmount), paymentDate, paymentNotes);
            setPaymentAmount('');
            setPaymentNotes('');
            showToast('Pago registrado exitosamente', 'success');
            // Opcional: Cambiar a historial para ver el resultado
            setActiveTab('history');
        } catch (e) { } finally { setIsSubmitting(false); }
    };

    const onDelete = () => {
        showConfirmModal({
            title: 'Archivar Préstamo',
            message: `¿Mover este préstamo al historial como Cancelado?`,
            onConfirm: async () => { await handleDeleteLoan(loan.id, client.name); onClose(); },
            type: 'warning',
        });
    };

    const setQuickAmount = (type: 'interest' | 'full') => {
        if (type === 'interest') setPaymentAmount(interestDueDisplay.toFixed(2));
        if (type === 'full') setPaymentAmount((loan.remainingCapital + interestDueDisplay).toFixed(2));
    };

    // Smart History Logic
    const sortedHistory = useMemo(() => {
        return [...(loan.paymentHistory || [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [loan.paymentHistory]);

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex justify-center items-center z-50 p-2 sm:p-4 animate-modal-backdrop" onClick={onClose}>
            <div className="bg-slate-900 w-full h-full sm:h-auto sm:max-h-[95vh] sm:max-w-6xl rounded-none sm:rounded-3xl shadow-2xl flex flex-col border border-slate-700 overflow-hidden animate-modal-content ring-1 ring-slate-700/50" onClick={e => e.stopPropagation()}>
                
                {/* 1. Super Header */}
                <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-5">
                        <div className="relative">
                            <div className="h-14 w-14 bg-gradient-to-br from-primary-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white font-heading font-bold text-2xl shadow-lg shadow-primary-900/50 border border-white/10">
                                {client.name.charAt(0)}
                            </div>
                            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-900 ${loan.status === LoanStatus.PAID ? 'bg-emerald-500' : loan.status === LoanStatus.OVERDUE ? 'bg-red-500' : 'bg-primary-500'}`}></div>
                        </div>
                        <div>
                            <h2 className="text-2xl font-heading font-bold text-white leading-none tracking-tight">{client.name}</h2>
                            <div className="flex items-center gap-3 mt-1.5">
                                <span className="text-xs font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">{client.idNumber}</span>
                                <span className="text-xs font-medium text-slate-400">{loan.id.slice(-8).toUpperCase()}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 rounded-full bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white transition-all border border-slate-700 hover:border-slate-600"><X size={20} /></button>
                </div>

                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                    
                    {/* 2. Sidebar: Detalles del Cliente */}
                    <div className="lg:w-80 bg-slate-900 border-r border-slate-800 overflow-y-auto p-6 hidden lg:flex flex-col gap-6">
                        <div>
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <User size={14} className="text-primary-500"/> Datos Personales
                            </h3>
                            <div className="space-y-1">
                                <InfoRow icon={MapPin} label="Dirección" value={client.address} />
                                <InfoRow icon={Phone} label="Teléfono" value={formatPhone(client.phone || '')} onCopy />
                                <InfoRow icon={Mail} label="Email" value={client.email} onCopy />
                                <InfoRow icon={Calendar} label="Alta" value={new Date(client.joinDate).toLocaleDateString()} />
                            </div>
                        </div>

                        <div className="mt-auto bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 border border-slate-700 shadow-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none group-hover:bg-primary-500/20 transition-all"></div>
                            <p className="text-[10px] text-primary-300 font-bold uppercase mb-1 tracking-wider">Deuda Total Actual</p>
                            <p className="text-3xl font-heading font-bold text-white mb-4 tracking-tight">{formatCurrency(loan.remainingCapital)}</p>
                            
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-medium text-slate-400">
                                    <span>Progreso de Pago</span>
                                    <span className="text-white">{calculateLoanProgress(loan).toFixed(0)}%</span>
                                </div>
                                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-700/50">
                                    <div className="h-full bg-gradient-to-r from-primary-600 to-indigo-500 transition-all duration-1000" style={{ width: `${calculateLoanProgress(loan)}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. Main Content */}
                    <div className="flex-1 flex flex-col bg-slate-950 min-w-0 relative">
                         {/* Tabs */}
                         <div className="p-4 bg-slate-900 border-b border-slate-800">
                             <div className="flex p-1 bg-slate-950/50 rounded-2xl border border-slate-800 gap-1 overflow-x-auto no-scrollbar">
                                <TabButton active={activeTab === 'details'} onClick={() => setActiveTab('details')} icon={LayoutDashboard} label="Resumen" colorClass="primary-500" />
                                <TabButton active={activeTab === 'payment'} onClick={() => setActiveTab('payment')} icon={Wallet} label="Cobrar" colorClass="emerald-500" />
                                <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={History} label="Historial" colorClass="blue-500" />
                                <TabButton active={activeTab === 'edit'} onClick={() => setActiveTab('edit')} icon={Edit} label="Editar" colorClass="amber-500" />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 sm:p-8 scroll-smooth bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
                            
                            {/* --- TAB 1: RESUMEN (DASHBOARD) --- */}
                            {activeTab === 'details' && (
                                <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition-colors">
                                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Capital Inicial</p>
                                            <p className="text-xl font-bold text-white mt-1">{formatCurrency(loan.initialCapital)}</p>
                                        </div>
                                        <div className="bg-slate-900 p-5 rounded-2xl border border-primary-900/30 ring-1 ring-primary-500/10 relative overflow-hidden">
                                            <div className="absolute right-0 top-0 opacity-5 p-2"><Banknote size={48} /></div>
                                            <p className="text-xs text-primary-400 font-bold uppercase tracking-wider">Pendiente</p>
                                            <p className="text-2xl font-bold text-white mt-1">{formatCurrency(loan.remainingCapital)}</p>
                                        </div>
                                        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition-colors">
                                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Interés Ganado</p>
                                            <p className="text-xl font-bold text-emerald-400 mt-1">{formatCurrency(loan.totalInterestPaid)}</p>
                                        </div>
                                        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition-colors">
                                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Plazo</p>
                                            <p className="text-xl font-bold text-white mt-1 flex items-center gap-2">
                                                {isIndefinite ? <InfinityIcon size={20} className="text-primary-400"/> : loan.term} 
                                                <span className="text-xs font-normal text-slate-500">{isIndefinite ? 'Indefinido' : 'Meses'}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 h-full flex flex-col">
                                            <h4 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2"><FileText size={16} className="text-primary-500"/> Notas del Préstamo</h4>
                                            <div className="bg-slate-950 p-4 rounded-xl flex-1 text-sm text-slate-400 italic border border-slate-800 leading-relaxed">
                                                {loan.notes || "No hay notas registradas para este préstamo."}
                                            </div>
                                        </div>
                                        
                                        <div className="bg-gradient-to-br from-emerald-900/20 to-slate-900 p-6 rounded-2xl border border-emerald-500/20 flex flex-col justify-center items-center text-center relative overflow-hidden group">
                                             <div className="absolute inset-0 bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors"></div>
                                             <div className="relative z-10">
                                                 <div className="mb-4 p-4 bg-emerald-500/20 rounded-full text-emerald-400 inline-block ring-1 ring-emerald-500/30">
                                                     <Banknote size={32} />
                                                 </div>
                                                 <h4 className="text-lg font-bold text-white mb-1">Registrar Cobro</h4>
                                                 <p className="text-xs text-slate-400 mb-6 max-w-[200px] mx-auto">Añade un pago, amortiza capital o cobra intereses.</p>
                                                 <button 
                                                    onClick={() => setActiveTab('payment')}
                                                    className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/30 transition-all transform hover:scale-105 flex items-center gap-2"
                                                 >
                                                     Ir a Caja <ArrowRight size={16}/>
                                                 </button>
                                             </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* --- TAB 2: PAGOS (POS STYLE) --- */}
                            {activeTab === 'payment' && (
                                <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
                                    <div className="bg-slate-900 p-1 rounded-2xl border border-slate-800 shadow-2xl">
                                        <div className="bg-slate-950 rounded-xl p-6 sm:p-8 border border-slate-800/50">
                                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                                <Wallet className="text-emerald-400" /> Nueva Transacción
                                            </h3>
                                            
                                            <div className="flex gap-3 mb-8">
                                                <button onClick={() => setQuickAmount('interest')} className="flex-1 py-3 px-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 transition-all border border-slate-700 hover:border-slate-600 flex flex-col items-center justify-center gap-1 group">
                                                    <span className="text-[10px] uppercase text-slate-500 group-hover:text-slate-400">Solo Interés</span>
                                                    <span className="text-emerald-400 font-mono text-sm">{formatCurrency(interestDueDisplay)}</span>
                                                </button>
                                                <button onClick={() => setQuickAmount('full')} className="flex-1 py-3 px-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 transition-all border border-slate-700 hover:border-slate-600 flex flex-col items-center justify-center gap-1 group">
                                                    <span className="text-[10px] uppercase text-slate-500 group-hover:text-slate-400">Liquidar Todo</span>
                                                    <span className="text-white font-mono text-sm">{formatCurrency(loan.remainingCapital + interestDueDisplay)}</span>
                                                </button>
                                            </div>

                                            <form onSubmit={handlePaymentSubmit} className="space-y-6">
                                                <MoneyInput 
                                                    label="Monto Recibido (€)" 
                                                    value={paymentAmount} 
                                                    onChange={(val) => setPaymentAmount(val)} 
                                                    autoFocus 
                                                />
                                                
                                                <div className="grid grid-cols-2 gap-4">
                                                    <InputField label="Fecha Pago" name="date" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                                                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex flex-col justify-center">
                                                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Nuevo Saldo Est.</p>
                                                        <p className="text-lg font-bold text-white font-mono tracking-tight">
                                                            {formatCurrency(paymentPreview?.newBalance || loan.remainingCapital)}
                                                        </p>
                                                    </div>
                                                </div>

                                                {paymentPreview && (
                                                    <div className="bg-slate-900/50 rounded-lg p-3 space-y-2 border border-slate-800">
                                                        <div className="flex justify-between text-xs">
                                                            <span className="text-slate-400 font-medium">A Interés:</span>
                                                            <span className="text-emerald-400 font-bold font-mono">{formatCurrency(paymentPreview.interestPart)}</span>
                                                        </div>
                                                        <div className="w-full h-px bg-slate-800"></div>
                                                        <div className="flex justify-between text-xs">
                                                            <span className="text-slate-400 font-medium">A Capital:</span>
                                                            <span className="text-blue-400 font-bold font-mono">{formatCurrency(paymentPreview.capitalPart)}</span>
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                <textarea 
                                                    value={paymentNotes} 
                                                    onChange={(e) => setPaymentNotes(e.target.value)} 
                                                    placeholder="Notas opcionales..." 
                                                    rows={2} 
                                                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-sm resize-none focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all placeholder-slate-600" 
                                                />

                                                <button 
                                                    type="submit" 
                                                    disabled={!paymentAmount || isSubmitting} 
                                                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-xl shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg transition-all active:scale-95"
                                                >
                                                    {isSubmitting ? <Loader2 className="animate-spin" /> : <CheckCircle size={24} />}
                                                    CONFIRMAR COBRO
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* --- TAB 3: HISTORIAL INTELIGENTE (TIMELINE) --- */}
                            {activeTab === 'history' && (
                                <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
                                    <div className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800">
                                        <div>
                                            <h3 className="font-bold text-slate-200 text-lg">Línea de Tiempo</h3>
                                            <p className="text-xs text-slate-500">Historial ordenado de pagos</p>
                                        </div>
                                        <button onClick={() => exportLoanToCSV(loan)} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-xs font-bold text-white transition-colors border border-slate-700">
                                            <TrendingDown size={14} /> CSV
                                        </button>
                                    </div>

                                    {sortedHistory.length === 0 ? (
                                        <div className="text-center py-16 opacity-50 flex flex-col items-center">
                                            <div className="bg-slate-900 p-4 rounded-full mb-3"><Clock size={32}/></div>
                                            <p>Aún no hay movimientos registrados.</p>
                                        </div>
                                    ) : (
                                        <div className="relative pl-4 sm:pl-8 space-y-8 before:absolute before:left-[23px] sm:before:left-[39px] before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-800">
                                            {sortedHistory.map((record, index) => (
                                                <div key={record.id} className="relative flex items-start gap-4 sm:gap-6 group">
                                                    {/* Timeline Node */}
                                                    <div className="absolute left-0 sm:left-2 top-0 w-10 h-10 rounded-full bg-slate-900 border-4 border-slate-800 flex items-center justify-center z-10 group-hover:border-primary-500/50 transition-colors shadow-lg">
                                                        <span className="text-xs font-bold text-slate-400 group-hover:text-white">{index + 1}</span>
                                                    </div>

                                                    {/* Content Card */}
                                                    <div className="flex-1 bg-slate-900 p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all shadow-md ml-8 sm:ml-0">
                                                        <div className="flex justify-between items-start mb-3 border-b border-slate-800 pb-3">
                                                            <div>
                                                                <p className="text-xs font-bold text-primary-400 uppercase tracking-wider mb-0.5">Cuota Mes {index + 1}</p>
                                                                <p className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                                                    <Calendar size={14} className="text-slate-500"/>
                                                                    {new Date(record.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                                                </p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-lg font-bold text-white">{formatCurrency(record.amount)}</p>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="grid grid-cols-2 gap-4 text-xs">
                                                            <div className="bg-slate-950/50 p-2 rounded-lg">
                                                                <span className="block text-slate-500 mb-1">Interés Pagado</span>
                                                                <span className="text-emerald-400 font-bold font-mono text-sm">{formatCurrency(record.interestPaid)}</span>
                                                            </div>
                                                            <div className="bg-slate-950/50 p-2 rounded-lg">
                                                                <span className="block text-slate-500 mb-1">Capital Amortizado</span>
                                                                <span className="text-blue-400 font-bold font-mono text-sm">{formatCurrency(record.capitalPaid)}</span>
                                                            </div>
                                                        </div>
                                                        
                                                        {record.notes && (
                                                            <div className="mt-3 text-xs text-slate-500 bg-slate-950/30 p-2 rounded border border-slate-800/50 italic">
                                                                "{record.notes}"
                                                            </div>
                                                        )}
                                                        
                                                        <div className="mt-3 text-right">
                                                            <span className="text-[10px] text-slate-500 uppercase font-bold mr-2">Restante:</span>
                                                            <span className="text-xs font-mono font-bold text-amber-500 bg-amber-900/10 px-2 py-1 rounded">{formatCurrency(record.remainingCapitalAfter)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* --- TAB 4: EDITAR (DANGER ZONE) --- */}
                            {activeTab === 'edit' && (
                                <form onSubmit={handleUpdateSubmit} className="max-w-lg mx-auto space-y-6 animate-fade-in">
                                    <div className="bg-amber-900/10 border border-amber-500/20 p-4 rounded-xl flex items-start gap-3">
                                        <ShieldAlert className="text-amber-400 shrink-0" />
                                        <div>
                                            <h4 className="font-bold text-amber-200 text-sm">Modo Edición Avanzado</h4>
                                            <p className="text-xs text-amber-200/70 mt-1">
                                                Modificar estos valores afecta al cálculo histórico. Solo úsalo para correcciones de errores.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-5">
                                        <div className="grid grid-cols-2 gap-5">
                                            <InputField label="Capital Pendiente" name="remainingCapital" type="number" value={String(formData.remainingCapital)} onChange={(e) => setFormData(prev => ({...prev, remainingCapital: Number(e.target.value)}))} step="0.01" />
                                            <InputField label="Tasa Anual (%)" name="interestRate" type="number" value={String(formData.interestRate)} onChange={(e) => setFormData(prev => ({...prev, interestRate: Number(e.target.value)}))} step="0.01" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-5">
                                            <InputField label="Fecha Inicio" name="startDate" type="date" value={String(formData.startDate)} onChange={(e) => setFormData(prev => ({...prev, startDate: e.target.value}))} />
                                            <InputField label="Plazo Original" name="term" type="number" value={String(formData.term)} onChange={(e) => setFormData(prev => ({...prev, term: Number(e.target.value)}))} />
                                        </div>
                                        
                                        <div className="pt-6 flex justify-between items-center border-t border-slate-800 mt-6">
                                            <button type="button" onClick={onDelete} className="text-red-400 hover:text-red-300 text-sm flex items-center gap-2 hover:bg-red-500/10 px-4 py-2 rounded-lg transition-colors font-medium border border-transparent hover:border-red-500/20"><Trash2 size={16} /> Archivar/Cancelar</button>
                                            <button type="submit" className="px-6 py-2.5 bg-slate-100 text-slate-900 font-bold rounded-xl hover:bg-white shadow-lg hover:shadow-white/10 transition-all text-sm">Guardar Cambios</button>
                                        </div>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoanDetailsModal;
