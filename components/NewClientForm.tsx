
import React, { useState, useMemo } from 'react';
import { UserPlus, ArrowLeft, Loader2, BarChart, Banknote, Percent, AlertCircle, Lock } from 'lucide-react';
import { useDataContext } from '../contexts/DataContext';
import { useAppContext } from '../contexts/AppContext';
import { InputField } from './FormFields';
import { formatCurrency, isValidDNI, isValidPhone } from '../services/utils';
import { DEFAULT_ANNUAL_INTEREST_RATE, calculateLoanParameters } from '../config';

const NewClientForm: React.FC = () => {
    const { handleAddClientAndLoan } = useDataContext();
    const { setCurrentView } = useAppContext();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

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
        
        return calculateLoanParameters(amount, term, DEFAULT_ANNUAL_INTEREST_RATE);
    }, [loanData.amount, loanData.term]);

    const handleClientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setClientData(prev => ({ ...prev, [name]: value }));
        setFormError(null); 
    };
    
    const handleLoanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLoanData(prev => ({ ...prev, [name]: value }));
    };

    const validateForm = () => {
        if (!isValidDNI(clientData.idNumber)) {
            setFormError("El formato del DNI/NIE no es válido.");
            return false;
        }
        if (!isValidPhone(clientData.phone)) {
            setFormError("El número de teléfono no parece válido.");
            return false;
        }
        if (parseFloat(loanData.amount) <= 0 || parseInt(loanData.term) <= 0) {
            setFormError("El monto y el plazo deben ser mayores a 0.");
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        
        if (!validateForm()) return;

        setIsSubmitting(true);
        
        try {
            await handleAddClientAndLoan(
                {
                    name: clientData.name,
                    idNumber: clientData.idNumber.toUpperCase().trim(),
                    phone: clientData.phone,
                    address: clientData.address,
                    email: clientData.email,
                },
                {
                    amount: parseFloat(loanData.amount),
                    term: parseInt(loanData.term, 10),
                }
            );
            
            // PEQUEÑO RETARDO TÉCNICO
            setTimeout(() => {
                setCurrentView('clients');
            }, 500);

        } catch (error: any) {
            console.error("Error creating client and loan:", error);
            setFormError(error.message || "Error desconocido al registrar.");
            setIsSubmitting(false); // Solo paramos loading si hubo error
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
                {formError && (
                    <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 flex items-center text-red-200 animate-fade-in">
                        <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
                        <p>{formError}</p>
                    </div>
                )}

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
                    
                    {/* Regla Inquebrantable Banner */}
                    <div className="mb-6 bg-blue-900/30 border border-blue-500/30 p-3 rounded-lg flex items-start gap-3">
                         <Lock className="text-blue-400 h-5 w-5 mt-0.5 flex-shrink-0" />
                         <div>
                             <p className="text-sm text-blue-200 font-bold">Regla de Oro: Interés Fijo 8% Mensual</p>
                             <p className="text-xs text-blue-300">
                                 La tasa está fijada al 96% anual (8% mensual). El capital adeudado solo disminuirá si el pago del cliente supera el interés acumulado.
                             </p>
                         </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputField label="Monto a Prestar (€)" name="amount" type="number" value={loanData.amount} onChange={handleLoanChange} required min="1" step="0.01" />
                        <InputField label="Plazo (en meses)" name="term" type="number" value={loanData.term} onChange={handleLoanChange} required min="1" />
                    </div>
                    <div className="mt-6 bg-slate-700/50 p-4 rounded-lg">
                        <h3 className="text-base font-semibold text-slate-200 mb-3">Resumen Contable (8% Mensual)</h3>
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
                                    <p className="text-xs text-slate-400">Tasa Mensual</p>
                                    <p className="text-base font-bold text-slate-100 flex items-center">
                                        8% <Lock size={12} className="ml-1 opacity-50"/>
                                    </p>
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
