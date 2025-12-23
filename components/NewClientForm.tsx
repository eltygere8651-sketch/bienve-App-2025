
import React, { useState, useMemo } from 'react';
import { UserPlus, ArrowLeft, Loader2, BarChart, Banknote, Calendar, Percent } from 'lucide-react';
import { useDataContext } from '../contexts/DataContext';
import { useAppContext } from '../contexts/AppContext';
import { InputField } from './FormFields';
import { formatCurrency } from '../services/utils';

const NewClientForm: React.FC = () => {
    const { handleAddClientAndLoan } = useDataContext();
    const { setCurrentView } = useAppContext();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Default to 8% Monthly (96% Annual) as requested
    const defaultAnnualRate = 96;

    const [clientData, setClientData] = useState({
        name: '',
        idNumber: '',
        address: '',
        phone: '',
        email: '',
    });

    const [loanData, setLoanData] = useState({
        amount: '1000',
        term: '12',
    });

    const loanCalculations = useMemo(() => {
        const amount = parseFloat(loanData.amount);
        const term = parseInt(loanData.term, 10);
        if (isNaN(amount) || isNaN(term) || amount <= 0 || term <= 0) {
            return { monthlyPayment: 0, totalRepayment: 0 };
        }

        const monthlyRate = (defaultAnnualRate / 12) / 100;
        const monthlyPayment = (amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -term));
        const totalRepayment = monthlyPayment * term;

        return {
            monthlyPayment: isFinite(monthlyPayment) ? monthlyPayment : 0,
            totalRepayment: isFinite(totalRepayment) ? totalRepayment : 0,
            monthlyInterestRate: defaultAnnualRate / 12,
        };
    }, [loanData.amount, loanData.term]);

    const handleClientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setClientData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleLoanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLoanData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await handleAddClientAndLoan(
                {
                    name: clientData.name,
                    idNumber: clientData.idNumber,
                    phone: clientData.phone,
                    address: clientData.address,
                    email: clientData.email,
                },
                {
                    amount: parseFloat(loanData.amount),
                    term: parseInt(loanData.term, 10),
                }
            );
            setCurrentView('clients');
        } catch (error) {
            console.error("Error creating client and loan:", error);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <UserPlus className="h-8 w-8 mr-3 text-primary-400" />
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">Registrar Cliente y Préstamo</h1>
                </div>
                 <button onClick={() => setCurrentView('clients')} className="inline-flex items-center justify-center px-4 py-2 bg-slate-700 text-slate-200 font-bold rounded-lg hover:bg-slate-600 transition-colors text-sm">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver
                </button>
            </div>
            
            <form onSubmit={handleSubmit} className="bg-slate-800 p-4 sm:p-8 rounded-xl shadow-lg space-y-8 border border-slate-700">
                <div>
                    <h2 className="text-lg font-semibold text-slate-200 mb-4 border-b border-slate-700 pb-2">Información del Cliente</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputField label="Nombre Completo" name="name" type="text" value={clientData.name} onChange={handleClientChange} required />
                        <InputField label="DNI / NIE" name="idNumber" type="text" value={clientData.idNumber} onChange={handleClientChange} required />
                        <InputField label="Dirección Completa" name="address" type="text" value={clientData.address} onChange={handleClientChange} required />
                        <InputField label="Teléfono" name="phone" type="tel" value={clientData.phone} onChange={handleClientChange} required />
                        <div className="md:col-span-2">
                             <InputField label="Email" name="email" type="email" value={clientData.email} onChange={handleClientChange} isOptional />
                        </div>
                    </div>
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-slate-200 mb-4 border-b border-slate-700 pb-2">Detalles del Préstamo Inicial</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputField label="Monto a Prestar (€)" name="amount" type="number" value={loanData.amount} onChange={handleLoanChange} required min="1" />
                        <InputField label="Plazo (en meses)" name="term" type="number" value={loanData.term} onChange={handleLoanChange} required min="1" />
                    </div>
                    <div className="mt-6 bg-slate-700/50 p-4 rounded-lg">
                        <h3 className="text-base font-semibold text-slate-200 mb-3">Resumen Contable (Est. 8% Mensual)</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="flex items-center space-x-3">
                                <Banknote className="h-6 w-6 text-green-400"/>
                                <div>
                                    <p className="text-xs text-slate-400">Cuota Sugerida</p>
                                    <p className="text-base font-bold text-slate-100">{formatCurrency(loanCalculations.monthlyPayment)}</p>
                                </div>
                            </div>
                             <div className="flex items-center space-x-3">
                                <BarChart className="h-6 w-6 text-primary-400"/>
                                <div>
                                    <p className="text-xs text-slate-400">Total a Pagar</p>
                                    <p className="text-base font-bold text-slate-100">{formatCurrency(loanCalculations.totalRepayment)}</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <Percent className="h-6 w-6 text-purple-400"/>
                                <div>
                                    <p className="text-xs text-slate-400">Interés Mensual</p>
                                    <p className="text-base font-bold text-slate-100">{loanCalculations.monthlyInterestRate.toFixed(0)}%</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                 <div className="text-right pt-4 border-t border-slate-700">
                     <button type="submit" disabled={isSubmitting} className="inline-flex items-center justify-center px-6 py-3 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-transform hover:scale-105 disabled:bg-green-400">
                         {isSubmitting ? (<><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Registrando...</>) : (<><UserPlus className="mr-2 h-5 w-5" /> Registrar Cliente y Préstamo</>)}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default NewClientForm;
