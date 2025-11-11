import React, { useState, useEffect } from 'react';
import { Loan, Client, LoanStatus } from '../types';
import { X, Banknote, Calendar, BarChart, Percent, User, ThumbsUp, Clock, AlertTriangle, Edit, Trash2, Save, Loader2 } from 'lucide-react';
import { formatCurrency } from '../services/utils';
import PaymentHistory from './PaymentHistory';
import { useDataContext } from '../contexts/DataContext';
import { useAppContext } from '../contexts/AppContext';
import { InputField, SelectField } from './FormFields';

interface LoanDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    loan: Loan | null;
    client: Client | null;
}

const DetailItem: React.FC<{ icon: React.ReactNode, label: string, value: string | number }> = ({ icon, label, value }) => (
    <div className="flex items-center space-x-3 bg-slate-700/50 p-3 rounded-lg">
        <div className="text-primary-400">{icon}</div>
        <div>
            <p className="text-xs text-slate-400 font-medium">{label}</p>
            <p className="text-sm font-semibold text-slate-100">{value}</p>
        </div>
    </div>
);

const LoanDetailsModal: React.FC<LoanDetailsModalProps> = ({ isOpen, onClose, loan, client }) => {
    const { handleUpdateLoan, handleDeleteLoan } = useDataContext();
    const { showConfirmModal } = useAppContext();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<Loan>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (loan) {
            setFormData({
                amount: loan.amount,
                term: loan.term,
                interestRate: loan.interestRate,
                startDate: new Date(loan.startDate).toISOString().split('T')[0],
                status: loan.status,
                paymentsMade: loan.paymentsMade,
            });
        }
        // Always reset to view mode when modal opens or loan changes
        setIsEditing(false);
    }, [loan]);

    if (!isOpen || !loan || !client) {
        return null;
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const numericFields = ['amount', 'term', 'interestRate', 'paymentsMade'];
        setFormData(prev => ({ ...prev, [name]: numericFields.includes(name) ? Number(value) : value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await handleUpdateLoan(loan.id, formData);
            setIsEditing(false); // Switch back to view mode on success
        } catch (error) {
            // Error is handled by the hook's toast
        } finally {
            setIsSubmitting(false);
        }
    };

    const onDelete = () => {
        showConfirmModal({
            title: 'Confirmar Eliminación',
            message: `¿Estás seguro de que quieres eliminar este préstamo de ${formatCurrency(loan.amount)} para ${client.name}? Esta acción no se puede deshacer.`,
            onConfirm: async () => {
                await handleDeleteLoan(loan.id, client.name);
                onClose();
            },
            type: 'warning',
        });
    };

    const ProgressBar: React.FC = () => {
        const progress = (loan.paymentsMade / loan.term) * 100;
        return (
            <div>
                <div className="flex justify-between items-center mb-1">
                    <p className="text-sm font-semibold text-slate-200">Progreso del Pago</p>
                    <p className="text-sm font-bold text-slate-100">{loan.paymentsMade} / {loan.term} cuotas</p>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2.5">
                    <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
            </div>
        );
    };

    const StatusBadge: React.FC<{ status: LoanStatus }> = ({ status }) => {
        const baseClasses = "px-3 py-1 text-sm font-semibold rounded-full inline-flex items-center";
        let icon, textClasses;
        switch (status) {
            case LoanStatus.PAID:
                icon = <ThumbsUp size={14} className="mr-2"/>;
                textClasses = 'bg-green-500/10 text-green-400';
                break;
            case LoanStatus.PENDING:
                icon = <Clock size={14} className="mr-2"/>;
                 textClasses = 'bg-primary-500/10 text-primary-400';
                 break;
            case LoanStatus.OVERDUE:
                icon = <AlertTriangle size={14} className="mr-2"/>;
                 textClasses = 'bg-red-500/10 text-red-400';
                 break;
        }
        return <span className={`${baseClasses} ${textClasses}`}>{icon} {status}</span>;
    };

    const renderContent = () => {
        if (isEditing) {
            return (
                <form id="edit-loan-form" onSubmit={handleSubmit} className="space-y-4">
                    <InputField label="Monto Principal (€)" name="amount" type="number" value={String(formData.amount ?? '')} onChange={handleInputChange} required />
                    <InputField label="Plazo (meses)" name="term" type="number" value={String(formData.term ?? '')} onChange={handleInputChange} required />
                    <InputField label="Interés Anual (%)" name="interestRate" type="number" value={String(formData.interestRate ?? '')} onChange={handleInputChange} required />
                    <InputField label="Fecha de Inicio" name="startDate" type="date" value={String(formData.startDate ?? '')} onChange={handleInputChange} required />
                    <InputField label="Pagos Realizados" name="paymentsMade" type="number" value={String(formData.paymentsMade ?? '')} onChange={handleInputChange} required />
                    <SelectField label="Estado" name="status" value={formData.status ?? ''} onChange={handleInputChange} required>
                        {Object.values(LoanStatus).map(status => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </SelectField>
                </form>
            );
        }
        return (
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="grid grid-cols-1">
                        <DetailItem icon={<User size={18}/>} label="Cliente" value={client.name} />
                    </div>
                    <StatusBadge status={loan.status} />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <DetailItem icon={<Banknote size={18}/>} label="Monto Principal" value={formatCurrency(loan.amount)} />
                    <DetailItem icon={<Percent size={18}/>} label="Interés Anual" value={`${loan.interestRate}%`} />
                    <DetailItem icon={<Calendar size={18}/>} label="Plazo" value={`${loan.term} meses`} />
                    <DetailItem icon={<Banknote size={18}/>} label="Cuota Mensual" value={formatCurrency(loan.monthlyPayment)} />
                    <DetailItem icon={<BarChart size={18}/>} label="Total a Pagar" value={formatCurrency(loan.totalRepayment)} />
                    <DetailItem icon={<Calendar size={18}/>} label="Fecha de Inicio" value={new Date(loan.startDate).toLocaleDateString()} />
                </div>
                <ProgressBar />
                <PaymentHistory loan={loan} />
            </div>
        );
    };

    const renderFooter = () => {
        if (isEditing) {
            return (
                <div className="p-4 sm:p-6 mt-auto bg-slate-900/50 border-t border-slate-700 flex-shrink-0 flex justify-end gap-3">
                    <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 bg-slate-600 text-slate-100 font-bold rounded-lg hover:bg-slate-700 transition-colors">
                        Cancelar
                    </button>
                    <button type="submit" form="edit-loan-form" disabled={isSubmitting} className="inline-flex items-center justify-center px-4 py-2 bg-primary-600 text-white font-bold rounded-lg shadow-md hover:bg-primary-700 disabled:bg-primary-400">
                        {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                        {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            );
        }
        return (
            <div className="p-4 sm:p-6 mt-auto bg-slate-900/50 border-t border-slate-700 flex-shrink-0 flex justify-end gap-3">
                <button onClick={onDelete} className="inline-flex items-center px-4 py-2 bg-red-600/20 text-red-300 text-sm font-bold rounded-lg hover:bg-red-600/40">
                    <Trash2 size={16} className="mr-2" />
                    Eliminar
                </button>
                <button onClick={() => setIsEditing(true)} className="inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-bold rounded-lg hover:bg-primary-700">
                    <Edit size={16} className="mr-2" />
                    Editar
                </button>
            </div>
        );
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-0 sm:p-4 animate-modal-backdrop" 
            onClick={onClose}
        >
            <div
                className="bg-slate-800 rounded-none sm:rounded-xl shadow-xl w-full h-full sm:h-auto sm:max-w-2xl transform transition-all animate-modal-content flex flex-col border border-slate-700"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 sm:p-6 flex justify-between items-center border-b border-slate-700 flex-shrink-0">
                    <h2 className="text-xl font-bold text-slate-100">{isEditing ? 'Editar Préstamo' : 'Detalles del Préstamo'}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700">
                        <X className="h-6 w-6 text-slate-400" />
                    </button>
                </div>

                <div className="p-4 sm:p-6 overflow-y-auto">
                    {renderContent()}
                </div>

                {renderFooter()}
            </div>
        </div>
    );
};

export default LoanDetailsModal;
