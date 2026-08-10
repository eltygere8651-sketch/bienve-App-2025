
import React, { useState, useMemo } from 'react';
import { X, Save, Loader2, Lock, Infinity as InfinityIcon } from 'lucide-react';
import { Client } from '../types';
import { useDataContext } from '../contexts/DataContext';
import { InputField } from './FormFields';
import { formatCurrency } from '../services/utils';
import { calculateLoanParameters } from '../config';

interface NewLoanModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: Client | null;
}

const NewLoanModal: React.FC<NewLoanModalProps> = ({ isOpen, onClose, client }) => {
    const { handleAddLoan } = useDataContext();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isIndefinite, setIsIndefinite] = useState(true);
    
    // Default values - Interest editable (defaults to 8% monthly = 96% annual)
    const [monthlyInterestRate, setMonthlyInterestRate] = useState('8');
    const [loanData, setLoanData] = useState({
        amount: '500',
        term: '12',
        startDate: new Date().toISOString().split('T')[0],
        notes: ''
    });
    const [fundingSource, setFundingSource] = useState<'Banco' | 'Efectivo' | 'Fondo Personal'>('Efectivo');

    const annualInterestRate = useMemo(() => {
        const mRate = parseFloat(monthlyInterestRate) || 0;
        return mRate * 12;
    }, [monthlyInterestRate]);

    const calculations = useMemo(() => {
        const amount = parseFloat(loanData.amount) || 0;
        const term = isIndefinite ? 0 : (parseInt(loanData.term) || 0);

        return calculateLoanParameters(amount, term, annualInterestRate);

    }, [loanData.amount, loanData.term, annualInterestRate, isIndefinite]);

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
                term: isIndefinite ? 0 : parseInt(loanData.term),
                interestRate: annualInterestRate,
                startDate: loanData.startDate,
                notes: loanData.notes,
                source: fundingSource
            });
            onClose();
            // Reset form for next time
            setMonthlyInterestRate('8');
            setLoanData({
                amount: '500',
                term: '12',
                startDate: new Date().toISOString().split('T')[0],
                notes: ''
            });
            setIsIndefinite(true);
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
                        <InputField label="Monto (€)" name="amount" type="number" value={loanData.amount} onChange={handleInputChange as any} required min="1" step="0.01" />
                        
                         <div className="space-y-2">
                            {/* Toggle Indefinido */}
                            <div className="flex items-center justify-between bg-slate-700/50 p-2 rounded-lg border border-slate-600">
                                <span className="text-xs font-medium text-slate-300 flex items-center gap-1">
                                    <InfinityIcon size={14} className="text-primary-400" />
                                    Indefinido
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setIsIndefinite(!isIndefinite)}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${isIndefinite ? 'bg-primary-600' : 'bg-slate-600'}`}
                                >
                                    <span
                                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isIndefinite ? 'translate-x-5' : 'translate-x-1'}`}
                                    />
                                </button>
                            </div>
                            
                            {!isIndefinite ? (
                                <InputField label="Plazo (meses)" name="term" type="number" value={loanData.term} onChange={handleInputChange as any} required min="1" />
                            ) : (
                                <div className="h-[62px] flex items-center justify-center text-xs text-slate-500 border border-slate-700 border-dashed rounded bg-slate-800/50">
                                    Sin límite de tiempo
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <InputField 
                                label="Interés Mensual (%)" 
                                name="monthlyInterestRate" 
                                type="number" 
                                value={monthlyInterestRate} 
                                onChange={(e) => setMonthlyInterestRate(e.target.value)} 
                                required 
                                min="0" 
                                step="0.1" 
                                placeholder="8"
                            />
                            <p className="text-[10px] text-slate-400 mt-1">
                                Anual: <span className="text-primary-300 font-bold">{annualInterestRate.toFixed(2)}%</span>
                            </p>
                        </div>
                        <InputField label="Fecha Inicio" name="startDate" type="date" value={loanData.startDate} onChange={handleInputChange as any} required />
                    </div>

                    <div className="mt-4">
                        <label className="block text-sm font-medium text-slate-300 mb-2">Fondo de Origen</label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setFundingSource('Efectivo')}
                                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-bold transition-all ${fundingSource === 'Efectivo' ? 'bg-primary-600 border-primary-500 text-white shadow-lg' : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:bg-slate-700'}`}
                            >
                                Efectivo
                            </button>
                            <button
                                type="button"
                                onClick={() => setFundingSource('Banco')}
                                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-bold transition-all ${fundingSource === 'Banco' ? 'bg-primary-600 border-primary-500 text-white shadow-lg' : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:bg-slate-700'}`}
                            >
                                Banco
                            </button>
                            <button
                                type="button"
                                onClick={() => setFundingSource('Fondo Personal')}
                                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-bold transition-all ${fundingSource === 'Fondo Personal' ? 'bg-primary-600 border-primary-500 text-white shadow-lg' : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:bg-slate-700'}`}
                            >
                                Personal
                            </button>
                        </div>
                    </div>

                    <div className="mt-4">
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
                            <span className="text-slate-200 font-bold">{calculations.monthlyRatePercentage.toFixed(2)}%</span>
                         </div>
                         <div className="flex justify-between text-sm">
                            <span className="text-slate-400">{isIndefinite ? 'Solo Interés:' : 'Cuota Mensual:'}</span>
                            <span className="text-green-400 font-bold">{formatCurrency(calculations.monthlyPayment)}</span>
                         </div>
                         <div className="flex justify-between text-sm border-t border-slate-700 pt-2">
                            <span className="text-slate-400">Total a Pagar:</span>
                            <span className="text-primary-400 font-bold">
                                {isIndefinite ? 'Capital + Intereses' : formatCurrency(calculations.totalRepayment)}
                            </span>
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
