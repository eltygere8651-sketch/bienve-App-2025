
import React, { useState, useMemo } from 'react';
import { X, Banknote, Save, Loader2, Calendar, Percent } from 'lucide-react';
import { Client } from '../types';
import { useDataContext } from '../contexts/DataContext';
import { InputField } from './FormFields';
import { formatCurrency } from '../services/utils';

interface NewLoanModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: Client | null;
}

const NewLoanModal: React.FC<NewLoanModalProps> = ({ isOpen, onClose, client }) => {
    const { handleAddLoan } = useDataContext();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Default values
    const [loanData, setLoanData] = useState({
        amount: '500',
        term: '12',
        interestRate: '96', // 8% monthly
        startDate: new Date().toISOString().split('T')[0],
        notes: ''
    });

    const calculations = useMemo(() => {
        const amount = parseFloat(loanData.amount);
        const term = parseInt(loanData.term);
        const rate = parseFloat(loanData.interestRate);

        if (isNaN(amount) || isNaN(term) || isNaN(rate) || amount <= 0 || term <= 0) {
            return { monthlyPayment: 0, totalRepayment: 0, monthlyRate: 0 };
        }

        const monthlyRate = (rate / 12) / 100;
        const monthlyPayment = (amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -term));
        const totalRepayment = monthlyPayment * term;

        return {
            monthlyPayment: isFinite(monthlyPayment) ? monthlyPayment : 0,
            totalRepayment: isFinite(totalRepayment) ? totalRepayment : 0,
            monthlyRate: rate / 12
        };

    }, [loanData.amount, loanData.term, loanData.interestRate]);

    if (!isOpen || !client) return null;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setLoanData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await handleAddLoan(client.id, client.name, {
                amount: parseFloat(loanData.amount),
                term: parseInt(loanData.term),
                interestRate: parseFloat(loanData.interestRate),
                startDate: loanData.startDate,
                notes: loanData.notes
            });
            onClose();
            // Reset form for next time
            setLoanData({
                amount: '500',
                term: '12',
                interestRate: '96',
                startDate: new Date().toISOString().split('T')[0],
                notes: ''
            });
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-modal-backdrop" onClick={onClose}>
            <div className="bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col border border-slate-700 overflow-hidden animate-modal-content" onClick={e => e.stopPropagation()}>
                
                <div className="p-6 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-100">Nuevo Préstamo</h2>
                        <p className="text-slate-400 text-sm">Cliente: <span className="text-primary-400 font-semibold">{client.name}</span></p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700 text-slate-400 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
                    <div className="grid grid-cols-2 gap-4">
                        <InputField label="Monto (€)" name="amount" type="number" value={loanData.amount} onChange={handleInputChange as any} required min="1" />
                        <InputField label="Plazo (meses)" name="term" type="number" value={loanData.term} onChange={handleInputChange as any} required min="1" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <InputField label="Interés Anual (%)" name="interestRate" type="number" value={loanData.interestRate} onChange={handleInputChange as any} required min="0" />
                        <InputField label="Fecha Inicio" name="startDate" type="date" value={loanData.startDate} onChange={handleInputChange as any} required />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Notas (Opcional)</label>
                        <textarea 
                            name="notes"
                            value={loanData.notes}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-slate-600 rounded-md bg-slate-700 text-slate-100 focus:ring-primary-500 focus:border-primary-500"
                            rows={2}
                            placeholder="Motivo del préstamo, acuerdos especiales..."
                        />
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 space-y-3">
                         <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Resumen de Condiciones</h3>
                         <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Interés Mensual:</span>
                            <span className="text-slate-200 font-bold">{calculations.monthlyRate.toFixed(2)}%</span>
                         </div>
                         <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Cuota Mensual:</span>
                            <span className="text-green-400 font-bold">{formatCurrency(calculations.monthlyPayment)}</span>
                         </div>
                         <div className="flex justify-between text-sm border-t border-slate-700 pt-2">
                            <span className="text-slate-400">Total a Pagar:</span>
                            <span className="text-primary-400 font-bold">{formatCurrency(calculations.totalRepayment)}</span>
                         </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" /> : <Save />}
                        Crear Préstamo
                    </button>
                </form>
            </div>
        </div>
    );
};

export default NewLoanModal;
