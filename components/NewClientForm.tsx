
import React, { useState, useMemo } from 'react';
import { UserPlus, ArrowLeft, Loader2, BarChart, Banknote, Percent, AlertCircle, Lock, Infinity as InfinityIcon, User, ChevronRight, Check } from 'lucide-react';
import { useDataContext } from '../contexts/DataContext';
import { useAppContext } from '../contexts/AppContext';
import { InputField } from './FormFields';
import { formatCurrency, isValidDNI, isValidPhone, formatDNI, formatPhone } from '../services/utils';
import { DEFAULT_ANNUAL_INTEREST_RATE, calculateLoanParameters } from '../config';

const NewClientForm: React.FC = () => {
    const { handleAddClientAndLoan } = useDataContext();
    const { setCurrentView } = useAppContext();
    const [step, setStep] = useState<1 | 2>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [isIndefinite, setIsIndefinite] = useState(false);

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
        const term = isIndefinite ? 0 : parseInt(loanData.term, 10);
        return calculateLoanParameters(amount, term, DEFAULT_ANNUAL_INTEREST_RATE);
    }, [loanData.amount, loanData.term, isIndefinite]);

    const handleClientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        let finalValue = value;

        // Auto-format DNI and Phone
        if (name === 'idNumber') {
            finalValue = formatDNI(value);
        } else if (name === 'phone') {
            // Permitir escribir, el formateo visual puede ser onBlur o simple
            // Aquí usamos simple limpieza para el estado, visualmente el input es libre
        }

        setClientData(prev => ({ ...prev, [name]: finalValue }));
        setFormError(null); 
    };
    
    const handleLoanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLoanData(prev => ({ ...prev, [name]: value }));
    };

    const validateStep1 = () => {
        if (!clientData.name.trim()) { setFormError("El nombre es obligatorio."); return false; }
        if (!isValidDNI(clientData.idNumber)) { setFormError("DNI/NIE inválido."); return false; }
        if (!clientData.address.trim()) { setFormError("La dirección es obligatoria."); return false; }
        if (!isValidPhone(clientData.phone)) { setFormError("Teléfono inválido."); return false; }
        return true;
    };

    const nextStep = () => {
        if (validateStep1()) {
            setFormError(null);
            setStep(2);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        
        if (parseFloat(loanData.amount) <= 0) {
            setFormError("El monto debe ser mayor a 0.");
            return;
        }

        setIsSubmitting(true);
        
        try {
            await handleAddClientAndLoan(
                {
                    name: clientData.name,
                    idNumber: clientData.idNumber,
                    phone: formatPhone(clientData.phone), // Ensure formatted saving
                    address: clientData.address,
                    email: clientData.email,
                },
                {
                    amount: parseFloat(loanData.amount),
                    term: isIndefinite ? 0 : parseInt(loanData.term, 10),
                }
            );
            
            setTimeout(() => {
                setCurrentView('clients');
            }, 500);

        } catch (error: any) {
            console.error("Error creating client and loan:", error);
            setFormError(error.message || "Error desconocido al registrar.");
            setIsSubmitting(false);
        }
    };
    
    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <UserPlus className="h-8 w-8 mr-3 text-primary-400" />
                    <h1 className="text-2xl font-heading font-bold text-slate-100">Nuevo Registro</h1>
                </div>
                 <button onClick={() => setCurrentView('clients')} className="text-slate-400 hover:text-white transition-colors text-sm font-medium flex items-center">
                    <ArrowLeft className="mr-1 h-4 w-4" /> Cancelar
                </button>
            </div>
            
            {/* Steps Indicator */}
            <div className="flex items-center justify-center space-x-4 mb-8">
                <div className={`flex items-center space-x-2 ${step === 1 ? 'text-primary-400' : 'text-slate-500'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 ${step >= 1 ? 'border-primary-500 bg-primary-500/10' : 'border-slate-600'}`}>1</div>
                    <span className="font-medium">Datos Personales</span>
                </div>
                <div className="w-12 h-px bg-slate-700"></div>
                <div className={`flex items-center space-x-2 ${step === 2 ? 'text-primary-400' : 'text-slate-500'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 ${step === 2 ? 'border-primary-500 bg-primary-500/10' : 'border-slate-600'}`}>2</div>
                    <span className="font-medium">Préstamo</span>
                </div>
            </div>

            <div className="bg-slate-800 p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-700 relative overflow-hidden">
                 {/* Error Banner */}
                 {formError && (
                    <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-3 text-red-200 animate-fade-in">
                        <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                        <p className="text-sm font-medium">{formError}</p>
                    </div>
                )}

                {step === 1 && (
                    <div className="animate-fade-in space-y-6">
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-700">
                             <User className="text-primary-400" size={20} />
                             <h2 className="text-lg font-bold text-slate-200">Ficha del Cliente</h2>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="md:col-span-2">
                                <InputField label="Nombre Completo" name="name" type="text" value={clientData.name} onChange={handleClientChange} required />
                            </div>
                            <InputField label="DNI / NIE" name="idNumber" type="text" value={clientData.idNumber} onChange={handleClientChange} required />
                            <InputField label="Teléfono" name="phone" type="tel" value={clientData.phone} onChange={handleClientChange} required />
                            <div className="md:col-span-2">
                                <InputField label="Dirección Completa" name="address" type="text" value={clientData.address} onChange={handleClientChange} required />
                            </div>
                            <div className="md:col-span-2">
                                <InputField label="Email (Opcional)" name="email" type="email" value={clientData.email} onChange={handleClientChange} isOptional />
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button onClick={nextStep} className="inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-500 transition-all shadow-lg shadow-primary-900/20">
                                Siguiente Paso <ChevronRight size={18} className="ml-2" />
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="animate-fade-in space-y-6">
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-700">
                             <div className="flex items-center gap-2">
                                <Banknote className="text-green-400" size={20} />
                                <h2 className="text-lg font-bold text-slate-200">Configurar Préstamo</h2>
                             </div>
                             <div className="text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded">
                                 Tasa Fija: 8% Mensual
                             </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {/* Inputs */}
                            <div className="space-y-4">
                                <InputField label="Monto a Prestar (€)" name="amount" type="number" value={loanData.amount} onChange={handleLoanChange} required min="1" step="0.01" />
                                
                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center justify-between bg-slate-700/30 p-3 rounded-lg border border-slate-600">
                                        <span className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                            <InfinityIcon size={16} className="text-primary-400" />
                                            Plazo Indefinido
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setIsIndefinite(!isIndefinite)}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isIndefinite ? 'bg-primary-600' : 'bg-slate-600'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isIndefinite ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>

                                    {!isIndefinite && (
                                        <InputField label="Plazo (Meses)" name="term" type="number" value={loanData.term} onChange={handleLoanChange} required min="1" />
                                    )}
                                </div>
                            </div>

                            {/* Simulator Card */}
                            <div className="bg-slate-900/50 rounded-xl p-5 border border-slate-600 flex flex-col justify-center">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Simulación de Pago</h3>
                                
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <span className="text-sm text-slate-300">{isIndefinite ? 'Pago Mensual (Interés)' : 'Cuota Mensual'}</span>
                                        <span className="text-2xl font-bold text-white">{formatCurrency(loanCalculations.monthlyPayment)}</span>
                                    </div>
                                    
                                    <div className="w-full h-px bg-slate-700"></div>

                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400">Total a Devolver</span>
                                        <span className="font-bold text-primary-300">
                                            {isIndefinite ? 'Capital + Intereses' : formatCurrency(loanCalculations.totalRepayment)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400">Interés Aplicado</span>
                                        <span className="font-mono text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-300">8% / mes</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between pt-6 border-t border-slate-700">
                            <button onClick={() => setStep(1)} className="text-slate-400 hover:text-white font-medium px-4">
                                Atrás
                            </button>
                            <button 
                                onClick={handleSubmit} 
                                disabled={isSubmitting} 
                                className="inline-flex items-center justify-center px-8 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-500 transition-all shadow-lg shadow-green-900/20 disabled:bg-slate-600 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Check className="mr-2" />}
                                Finalizar Registro
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NewClientForm;
