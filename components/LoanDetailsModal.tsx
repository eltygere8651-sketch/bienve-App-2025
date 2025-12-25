
import React, { useState, useEffect, useMemo } from 'react';
import { Loan, Client, LoanStatus } from '../types';
import { X, Banknote, Calendar, Percent, Clock, AlertTriangle, Edit, Trash2, Save, Loader2, TrendingDown, Infinity as InfinityIcon } from 'lucide-react';
import { formatCurrency, exportLoanToCSV, calculateLoanProgress } from '../services/utils';
import PaymentHistory from './PaymentHistory';
import { useDataContext } from '../contexts/DataContext';
import { useAppContext } from '../contexts/AppContext';
import { InputField } from './FormFields';
import { calculateMonthlyInterest } from '../config';

interface LoanDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    loan: Loan | null;
    client: Client | null;
    initialTab?: 'details' | 'payment' | 'history' | 'edit';
}

const DetailItem: React.FC<{ label: string, value: string | number | React.ReactNode, subValue?: string, highlight?: boolean }> = ({ label, value, subValue, highlight }) => (
    <div className={`p-3 rounded-lg border ${highlight ? 'bg-primary-900/20 border-primary-500/30' : 'bg-slate-800 border-slate-700'}`}>
        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">{label}</p>
        <div className={`text-lg font-bold ${highlight ? 'text-white' : 'text-slate-200'}`}>{value}</div>
        {subValue && <p className="text-[10px] text-slate-500 mt-1">{subValue}</p>}
    </div>
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
            // Keep on same view to show updated balance
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

    const StatusBadge = ({ status }: { status: LoanStatus }) => {
        const colors = {
            [LoanStatus.PAID]: 'bg-green-500/20 text-green-400 border-green-500/30',
            [LoanStatus.PENDING]: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            [LoanStatus.OVERDUE]: 'bg-red-500/20 text-red-400 border-red-500/30',
        };
        return <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${colors[status]}`}>{status}</span>;
    };

    const PaymentForm = () => (
        <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-700 flex flex-col h-full">
            <div className="mb-4">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <Banknote className="text-green-400" size={20} /> Registrar Cobro
                </h3>
                <p className="text-xs text-slate-500 mt-1">Interés fijo del 8% sobre saldo pendiente.</p>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-4 flex-1 flex flex-col">
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Monto a Recibir</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">€</span>
                        <input 
                            type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} 
                            className="w-full pl-8 pr-3 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white font-bold text-lg focus:ring-2 focus:ring-green-500 outline-none"
                            placeholder="0.00" min="0.01" step="0.01" autoFocus={initialTab === 'payment'}
                        />
                    </div>
                </div>
                
                <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-300 text-sm" />
                <textarea value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} placeholder="Notas (opcional)..." rows={2} className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-300 text-sm resize-none" />

                {/* Previsualización Compacta */}
                <div className="bg-slate-800 p-3 rounded-lg text-xs space-y-2 mt-auto border border-slate-700">
                    <div className="flex justify-between"><span className="text-slate-400">Interés a cubrir:</span> <span className="text-amber-400 font-mono">{formatCurrency(paymentPreview?.interestDue || 0)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">A Capital:</span> <span className="text-blue-400 font-mono">{formatCurrency(paymentPreview?.capitalPart || 0)}</span></div>
                    <div className="border-t border-slate-600 pt-2 flex justify-between font-bold"><span className="text-slate-300">Nuevo Saldo:</span> <span className="text-white font-mono">{formatCurrency(paymentPreview?.newBalance || loan.remainingCapital)}</span></div>
                </div>

                <button type="submit" disabled={!paymentAmount || isSubmitting} className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'CONFIRMAR PAGO'}
                </button>
            </form>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-2 sm:p-4 animate-modal-backdrop" onClick={onClose}>
            <div className="bg-slate-800 w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-5xl rounded-none sm:rounded-2xl shadow-2xl flex flex-col border border-slate-700 overflow-hidden animate-modal-content" onClick={e => e.stopPropagation()}>
                
                {/* Header Compacto */}
                <div className="px-6 py-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-primary-900/50 rounded-full flex items-center justify-center text-primary-400 font-bold border border-primary-500/20">
                            {client.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-100 leading-tight">{client.name}</h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <StatusBadge status={loan.status} />
                                <span className="text-xs text-slate-500 font-mono">#{loan.id.slice(-6)}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700 text-slate-400"><X size={20} /></button>
                </div>

                {/* Tabs Simple */}
                <div className="flex border-b border-slate-700 bg-slate-800/50 text-sm shrink-0">
                    <button onClick={() => setActiveTab('details')} className={`flex-1 py-3 border-b-2 font-medium transition-colors ${activeTab === 'details' || activeTab === 'payment' ? 'border-primary-500 text-primary-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>General</button>
                    <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 border-b-2 font-medium transition-colors ${activeTab === 'history' ? 'border-primary-500 text-primary-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>Historial</button>
                    <button onClick={() => setActiveTab('edit')} className={`flex-1 py-3 border-b-2 font-medium transition-colors ${activeTab === 'edit' ? 'border-primary-500 text-primary-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>Editar</button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto bg-slate-900/30 p-4 sm:p-6">
                    
                    {/* VISTA GENERAL (Dashboard + Pago) */}
                    {(activeTab === 'details' || activeTab === 'payment') && (
                        <div className="flex flex-col lg:flex-row gap-6 h-full">
                            {/* Left Col: Info */}
                            <div className="flex-1 space-y-6">
                                <div className="grid grid-cols-2 gap-3">
                                    <DetailItem label="Capital Inicial" value={formatCurrency(loan.initialCapital)} highlight={false} />
                                    <DetailItem label="Deuda Actual" value={formatCurrency(loan.remainingCapital)} highlight={true} subValue={`${calculateLoanProgress(loan).toFixed(1)}% Pagado`} />
                                    <DetailItem label="Intereses Cobrados" value={formatCurrency(loan.totalInterestPaid)} />
                                    <DetailItem label="Plazo" value={isIndefinite ? 'Indefinido' : `${loan.term} Meses`} />
                                </div>
                                
                                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Estado del Préstamo</h4>
                                    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden mb-1">
                                        <div className="h-full bg-blue-500" style={{ width: `${calculateLoanProgress(loan)}%` }}></div>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-400">
                                        <span>Progreso Capital</span>
                                        <span>{calculateLoanProgress(loan).toFixed(0)}%</span>
                                    </div>
                                </div>

                                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                                     <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Notas</h4>
                                     <p className="text-sm text-slate-300 italic">{loan.notes || "Sin notas adicionales."}</p>
                                </div>
                            </div>

                            {/* Right Col: Quick Pay (Desktop) or stacked (Mobile) */}
                            <div className="lg:w-80 shrink-0">
                                <PaymentForm />
                            </div>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-slate-200">Movimientos Registrados</h3>
                                <button onClick={() => exportLoanToCSV(loan)} className="text-xs flex items-center gap-1 bg-slate-700 px-3 py-1.5 rounded hover:bg-slate-600 text-white">
                                    <TrendingDown size={14} /> CSV
                                </button>
                            </div>
                            <PaymentHistory loan={loan} />
                        </div>
                    )}

                    {activeTab === 'edit' && (
                        <form onSubmit={handleUpdateSubmit} className="max-w-xl mx-auto space-y-5">
                            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-4">
                                <h3 className="font-bold text-white border-b border-slate-700 pb-2">Ajuste Manual</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <InputField label="Capital Pendiente (€)" name="remainingCapital" type="number" value={String(formData.remainingCapital)} onChange={(e) => setFormData({...formData, remainingCapital: Number(e.target.value)})} step="0.01" />
                                    <InputField label="Tasa (%)" name="interestRate" type="number" value={String(formData.interestRate)} onChange={(e) => setFormData({...formData, interestRate: Number(e.target.value)})} step="0.01" />
                                </div>
                                <InputField label="Fecha Inicio" name="startDate" type="date" value={String(formData.startDate)} onChange={(e) => setFormData({...formData, startDate: e.target.value})} />
                                <div className="pt-4 flex justify-between">
                                    <button type="button" onClick={onDelete} className="text-red-400 text-sm flex items-center gap-1 hover:underline"><Trash2 size={14} /> Eliminar Préstamo</button>
                                    <button type="submit" className="px-4 py-2 bg-primary-600 text-white font-bold rounded hover:bg-primary-500 text-sm">Guardar Cambios</button>
                                </div>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoanDetailsModal;
