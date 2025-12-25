
import React, { useState, useEffect, useMemo } from 'react';
import { Loan, Client, LoanStatus } from '../types';
import { X, Banknote, Calendar, Percent, Clock, AlertTriangle, Edit, Trash2, Save, Loader2, TrendingDown, Infinity as InfinityIcon, User, MapPin, Phone, Mail, FileText, Check, Copy } from 'lucide-react';
import { formatCurrency, exportLoanToCSV, calculateLoanProgress, formatPhone } from '../services/utils';
import PaymentHistory from './PaymentHistory';
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

// Subcomponente para datos estáticos
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
        <div className="flex items-start gap-3 py-2 border-b border-slate-700/50 last:border-0">
            <div className="mt-0.5 text-slate-500"><Icon size={16} /></div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-0.5">{label}</p>
                <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-200 truncate">{value || 'No especificado'}</p>
                    {onCopy && value && (
                        <button onClick={handleCopy} className="text-slate-600 hover:text-primary-400 transition-colors">
                            {copied ? <Check size={12} className="text-green-500"/> : <Copy size={12} />}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const LoanDetailsModal: React.FC<LoanDetailsModalProps> = ({ isOpen, onClose, loan, client, initialTab = 'details' }) => {
    const { handleUpdateLoan, handleUpdateClient, handleDeleteLoan, handleRegisterPayment } = useDataContext();
    const { showConfirmModal, showToast } = useAppContext();
    const [activeTab, setActiveTab] = useState(initialTab);
    
    // States for Edit Forms
    const [loanFormData, setLoanFormData] = useState<Partial<Loan>>({});
    const [clientFormData, setClientFormData] = useState<Partial<Client>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Payment Form State
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentNotes, setPaymentNotes] = useState('');

    useEffect(() => {
        if (loan && client) {
            setLoanFormData({
                initialCapital: loan.initialCapital || loan.amount,
                amount: loan.amount, // Also sync amount property
                remainingCapital: loan.remainingCapital,
                term: loan.term,
                interestRate: loan.interestRate,
                startDate: new Date(loan.startDate).toISOString().split('T')[0],
                status: loan.status,
                notes: loan.notes || ''
            });
            setClientFormData({
                name: client.name,
                idNumber: client.idNumber,
                phone: client.phone,
                address: client.address,
                email: client.email
            });
            
            setActiveTab(initialTab);
            setPaymentAmount('');
            setPaymentNotes('');
        }
    }, [loan, client, isOpen, initialTab]);

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
            // Update Loan
            const updatedLoan = { ...loanFormData };
            // Ensure consistency: if amount changed, sync initialCapital
            if (updatedLoan.amount) {
                updatedLoan.initialCapital = updatedLoan.amount;
            } else if (updatedLoan.initialCapital) {
                updatedLoan.amount = updatedLoan.initialCapital;
            }
            
            await Promise.all([
                handleUpdateLoan(loan.id, updatedLoan),
                handleUpdateClient(client.id, clientFormData)
            ]);

            setActiveTab('details');
            showToast('Datos actualizados correctamente', 'success');
        } catch (error) { 
            console.error(error);
        } finally { 
            setIsSubmitting(false); 
        }
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
        } catch (e) { } finally { setIsSubmitting(false); }
    };

    const onDelete = () => {
        showConfirmModal({
            title: 'Cerrar Préstamo Permanentemente',
            message: `¿Eliminar préstamo de ${formatCurrency(loan.amount)}?`,
            onConfirm: async () => { await handleDeleteLoan(loan.id, client.name); onClose(); },
            type: 'warning',
        });
    };

    const setQuickAmount = (type: 'interest' | 'full') => {
        if (type === 'interest') setPaymentAmount(interestDueDisplay.toFixed(2));
        if (type === 'full') setPaymentAmount((loan.remainingCapital + interestDueDisplay).toFixed(2));
    };

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex justify-center items-center z-50 p-2 sm:p-4 animate-modal-backdrop" onClick={onClose}>
            <div className="bg-slate-900 w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-6xl rounded-none sm:rounded-2xl shadow-2xl flex flex-col border border-slate-700 overflow-hidden animate-modal-content" onClick={e => e.stopPropagation()}>
                
                {/* 1. Header Global */}
                <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-gradient-to-br from-primary-600 to-indigo-700 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary-900/50">
                            {client.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-xl font-heading font-bold text-white leading-tight">{client.name}</h2>
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                <span className="font-mono bg-slate-700/50 px-1.5 rounded">{client.idNumber || 'Sin ID'}</span>
                                <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                <span className={`font-bold ${loan.status === LoanStatus.OVERDUE ? 'text-red-400' : 'text-emerald-400'}`}>{loan.status}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700 text-slate-400 transition-colors"><X size={24} /></button>
                </div>

                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                    
                    {/* 2. Sidebar: Detalles del Cliente (Estilo Expediente) */}
                    <div className="lg:w-80 bg-slate-800/30 border-r border-slate-700 overflow-y-auto p-6 hidden lg:block">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <User size={14} /> Ficha del Cliente
                        </h3>
                        
                        <div className="space-y-1 mb-6">
                            <InfoRow icon={MapPin} label="Dirección" value={client.address} />
                            <InfoRow icon={Phone} label="Teléfono" value={formatPhone(client.phone || '')} onCopy />
                            <InfoRow icon={Mail} label="Email" value={client.email} onCopy />
                            <InfoRow icon={Calendar} label="Cliente Desde" value={new Date(client.joinDate).toLocaleDateString()} />
                        </div>

                        <div className="bg-primary-900/20 rounded-xl p-4 border border-primary-500/20">
                            <p className="text-[10px] text-primary-300 font-bold uppercase mb-1">Préstamo Actual</p>
                            <p className="text-2xl font-bold text-white mb-2">{formatCurrency(loan.remainingCapital)}</p>
                            <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-primary-500" style={{ width: `${calculateLoanProgress(loan)}%` }}></div>
                            </div>
                            <p className="text-xs text-right text-primary-400 mt-1">{calculateLoanProgress(loan).toFixed(0)}% Pagado</p>
                        </div>
                    </div>

                    {/* 3. Main Content: Tabs y Vistas */}
                    <div className="flex-1 flex flex-col bg-slate-900/50 min-w-0">
                         {/* Tabs Navigation */}
                         <div className="flex border-b border-slate-700 bg-slate-800/50 text-sm shrink-0 overflow-x-auto">
                            <button onClick={() => setActiveTab('details')} className={`flex-1 min-w-[100px] py-3 border-b-2 font-medium transition-colors ${activeTab === 'details' ? 'border-primary-500 text-primary-400 bg-primary-500/5' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>Gestión</button>
                            <button onClick={() => setActiveTab('payment')} className={`flex-1 min-w-[100px] py-3 border-b-2 font-medium transition-colors ${activeTab === 'payment' ? 'border-primary-500 text-primary-400 bg-primary-500/5' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>Registrar Pago</button>
                            <button onClick={() => setActiveTab('history')} className={`flex-1 min-w-[100px] py-3 border-b-2 font-medium transition-colors ${activeTab === 'history' ? 'border-primary-500 text-primary-400 bg-primary-500/5' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>Historial</button>
                            <button onClick={() => setActiveTab('edit')} className={`flex-1 min-w-[100px] py-3 border-b-2 font-medium transition-colors ${activeTab === 'edit' ? 'border-primary-500 text-primary-400 bg-primary-500/5' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>Editar</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth">
                            
                            {/* TAB: GESTIÓN (Dashboard) */}
                            {activeTab === 'details' && (
                                <div className="space-y-6 animate-fade-in">
                                    {/* Mobile Client Info (Visible only on small screens) */}
                                    <div className="lg:hidden bg-slate-800 p-4 rounded-xl border border-slate-700 mb-4">
                                        <div className="flex items-center gap-3 text-sm text-slate-300">
                                            <Phone size={16} /> {formatPhone(client.phone || '')}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                            <p className="text-xs text-slate-400 uppercase">Capital Inicial</p>
                                            <p className="text-lg font-bold text-white mt-1">{formatCurrency(loan.initialCapital)}</p>
                                        </div>
                                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 relative overflow-hidden">
                                            <div className="absolute right-0 top-0 p-2 opacity-10"><Banknote size={40}/></div>
                                            <p className="text-xs text-primary-400 font-bold uppercase">Deuda Actual</p>
                                            <p className="text-2xl font-bold text-white mt-1">{formatCurrency(loan.remainingCapital)}</p>
                                        </div>
                                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                            <p className="text-xs text-slate-400 uppercase">Interés Generado</p>
                                            <p className="text-lg font-bold text-green-400 mt-1">{formatCurrency(loan.totalInterestPaid)}</p>
                                        </div>
                                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                            <p className="text-xs text-slate-400 uppercase">Plazo</p>
                                            <p className="text-lg font-bold text-white mt-1 flex items-center gap-2">
                                                {isIndefinite ? <InfinityIcon size={20}/> : loan.term} 
                                                <span className="text-xs font-normal text-slate-500">{isIndefinite ? 'Indefinido' : 'Meses'}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 h-full">
                                            <h4 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2"><FileText size={16}/> Notas del Préstamo</h4>
                                            <div className="bg-slate-900/50 p-3 rounded-lg min-h-[100px] text-sm text-slate-400 italic border border-slate-700/50">
                                                {loan.notes || "No hay notas registradas para este préstamo."}
                                            </div>
                                        </div>
                                        
                                        <div className="bg-gradient-to-br from-slate-800 to-slate-800 p-5 rounded-xl border border-slate-700 flex flex-col justify-center items-center text-center">
                                             <div className="mb-3 p-3 bg-green-500/10 rounded-full text-green-400">
                                                 <Banknote size={32} />
                                             </div>
                                             <h4 className="font-bold text-white mb-1">Acción Rápida</h4>
                                             <p className="text-xs text-slate-400 mb-4">Registrar un nuevo cobro para este cliente.</p>
                                             <button 
                                                onClick={() => setActiveTab('payment')}
                                                className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg shadow-lg transition-all transform hover:scale-105"
                                             >
                                                 Ir a Pagos
                                             </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB: PAGOS */}
                            {activeTab === 'payment' && (
                                <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
                                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
                                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                            <Banknote className="text-green-400" /> Registrar Nuevo Cobro
                                        </h3>
                                        
                                        <div className="flex gap-2 mb-6">
                                            <button onClick={() => setQuickAmount('interest')} className="flex-1 py-2 px-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold text-slate-300 transition-colors border border-slate-600">
                                                Solo Interés ({formatCurrency(interestDueDisplay)})
                                            </button>
                                            <button onClick={() => setQuickAmount('full')} className="flex-1 py-2 px-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold text-slate-300 transition-colors border border-slate-600">
                                                Liquidar Todo
                                            </button>
                                        </div>

                                        <form onSubmit={handlePaymentSubmit} className="space-y-6">
                                            <MoneyInput 
                                                label="Monto Recibido" 
                                                value={paymentAmount} 
                                                onChange={setPaymentAmount} 
                                                autoFocus 
                                            />
                                            
                                            <div className="grid grid-cols-2 gap-4">
                                                <InputField label="Fecha" name="date" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                                                <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-600/50">
                                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Nuevo Saldo</p>
                                                    <p className="text-lg font-bold text-white font-mono">
                                                        {formatCurrency(paymentPreview?.newBalance || loan.remainingCapital)}
                                                    </p>
                                                </div>
                                            </div>

                                            {paymentPreview && (
                                                <div className="text-xs space-y-1 px-2">
                                                    <div className="flex justify-between text-slate-400">
                                                        <span>Aplica a Interés:</span>
                                                        <span className="text-amber-400 font-mono">{formatCurrency(paymentPreview.interestPart)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-slate-400">
                                                        <span>Aplica a Capital:</span>
                                                        <span className="text-blue-400 font-mono">{formatCurrency(paymentPreview.capitalPart)}</span>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            <textarea 
                                                value={paymentNotes} 
                                                onChange={(e) => setPaymentNotes(e.target.value)} 
                                                placeholder="Notas opcionales del pago..." 
                                                rows={2} 
                                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 text-sm resize-none focus:ring-2 focus:ring-primary-500 outline-none" 
                                            />

                                            <button 
                                                type="submit" 
                                                disabled={!paymentAmount || isSubmitting} 
                                                className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg transition-transform active:scale-95"
                                            >
                                                {isSubmitting ? <Loader2 className="animate-spin" /> : <Check />}
                                                CONFIRMAR COBRO
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'history' && (
                                <div className="space-y-4 animate-fade-in">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="font-bold text-slate-200">Historial de Transacciones</h3>
                                        <button onClick={() => exportLoanToCSV(loan)} className="text-xs flex items-center gap-1 bg-slate-700 px-3 py-1.5 rounded hover:bg-slate-600 text-white transition-colors">
                                            <TrendingDown size={14} /> Exportar CSV
                                        </button>
                                    </div>
                                    <PaymentHistory loan={loan} />
                                </div>
                            )}

                            {activeTab === 'edit' && (
                                <form onSubmit={handleUpdateSubmit} className="max-w-3xl mx-auto space-y-6 animate-fade-in">
                                    <div className="bg-red-900/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3">
                                        <AlertTriangle className="text-red-400 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm text-red-200 font-bold mb-1">Modo Edición Avanzada</p>
                                            <p className="text-xs text-red-300/80">
                                                Modificar estos valores manualmente (especialmente Capital o Deuda) afectará al historial y los cálculos futuros. Úsalo solo para corregir errores de registro.
                                            </p>
                                        </div>
                                    </div>

                                    {/* SECCIÓN 1: DATOS DEL PRÉSTAMO */}
                                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-4">
                                        <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-700 pb-2">
                                            <Banknote size={20} className="text-green-400" />
                                            Datos del Préstamo
                                        </h3>
                                        
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                            <InputField 
                                                label="Capital Inicial (€)" 
                                                name="amount" 
                                                type="number" 
                                                value={String(loanFormData.amount || '')} 
                                                onChange={(e) => {
                                                    const newAmount = Number(e.target.value);
                                                    // Auto-update remaining capital preserving the amount already paid
                                                    const capitalPaid = (loan.initialCapital || loan.amount) - loan.remainingCapital;
                                                    const newRemaining = Math.max(0, newAmount - capitalPaid);
                                                    
                                                    setLoanFormData({
                                                        ...loanFormData, 
                                                        amount: newAmount,
                                                        remainingCapital: newRemaining
                                                    });
                                                }}
                                                step="0.01" 
                                            />
                                            <InputField 
                                                label="Deuda Actual / Capital Pendiente (€)" 
                                                name="remainingCapital" 
                                                type="number" 
                                                value={String(loanFormData.remainingCapital || '')} 
                                                onChange={(e) => setLoanFormData({...loanFormData, remainingCapital: Number(e.target.value)})} 
                                                step="0.01" 
                                            />
                                            <InputField 
                                                label="Tasa Interés Anual (%)" 
                                                name="interestRate" 
                                                type="number" 
                                                value={String(loanFormData.interestRate || '')} 
                                                onChange={(e) => setLoanFormData({...loanFormData, interestRate: Number(e.target.value)})} 
                                                step="0.01" 
                                            />
                                            <InputField 
                                                label="Plazo (Meses)" 
                                                name="term" 
                                                type="number" 
                                                value={String(loanFormData.term || '')} 
                                                onChange={(e) => setLoanFormData({...loanFormData, term: Number(e.target.value)})} 
                                            />
                                            <InputField 
                                                label="Fecha Inicio" 
                                                name="startDate" 
                                                type="date" 
                                                value={String(loanFormData.startDate || '')} 
                                                onChange={(e) => setLoanFormData({...loanFormData, startDate: e.target.value})} 
                                            />
                                        </div>
                                    </div>

                                    {/* SECCIÓN 2: DATOS DEL CLIENTE */}
                                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-4">
                                        <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-700 pb-2">
                                            <User size={20} className="text-blue-400" />
                                            Datos del Cliente
                                        </h3>
                                        
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                            <div className="sm:col-span-2">
                                                <InputField 
                                                    label="Nombre Completo" 
                                                    name="name" 
                                                    type="text" 
                                                    value={clientFormData.name || ''} 
                                                    onChange={(e) => setClientFormData({...clientFormData, name: e.target.value})} 
                                                />
                                            </div>
                                            <InputField 
                                                label="DNI / NIE" 
                                                name="idNumber" 
                                                type="text" 
                                                value={clientFormData.idNumber || ''} 
                                                onChange={(e) => setClientFormData({...clientFormData, idNumber: e.target.value})} 
                                            />
                                            <InputField 
                                                label="Teléfono" 
                                                name="phone" 
                                                type="text" 
                                                value={clientFormData.phone || ''} 
                                                onChange={(e) => setClientFormData({...clientFormData, phone: e.target.value})} 
                                            />
                                            <div className="sm:col-span-2">
                                                <InputField 
                                                    label="Dirección" 
                                                    name="address" 
                                                    type="text" 
                                                    value={clientFormData.address || ''} 
                                                    onChange={(e) => setClientFormData({...clientFormData, address: e.target.value})} 
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 flex flex-col sm:flex-row justify-between items-center border-t border-slate-700 mt-4 gap-4">
                                        <button type="button" onClick={onDelete} className="text-red-400 text-sm flex items-center gap-2 hover:bg-red-500/10 px-3 py-2 rounded transition-colors w-full sm:w-auto justify-center"><Trash2 size={16} /> Cerrar/Eliminar Préstamo</button>
                                        <button 
                                            type="submit" 
                                            disabled={isSubmitting}
                                            className="px-8 py-3 bg-primary-600 text-white font-bold rounded-lg hover:bg-primary-500 shadow-lg w-full sm:w-auto flex items-center justify-center gap-2"
                                        >
                                            {isSubmitting ? <Loader2 className="animate-spin" /> : <Save />}
                                            Guardar Todos los Cambios
                                        </button>
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
