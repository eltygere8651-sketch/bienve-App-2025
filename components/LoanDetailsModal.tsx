
import React, { useState, useEffect, useMemo } from 'react';
import { Loan, Client, LoanStatus } from '../types';
import { X, Banknote, Calendar, BarChart, Percent, User, ThumbsUp, Clock, AlertTriangle, Edit, Trash2, Save, Loader2, Plus, FileText, Download, TrendingUp, TrendingDown, PieChart } from 'lucide-react';
import { formatCurrency, exportLoanToCSV } from '../services/utils';
import PaymentHistory from './PaymentHistory';
import { useDataContext } from '../contexts/DataContext';
import { useAppContext } from '../contexts/AppContext';
import { InputField, SelectField } from './FormFields';
import { calculateAccruedInterest } from '../config';

interface LoanDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    loan: Loan | null;
    client: Client | null;
}

const DetailItem: React.FC<{ icon: React.ReactNode, label: string, value: string | number, subValue?: string, colorClass?: string }> = ({ icon, label, value, subValue, colorClass = "text-slate-100" }) => (
    <div className="flex items-start space-x-3 bg-slate-700/30 p-4 rounded-xl border border-slate-600/50">
        <div className={`p-2 rounded-lg bg-slate-800 ${colorClass.replace('text-', 'text-opacity-80 ')}`}>{icon}</div>
        <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</p>
            <p className={`text-lg font-bold ${colorClass}`}>{value}</p>
            {subValue && <p className="text-xs text-slate-500 mt-0.5">{subValue}</p>}
        </div>
    </div>
);

const LoanDetailsModal: React.FC<LoanDetailsModalProps> = ({ isOpen, onClose, loan, client }) => {
    const { handleUpdateLoan, handleDeleteLoan, handleRegisterPayment } = useDataContext();
    const { showConfirmModal, showToast } = useAppContext();
    const [activeTab, setActiveTab] = useState<'details' | 'payment' | 'history' | 'edit'>('details');
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
            setActiveTab('details');
            setPaymentAmount('');
            setPaymentNotes('');
        }
    }, [loan, isOpen]);

    // Payment Calculation Logic for Preview (Usando lógica avanzada por días)
    const paymentPreview = useMemo(() => {
        if (!loan || !paymentAmount) return null;
        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) return null;

        const referenceDate = loan.lastPaymentDate || loan.startDate;
        
        const { interest, daysElapsed } = calculateAccruedInterest(
            loan.remainingCapital,
            referenceDate,
            paymentDate,
            loan.interestRate
        );
        
        const interestPart = Math.min(amount, interest);
        const capitalPart = Math.max(0, amount - interest);
        const newBalance = Math.max(0, loan.remainingCapital - capitalPart);

        return { interestPart, capitalPart, newBalance, daysElapsed, interestDue: interest };
    }, [loan, paymentAmount, paymentDate]);

    // Months without capital reduction
    const monthsOnlyInterest = useMemo(() => {
        if (!loan?.paymentHistory) return 0;
        return loan.paymentHistory.filter(p => p.capitalPaid <= 0).length;
    }, [loan]);

    if (!isOpen || !loan || !client) return null;

    const handleUpdateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await handleUpdateLoan(loan.id, formData);
            setActiveTab('details');
            showToast('Préstamo actualizado correctamente', 'success');
        } catch (error) {
            // Error handled by hook
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
            setActiveTab('history'); // Switch to history to see the new record
        } catch (e) {
            // handled
        } finally {
            setIsSubmitting(false);
        }
    };

    const onDelete = () => {
        showConfirmModal({
            title: 'Cerrar Préstamo Permanentemente',
            message: `¿Eliminar préstamo de ${formatCurrency(loan.amount)}? Esto borrará todo el historial contable.`,
            onConfirm: async () => {
                await handleDeleteLoan(loan.id, client.name);
                onClose();
            },
            type: 'warning',
        });
    };

    const StatusBadge = ({ status }: { status: LoanStatus }) => {
        const colors = {
            [LoanStatus.PAID]: 'bg-green-500/20 text-green-400 border-green-500/30',
            [LoanStatus.PENDING]: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            [LoanStatus.OVERDUE]: 'bg-red-500/20 text-red-400 border-red-500/30',
        };
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${colors[status]}`}>
                {status}
            </span>
        );
    };

    const TabButton = ({ id, label, icon }: { id: any, label: string, icon: React.ReactNode }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 text-sm font-medium transition-colors border-b-2 ${
                activeTab === id 
                ? 'border-primary-500 text-primary-400 bg-slate-700/20' 
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-700/10'
            }`}
        >
            {icon}
            <span className="hidden sm:inline">{label}</span>
        </button>
    );

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-0 sm:p-4 animate-modal-backdrop" onClick={onClose}>
            <div className="bg-slate-800 w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-4xl rounded-none sm:rounded-2xl shadow-2xl flex flex-col border border-slate-700 overflow-hidden animate-modal-content" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="p-6 bg-slate-800 border-b border-slate-700 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-2xl font-bold text-slate-100">{client.name}</h2>
                            <StatusBadge status={loan.status} />
                        </div>
                        <p className="text-slate-400 text-sm flex items-center gap-2">
                            <FileText size={14} /> ID: {loan.id.slice(-8)} &bull; 
                            <Calendar size={14} /> Inicio: {new Date(loan.startDate).toLocaleDateString()}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700 text-slate-400 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-700 bg-slate-800/50">
                    <TabButton id="details" label="Resumen Contable" icon={<PieChart size={18} />} />
                    <TabButton id="payment" label="Registrar Pago" icon={<Banknote size={18} />} />
                    <TabButton id="history" label="Historial" icon={<Clock size={18} />} />
                    <TabButton id="edit" label="Editar / Ajustes" icon={<Edit size={18} />} />
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-900/30">
                    
                    {/* --- DETAILS TAB --- */}
                    {activeTab === 'details' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <DetailItem 
                                    icon={<TrendingUp size={24} className="text-blue-400" />} 
                                    label="Capital Inicial" 
                                    value={formatCurrency(loan.initialCapital || loan.amount)} 
                                    colorClass="text-blue-400"
                                />
                                <DetailItem 
                                    icon={<TrendingDown size={24} className="text-amber-400" />} 
                                    label="Capital Pendiente" 
                                    value={formatCurrency(loan.remainingCapital)} 
                                    colorClass="text-amber-400"
                                    subValue={`${((loan.remainingCapital / (loan.initialCapital || loan.amount)) * 100).toFixed(1)}% del total`}
                                />
                                <DetailItem 
                                    icon={<Percent size={24} className="text-green-400" />} 
                                    label="Intereses Cobrados" 
                                    value={formatCurrency(loan.totalInterestPaid || 0)} 
                                    colorClass="text-green-400"
                                />
                                <DetailItem 
                                    icon={<BarChart size={24} className="text-purple-400" />} 
                                    label="Capital Amortizado" 
                                    value={formatCurrency(loan.totalCapitalPaid || 0)} 
                                    colorClass="text-purple-400"
                                />
                            </div>

                            {monthsOnlyInterest > 0 && (
                                <div className="flex items-center gap-3 p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-xl text-yellow-200">
                                    <AlertTriangle size={24} />
                                    <div>
                                        <p className="font-bold">Alerta de Amortización Lenta</p>
                                        <p className="text-sm opacity-80">Este préstamo ha tenido {monthsOnlyInterest} pagos que solo cubrieron intereses sin reducir el capital.</p>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                                    <h3 className="font-bold text-slate-200 mb-4 flex items-center"><FileText size={18} className="mr-2"/> Notas del Préstamo</h3>
                                    <div className="p-4 bg-slate-900/50 rounded-lg text-slate-300 text-sm min-h-[100px] whitespace-pre-wrap">
                                        {loan.notes || "Sin notas registradas."}
                                    </div>
                                </div>
                                <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 flex flex-col justify-center items-center text-center space-y-4">
                                    <div className="p-4 bg-primary-500/10 rounded-full text-primary-400">
                                        <Banknote size={32} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-400">Cuota Mensual Sugerida</p>
                                        <p className="text-2xl font-bold text-slate-100">{formatCurrency(loan.monthlyPayment)}</p>
                                    </div>
                                    <button onClick={() => setActiveTab('payment')} className="px-6 py-2 bg-primary-600 text-white font-bold rounded-lg hover:bg-primary-700 transition-colors shadow-lg shadow-primary-900/20">
                                        Registrar Nuevo Pago
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- PAYMENT TAB --- */}
                    {activeTab === 'payment' && (
                        <div className="max-w-2xl mx-auto space-y-8">
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-slate-100">Registrar Entrada de Dinero</h3>
                                <p className="text-slate-400 text-sm mt-1">El sistema calcula el interés exacto según los días transcurridos desde el último pago.</p>
                            </div>

                            <form onSubmit={handlePaymentSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <InputField 
                                        label="Monto Recibido (€)" 
                                        name="amount" 
                                        type="number" 
                                        value={paymentAmount} 
                                        onChange={(e) => setPaymentAmount(e.target.value)} 
                                        required 
                                        min="0.01" 
                                    />
                                    <InputField 
                                        label="Fecha del Pago" 
                                        name="date" 
                                        type="date" 
                                        value={paymentDate} 
                                        onChange={(e) => setPaymentDate(e.target.value)} 
                                        required 
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Notas (Opcional)</label>
                                    <textarea 
                                        value={paymentNotes}
                                        onChange={e => setPaymentNotes(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-600 rounded-md bg-slate-700 text-slate-100 focus:ring-primary-500 focus:border-primary-500"
                                        placeholder="Ej: Pago adelantado, transferencia bancaria..."
                                        rows={2}
                                    />
                                </div>

                                {paymentPreview && (
                                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-3 animate-fade-in">
                                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex justify-between">
                                            <span>Desglose Automático</span>
                                            <span className="text-slate-500 text-xs normal-case">Días transcurridos: {paymentPreview.daysElapsed}</span>
                                        </h4>
                                        <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                                            <span className="text-sm text-slate-300">Interés Generado ({paymentPreview.daysElapsed} días)</span>
                                            <span className="font-bold text-green-400">{formatCurrency(paymentPreview.interestDue)}</span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                                            <span className="text-sm text-slate-300">Interés Cubierto</span>
                                            <span className="font-bold text-green-400">{formatCurrency(paymentPreview.interestPart)}</span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                                            <span className="text-sm text-slate-300">Capital Descontado</span>
                                            <span className="font-bold text-blue-400">{formatCurrency(paymentPreview.capitalPart)}</span>
                                        </div>
                                        <div className="border-t border-slate-700 pt-3 flex items-center justify-between px-2">
                                            <span className="text-sm font-bold text-slate-200">Nuevo Capital Pendiente</span>
                                            <span className="font-bold text-amber-400 text-lg">{formatCurrency(paymentPreview.newBalance)}</span>
                                        </div>
                                    </div>
                                )}

                                <button 
                                    type="submit" 
                                    disabled={!paymentPreview || isSubmitting}
                                    className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" /> : <Save />}
                                    Confirmar Pago
                                </button>
                            </form>
                        </div>
                    )}

                    {/* --- HISTORY TAB --- */}
                    {activeTab === 'history' && (
                        <div className="space-y-4">
                             <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold text-slate-200">Historial de Transacciones</h3>
                                <button 
                                    onClick={() => exportLoanToCSV(loan)}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 text-sm font-medium transition-colors"
                                >
                                    <Download size={16} /> Exportar CSV
                                </button>
                            </div>
                            <PaymentHistory loan={loan} />
                        </div>
                    )}

                    {/* --- EDIT TAB --- */}
                    {activeTab === 'edit' && (
                         <form onSubmit={handleUpdateSubmit} className="max-w-2xl mx-auto space-y-6">
                            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-4">
                                <h3 className="text-lg font-bold text-slate-100 border-b border-slate-700 pb-2">Editar Datos Maestros</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <InputField label="Capital Inicial (€)" name="initialCapital" type="number" value={String(formData.initialCapital)} onChange={(e) => setFormData({...formData, initialCapital: Number(e.target.value)})} />
                                    <InputField label="Capital Pendiente (€)" name="remainingCapital" type="number" value={String(formData.remainingCapital)} onChange={(e) => setFormData({...formData, remainingCapital: Number(e.target.value)})} />
                                    <InputField label="Tasa Anual (%)" name="interestRate" type="number" value={String(formData.interestRate)} onChange={(e) => setFormData({...formData, interestRate: Number(e.target.value)})} />
                                    <InputField label="Fecha Inicio" name="startDate" type="date" value={String(formData.startDate)} onChange={(e) => setFormData({...formData, startDate: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Notas Internas</label>
                                    <textarea 
                                        value={formData.notes}
                                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                        className="w-full px-3 py-2 border border-slate-600 rounded-md bg-slate-700 text-slate-100"
                                        rows={3}
                                    />
                                </div>
                                <div className="pt-4 flex justify-between items-center">
                                    <button type="button" onClick={onDelete} className="text-red-400 hover:text-red-300 text-sm font-bold flex items-center gap-1">
                                        <Trash2 size={16} /> Cerrar/Eliminar Préstamo
                                    </button>
                                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-primary-600 text-white font-bold rounded-lg hover:bg-primary-700 disabled:opacity-50">
                                        {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                                    </button>
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
