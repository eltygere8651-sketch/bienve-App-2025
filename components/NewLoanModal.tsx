
import React, { useState, useMemo } from 'react';
import { X, Save, Loader2, Lock, Infinity as InfinityIcon, Wallet, RefreshCw } from 'lucide-react';
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
    const [isIndefinite, setIsIndefinite] = useState(false);
    const [fundingSource, setFundingSource] = useState<'Capital' | 'Reinvested'>('Capital');
    
    // Default values - Interest locked to 96 (8% monthly)
    const [loanData, setLoanData] = useState({
        amount: '500',
        term: '12',
        interestRate: '96', 
        startDate: new Date().toISOString().split('T')[0],
        notes: ''
    });

    const calculations = useMemo(() => {
        const amount = parseFloat(loanData.amount);
        const term = isIndefinite ? 0 : parseInt(loanData.term);
        const rate = parseFloat(loanData.interestRate);

        return calculateLoanParameters(amount, term, rate);

    }, [loanData.amount, loanData.term, loanData.interestRate, isIndefinite]);

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
                interestRate: parseFloat(loanData.interestRate),
                startDate: loanData.startDate,
                notes: loanData.notes,
                fundingSource: fundingSource
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
            setIsIndefinite(false);
            setFundingSource('Capital');
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
                    {/* FUNDING SOURCE SELECTOR */}
                    <div className="bg-slate-900/30 p-3 rounded-xl border border-slate-700/50 flex flex-col gap-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Origen de Fondos</label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setFundingSource('Capital')}
                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                                    fundingSource === 'Capital' 
                                        ? 'bg-blue-600/20 text-blue-400 border-blue-500/50 shadow-sm' 
                                        : 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700'
                                }`}
                            >
                                <Wallet size={14} /> Aportación Capital
                            </button>
                            <button
                                type="button"
                                onClick={() => setFundingSource('Reinvested')}
                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                                    fundingSource === 'Reinvested' 
                                        ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/50 shadow-sm' 
                                        : 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700'
                                }`}
                            >
                                <RefreshCw size={14} /> Reinvertir Ganancias
                            </button>
                        </div>
                    </div>

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
                        <div className="relative opacity-75">
                            <InputField label="Interés Anual (%)" name="interestRate" type="number" value={loanData.interestRate} onChange={() => {}} required min="0" step="0.01" />
                            <div className="absolute inset-0 bg-slate-900/10 cursor-not-allowed flex items-center justify-end pr-8 pb-3 pointer-events-none">
                                <Lock size={16} className="text-slate-400" />
                            </div>
                            <p className="text-[10px] text-primary-400 mt-1 absolute bottom-[-18px]">Fijo: 8% Mensual</p>
                        </div>
                        <InputField label="Fecha Inicio" name="startDate" type="date" value={loanData.startDate} onChange={handleInputChange as any} required />
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
                         <div className="mt-2 text-xs text-center text-slate-500 bg-slate-800/50 p-2 rounded">
                             El dinero ({formatCurrency(parseFloat(loanData.amount) || 0)}) se descontará de 
                             <strong className={fundingSource === 'Capital' ? 'text-blue-400 ml-1' : 'text-emerald-400 ml-1'}>
                                 {fundingSource === 'Capital' ? 'CAJA / APORTACIÓN' : 'GANANCIAS ACUMULADAS'}
                             </strong>
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
