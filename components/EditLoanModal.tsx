import React, { useState, useEffect } from 'react';
import { Loan, LoanStatus } from '../types';
import { X, Save, Loader2 } from 'lucide-react';
import { useDataContext } from '../contexts/DataContext';
import { InputField, SelectField } from './FormFields';

interface EditLoanModalProps {
    isOpen: boolean;
    onClose: () => void;
    loan: Loan | null;
}

const EditLoanModal: React.FC<EditLoanModalProps> = ({ isOpen, onClose, loan }) => {
    const { handleUpdateLoan } = useDataContext();
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
    }, [loan]);

    if (!isOpen || !loan) {
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
            onClose();
        } catch (error) {
            // Error is handled by the hook's toast
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4 animate-modal-backdrop"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="bg-slate-800 rounded-xl shadow-xl w-full max-w-lg transform transition-all animate-modal-content border border-slate-700"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 flex justify-between items-center border-b border-slate-700">
                    <h2 className="text-xl font-bold text-slate-100">Editar Préstamo</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700">
                        <X className="h-6 w-6 text-slate-400" />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <InputField label="Monto Principal (€)" name="amount" type="number" value={String(formData.amount || '')} onChange={handleInputChange} required />
                        <InputField label="Plazo (meses)" name="term" type="number" value={String(formData.term || '')} onChange={handleInputChange} required />
                        <InputField label="Interés Anual (%)" name="interestRate" type="number" value={String(formData.interestRate || '')} onChange={handleInputChange} required />
                        <InputField label="Fecha de Inicio" name="startDate" type="date" value={String(formData.startDate || '')} onChange={handleInputChange} required />
                        <InputField label="Pagos Realizados" name="paymentsMade" type="number" value={String(formData.paymentsMade || '')} onChange={handleInputChange} required />

                        <SelectField label="Estado" name="status" value={formData.status || ''} onChange={handleInputChange} required>
                            {Object.values(LoanStatus).map(status => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </SelectField>
                    </div>
                    <div className="p-6 bg-slate-900/50 border-t border-slate-700 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-600 text-slate-100 font-bold rounded-lg hover:bg-slate-700 transition-colors">
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="inline-flex items-center justify-center px-4 py-2 bg-primary-600 text-white font-bold rounded-lg shadow-md hover:bg-primary-700 disabled:bg-primary-400"
                        >
                            {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                            {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditLoanModal;
