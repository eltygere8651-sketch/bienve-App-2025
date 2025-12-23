
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { ReceiptText, Download, Calculator, AlertCircle, Info } from 'lucide-react';
import { generatePaymentReceipt } from '../services/pdfService';
import SignaturePad, { SignaturePadRef } from './SignaturePad';
import { useAppContext } from '../contexts/AppContext';
import { useDataContext } from '../contexts/DataContext';
import { Loan, LoanStatus } from '../types';
import { formatCurrency } from '../services/utils';

const ReceiptGenerator: React.FC = () => {
    const { showToast } = useAppContext();
    const { loans } = useDataContext();
    
    // Form State
    const [selectedLoanId, setSelectedLoanId] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    
    // Manual overrides (solo si no se selecciona un préstamo)
    const [manualClientName, setManualClientName] = useState('');
    const [manualPreviousBalance, setManualPreviousBalance] = useState('');

    const signaturePadRef = useRef<SignaturePadRef>(null);

    // Filtrar préstamos activos
    const activeLoans = useMemo(() => {
        return loans.filter(l => l.status === LoanStatus.PENDING || l.status === LoanStatus.OVERDUE);
    }, [loans]);

    const selectedLoan = useMemo(() => {
        return activeLoans.find(l => l.id === selectedLoanId) || null;
    }, [selectedLoanId, activeLoans]);

    // Cálculos "Inteligentes" basados en la regla de negocio
    const calculations = useMemo(() => {
        const amount = parseFloat(paymentAmount);
        let currentBalance = 0;
        let monthlyRate = 0.08; // Default 8% for manual mode

        if (selectedLoan) {
            currentBalance = selectedLoan.remainingCapital;
            monthlyRate = (selectedLoan.interestRate / 12) / 100;
        } else if (selectedLoanId === 'manual') {
            currentBalance = parseFloat(manualPreviousBalance) || 0;
        }

        const interestDue = currentBalance * monthlyRate;

        if (isNaN(amount) || amount <= 0) {
            return { 
                previousBalance: currentBalance,
                interestPart: 0, 
                capitalPart: 0, 
                newBalance: currentBalance,
                interestDue 
            };
        }

        // Lógica: Primero se cobran intereses, el resto reduce capital
        // Regla: 8% mensual fijo sobre deuda pendiente.
        const interestPart = Math.min(amount, interestDue); 
        
        // Si paga de más (ej: deuda 100, paga 200), asumimos que reduce capital.
        // Si paga menos del interés, el capital no baja.
        const capitalPart = Math.max(0, amount - interestDue); 
        const newBalance = Math.max(0, currentBalance - capitalPart);

        return {
            previousBalance: currentBalance,
            interestPart,
            capitalPart,
            newBalance,
            interestDue
        };
    }, [selectedLoan, selectedLoanId, paymentAmount, manualPreviousBalance]);

    const isFormValid = (selectedLoanId && selectedLoanId !== 'manual' ? true : (manualClientName && manualPreviousBalance)) && parseFloat(paymentAmount) > 0;

    const resetForm = () => {
        setSelectedLoanId('');
        setPaymentAmount('');
        setPaymentDate(new Date().toISOString().split('T')[0]);
        setNotes('');
        setManualClientName('');
        setManualPreviousBalance('');
        signaturePadRef.current?.clear();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid) return;

        const signatureImage = signaturePadRef.current?.toDataURL();
        const clientName = selectedLoan ? selectedLoan.clientName : manualClientName;
        const loanIdRef = selectedLoan ? selectedLoan.id : 'MANUAL';

        // Determinar tipo de pago basado en el cálculo
        let paymentDescription = 'Abono General';
        if (calculations.capitalPart > 0 && calculations.interestPart > 0) paymentDescription = 'Interés + Abono a Capital';
        else if (calculations.capitalPart > 0 && calculations.interestPart === 0) paymentDescription = 'Abono Directo a Capital'; // Raro, pero posible si no hay deuda
        else paymentDescription = 'Pago de Intereses';

        // En modo manual, añadimos una nota automática sobre el cálculo
        const finalNotes = selectedLoanId === 'manual' 
            ? `${notes ? notes + '. ' : ''}Cálculo manual (8%): Interés ${formatCurrency(calculations.interestPart)}, Capital ${formatCurrency(calculations.capitalPart)}.`
            : notes;

        generatePaymentReceipt({
            clientName: clientName,
            loanId: loanIdRef,
            paymentAmount: parseFloat(paymentAmount),
            paymentType: paymentDescription,
            paymentDate: paymentDate,
            notes: finalNotes,
            previousBalance: calculations.previousBalance,
            newBalance: calculations.newBalance,
            interestPaid: calculations.interestPart,
            capitalPaid: calculations.capitalPart
        }, signatureImage);

        showToast('Recibo inteligente generado correctamente.', 'success');
        resetForm();
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center">
                <ReceiptText className="h-8 w-8 mr-3 text-primary-400" />
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">Generador de Recibos</h1>
                    <p className="text-slate-400 text-sm">Calcula automáticamente intereses (8%) y capital, incluso en manual.</p>
                </div>
            </div>
            
            <form onSubmit={handleSubmit} className="bg-slate-800 p-4 sm:p-8 rounded-xl shadow-lg space-y-6 border border-slate-700">
                 
                 {/* Selector de Préstamo */}
                 <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-600">
                    <label className="block text-sm font-bold text-primary-400 mb-2">Seleccionar Origen</label>
                    <select
                        value={selectedLoanId}
                        onChange={(e) => setSelectedLoanId(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-slate-800 text-slate-100"
                    >
                        <option value="">-- Seleccionar --</option>
                        {activeLoans.map(loan => (
                            <option key={loan.id} value={loan.id}>
                                {loan.clientName} - Deuda: {formatCurrency(loan.remainingCapital)}
                            </option>
                        ))}
                        <option value="manual">-- INGRESO MANUAL (Calculadora 8%) --</option>
                    </select>
                 </div>

                 {/* Campos Manuales (Solo si selecciona manual) */}
                 {selectedLoanId === 'manual' && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in bg-slate-700/30 p-4 rounded-xl border border-slate-600">
                        <div className="md:col-span-2 flex items-center gap-2 text-yellow-400 text-xs mb-2">
                            <Info size={14} />
                            <span>Modo Manual: Se aplicará la regla del 8% mensual automáticamente.</span>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Nombre del Cliente</label>
                            <input type="text" value={manualClientName} onChange={(e) => setManualClientName(e.target.value)} className="w-full px-3 py-2 border border-slate-600 rounded-md bg-slate-700 text-slate-100" placeholder="Nombre completo" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Saldo Anterior (€)</label>
                            <input type="number" value={manualPreviousBalance} onChange={(e) => setManualPreviousBalance(e.target.value)} className="w-full px-3 py-2 border border-slate-600 rounded-md bg-slate-700 text-slate-100" placeholder="0.00" />
                        </div>
                     </div>
                 )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Monto Recibido (€)</label>
                        <input
                            type="number"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            required
                            min="0.01"
                            step="0.01"
                            placeholder="Ej: 80.00"
                            className="w-full px-3 py-2 border border-slate-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-slate-700 text-white font-bold text-lg"
                        />
                        {(selectedLoan || (selectedLoanId === 'manual' && manualPreviousBalance)) && (
                            <p className="text-xs text-slate-400 mt-1">
                                Interés mensual esperado (8%): <span className="text-amber-400 font-bold">{formatCurrency(calculations.interestDue)}</span>
                            </p>
                        )}
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Fecha del Pago</label>
                        <input
                            type="date"
                            value={paymentDate}
                            onChange={(e) => setPaymentDate(e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-slate-600 rounded-md bg-slate-700 text-slate-100"
                        />
                    </div>
                </div>

                {/* Previsualización de Cálculos */}
                {(selectedLoan || (selectedLoanId === 'manual' && manualPreviousBalance)) && paymentAmount && (
                    <div className="bg-slate-700/30 p-4 rounded-xl border border-slate-600 space-y-3 animate-fade-in">
                        <div className="flex items-center gap-2 mb-2">
                            <Calculator size={18} className="text-primary-400" />
                            <h3 className="font-bold text-slate-200">Desglose del Pago</h3>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 text-center text-sm">
                            <div className="bg-slate-800 p-2 rounded border border-slate-600">
                                <p className="text-slate-400 text-xs uppercase">Interés (8%)</p>
                                <p className="text-green-400 font-bold text-lg">{formatCurrency(calculations.interestPart)}</p>
                            </div>
                            <div className="bg-slate-800 p-2 rounded border border-slate-600">
                                <p className="text-slate-400 text-xs uppercase">Reduce Deuda</p>
                                <p className="text-blue-400 font-bold text-lg">{formatCurrency(calculations.capitalPart)}</p>
                            </div>
                            <div className="bg-slate-800 p-2 rounded border border-slate-600">
                                <p className="text-slate-400 text-xs uppercase">Nuevo Saldo</p>
                                <p className="text-amber-400 font-bold text-lg">{formatCurrency(calculations.newBalance)}</p>
                            </div>
                        </div>

                        {calculations.capitalPart === 0 && (
                            <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-900/20 p-2 rounded border border-amber-500/20">
                                <AlertCircle size={14} />
                                Este pago solo cubre intereses. La deuda original no baja.
                            </div>
                        )}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Notas Adicionales (Opcional)</label>
                    <textarea
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-600 rounded-md bg-slate-700 text-slate-100"
                        placeholder="Ej: Pago realizado por transferencia..."
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Firma del Prestamista (Opcional)</label>
                    <div className="border border-slate-600 rounded-md overflow-hidden">
                        <SignaturePad ref={signaturePadRef} />
                    </div>
                </div>

                <div className="text-right">
                    <button 
                        type="submit"
                        disabled={!isFormValid}
                        className="inline-flex items-center justify-center px-6 py-4 bg-green-600 text-white font-bold rounded-lg shadow-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-transform hover:scale-105 disabled:bg-slate-600 disabled:cursor-not-allowed w-full sm:w-auto"
                    >
                        <Download className="mr-2 h-5 w-5" />
                        Generar Recibo PDF
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ReceiptGenerator;
