
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { ReceiptText, Download, Calculator, AlertCircle, Info, Loader2 } from 'lucide-react';
import { generatePaymentReceipt } from '../services/pdfService';
import SignaturePad, { SignaturePadRef } from './SignaturePad';
import { useAppContext } from '../contexts/AppContext';
import { useDataContext } from '../contexts/DataContext';
import { Loan, LoanStatus } from '../types';
import { formatCurrency } from '../services/utils';
import { calculateAccruedInterest } from '../config';

const ReceiptGenerator: React.FC = () => {
    const { showToast } = useAppContext();
    const { loans, handleRegisterPayment } = useDataContext();
    
    // Form State
    const [selectedLoanId, setSelectedLoanId] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    
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

    // Cálculos "Inteligentes" basados en tiempo transcurrido (Puntos 4 y 5)
    const calculations = useMemo(() => {
        const amount = parseFloat(paymentAmount);
        let currentBalance = 0;
        let interestDue = 0;
        let daysElapsed = 0;

        if (selectedLoan) {
            currentBalance = selectedLoan.remainingCapital;
            const referenceDate = selectedLoan.lastPaymentDate || selectedLoan.startDate;
            
            const accrued = calculateAccruedInterest(
                currentBalance, 
                referenceDate, 
                paymentDate, 
                selectedLoan.interestRate
            );
            interestDue = accrued.interest;
            daysElapsed = accrued.daysElapsed;

        } else if (selectedLoanId === 'manual') {
            currentBalance = parseFloat(manualPreviousBalance) || 0;
            // En manual asumimos 30 días estándar y 8% mensual
            interestDue = currentBalance * 0.08;
            daysElapsed = 30;
        }

        if (isNaN(amount) || amount <= 0) {
            return { 
                previousBalance: currentBalance,
                interestPart: 0, 
                capitalPart: 0, 
                newBalance: currentBalance,
                interestDue,
                daysElapsed
            };
        }

        const interestPart = Math.min(amount, interestDue); 
        const capitalPart = Math.max(0, amount - interestDue); 
        const newBalance = Math.max(0, currentBalance - capitalPart);

        return {
            previousBalance: currentBalance,
            interestPart,
            capitalPart,
            newBalance,
            interestDue,
            daysElapsed
        };
    }, [selectedLoan, selectedLoanId, paymentAmount, manualPreviousBalance, paymentDate]);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid) return;
        setIsProcessing(true);

        try {
            const signatureImage = signaturePadRef.current?.toDataURL();
            const clientName = selectedLoan ? selectedLoan.clientName : manualClientName;
            const loanIdRef = selectedLoan ? selectedLoan.id : 'MANUAL';

            // Determinar tipo de pago basado en el cálculo
            let paymentDescription = 'Abono General';
            if (calculations.capitalPart > 0 && calculations.interestPart > 0) paymentDescription = 'Interés + Abono a Capital';
            else if (calculations.capitalPart > 0 && calculations.interestPart === 0) paymentDescription = 'Abono Directo a Capital';
            else paymentDescription = 'Pago de Intereses';

            // En modo manual, añadimos una nota automática
            const finalNotes = selectedLoanId === 'manual' 
                ? `${notes ? notes + '. ' : ''}Cálculo manual (8%): Interés ${formatCurrency(calculations.interestPart)}, Capital ${formatCurrency(calculations.capitalPart)}.`
                : notes;

            if (selectedLoan) {
                await handleRegisterPayment(
                    selectedLoan.id, 
                    parseFloat(paymentAmount), 
                    paymentDate, 
                    notes || "Pago generado desde Recibos"
                );
            }

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

            showToast('Recibo generado y pago registrado correctamente.', 'success');
            resetForm();
        } catch (error) {
            console.error(error);
            showToast('Hubo un error al procesar el recibo.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center">
                <ReceiptText className="h-8 w-8 mr-3 text-primary-400" />
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">Generador de Recibos</h1>
                    <p className="text-slate-400 text-sm">Calcula intereses por días transcurridos y registra el pago automáticamente.</p>
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
                        <option value="manual">-- INGRESO MANUAL (Calculadora Estándar) --</option>
                    </select>
                 </div>

                 {/* Campos Manuales (Solo si selecciona manual) */}
                 {selectedLoanId === 'manual' && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in bg-slate-700/30 p-4 rounded-xl border border-slate-600">
                        <div className="md:col-span-2 flex items-center gap-2 text-yellow-400 text-xs mb-2">
                            <Info size={14} />
                            <span>Modo Manual: Solo genera el PDF, NO actualiza la base de datos. Asume 30 días de interés al 8%.</span>
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
                            <div className="text-xs text-slate-400 mt-2 p-2 bg-slate-700 rounded border border-slate-600">
                                <p>Interés calculado por <span className="text-white font-bold">{calculations.daysElapsed} días</span>.</p>
                                <p>Monto a cubrir de interés: <span className="text-amber-400 font-bold">{formatCurrency(calculations.interestDue)}</span></p>
                            </div>
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
                                <p className="text-slate-400 text-xs uppercase">Interés</p>
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
                        disabled={!isFormValid || isProcessing}
                        className="inline-flex items-center justify-center px-6 py-4 bg-green-600 text-white font-bold rounded-lg shadow-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-transform hover:scale-105 disabled:bg-slate-600 disabled:cursor-not-allowed w-full sm:w-auto"
                    >
                        {isProcessing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Download className="mr-2 h-5 w-5" />}
                        {isProcessing ? 'Procesando...' : 'Registrar Pago y Generar PDF'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ReceiptGenerator;
