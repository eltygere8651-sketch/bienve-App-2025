
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { ReceiptText, Download, Calculator, AlertCircle, Info, Loader2, ArrowRight, Banknote, CreditCard, Eye, EyeOff } from 'lucide-react';
import { generatePaymentReceipt } from '../services/pdfService';
import SignaturePad, { SignaturePadRef } from './SignaturePad';
import { useAppContext } from '../contexts/AppContext';
import { useDataContext } from '../contexts/DataContext';
import { Loan, LoanStatus } from '../types';
import { formatCurrency } from '../services/utils';
import { calculateMonthlyInterest } from '../config';

const ReceiptGenerator: React.FC = () => {
    const { showToast } = useAppContext();
    const { loans, handleRegisterPayment } = useDataContext();
    
    // Form State
    const [selectedLoanId, setSelectedLoanId] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Banco'>('Efectivo');
    const [showBreakdown, setShowBreakdown] = useState(true); // Control de visibilidad del desglose
    
    // Manual overrides
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

    // CÁLCULO DE INTERÉS MENSUAL FIJO
    const calculations = useMemo(() => {
        const amount = parseFloat(paymentAmount);
        let currentBalance = 0;
        let interestDue = 0;

        if (selectedLoan) {
            currentBalance = selectedLoan.remainingCapital;
            const accrued = calculateMonthlyInterest(currentBalance, selectedLoan.interestRate);
            interestDue = accrued.interest;
        } else if (selectedLoanId === 'manual') {
            currentBalance = parseFloat(manualPreviousBalance) || 0;
            interestDue = currentBalance * 0.08;
        }

        if (isNaN(amount) || amount <= 0) {
            return { 
                previousBalance: currentBalance,
                interestPart: 0, 
                capitalPart: 0, 
                newBalance: currentBalance,
                interestDue
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
        setPaymentMethod('Efectivo');
        setShowBreakdown(true);
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

            // Determinar tipo de pago
            let paymentDescription = 'Abono General';
            if (calculations.capitalPart > 0 && calculations.interestPart > 0) paymentDescription = 'Interés + Abono a Capital';
            else if (calculations.capitalPart > 0 && calculations.interestPart === 0) paymentDescription = 'Abono Directo a Capital';
            else paymentDescription = 'Pago Parcial de Intereses';

            const finalNotes = selectedLoanId === 'manual' 
                ? `${notes ? notes + '. ' : ''}Cálculo manual (8%): Interés ${formatCurrency(calculations.interestPart)}, Capital ${formatCurrency(calculations.capitalPart)}.`
                : notes;

            if (selectedLoan) {
                await handleRegisterPayment(
                    selectedLoan.id, 
                    parseFloat(paymentAmount), 
                    paymentDate, 
                    notes || "Pago generado desde Recibos",
                    paymentMethod // Pass the selected method
                );
            }

            // Aquí se aplica la lógica del switch:
            // Si showBreakdown es FALSE, enviamos undefined para que pdfService NO pinte las filas de interés/capital.
            generatePaymentReceipt({
                clientName: clientName,
                loanId: loanIdRef,
                paymentAmount: parseFloat(paymentAmount),
                paymentType: `${paymentDescription} (${paymentMethod})`, 
                paymentDate: paymentDate,
                notes: finalNotes,
                previousBalance: calculations.previousBalance,
                newBalance: calculations.newBalance,
                interestPaid: showBreakdown ? calculations.interestPart : undefined,
                capitalPaid: showBreakdown ? calculations.capitalPart : undefined
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
                    <p className="text-slate-400 text-sm">Calcula el interés mensual fijo (8%) y registra el pago.</p>
                </div>
            </div>
            
            <form onSubmit={handleSubmit} className="bg-slate-800 p-4 sm:p-8 rounded-xl shadow-lg space-y-6 border border-slate-700">
                 
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
                        <option value="manual">-- INGRESO MANUAL --</option>
                    </select>
                 </div>

                 {selectedLoanId === 'manual' && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in bg-slate-700/30 p-4 rounded-xl border border-slate-600">
                        <div className="md:col-span-2 flex items-center gap-2 text-yellow-400 text-xs mb-2">
                            <Info size={14} />
                            <span>Modo Manual: Solo genera el PDF. Asume interés mensual del 8%.</span>
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Método de Pago</label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setPaymentMethod('Efectivo')}
                                className={`flex-1 py-2 rounded-md text-xs font-bold flex flex-col items-center gap-1 border ${paymentMethod === 'Efectivo' ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/50' : 'bg-slate-700 text-slate-400 border-slate-600 hover:bg-slate-600'}`}
                            >
                                <Banknote size={16} /> Efectivo
                            </button>
                            <button
                                type="button"
                                onClick={() => setPaymentMethod('Banco')}
                                className={`flex-1 py-2 rounded-md text-xs font-bold flex flex-col items-center gap-1 border ${paymentMethod === 'Banco' ? 'bg-blue-600/20 text-blue-400 border-blue-500/50' : 'bg-slate-700 text-slate-400 border-slate-600 hover:bg-slate-600'}`}
                            >
                                <CreditCard size={16} /> Banco
                            </button>
                        </div>
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

                {(selectedLoan || (selectedLoanId === 'manual' && manualPreviousBalance)) && paymentAmount && (
                    <div className={`p-4 rounded-xl border space-y-3 animate-fade-in ${calculations.capitalPart > 0 ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2">
                                <Calculator size={18} className="text-primary-400" />
                                <h3 className="font-bold text-slate-200">Distribución del Pago (8% Mensual)</h3>
                            </div>
                            
                            {/* Switch Mostrar/Ocultar Desglose */}
                            <button
                                type="button"
                                onClick={() => setShowBreakdown(!showBreakdown)}
                                className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
                                    showBreakdown 
                                        ? 'bg-primary-600/20 text-primary-300 border-primary-500/50 hover:bg-primary-600/30' 
                                        : 'bg-slate-700 text-slate-400 border-slate-600 hover:bg-slate-600'
                                }`}
                                title={showBreakdown ? 'Se mostrará el desglose detallado en el recibo PDF' : 'Solo se mostrará el total en el recibo PDF'}
                            >
                                {showBreakdown ? <Eye size={14} /> : <EyeOff size={14} />}
                                {showBreakdown ? 'Desglose Visible en Recibo' : 'Desglose Oculto en Recibo'}
                            </button>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between text-sm">
                             <div className="text-center w-full">
                                 <p className="text-slate-400 text-xs uppercase mb-1">Interés Mensual</p>
                                 <p className="text-amber-400 font-bold text-xl">{formatCurrency(calculations.interestDue)}</p>
                                 <div className="text-xs text-slate-500 mt-1">Devengado</div>
                             </div>
                             
                             <ArrowRight className="hidden sm:block text-slate-600" />

                             <div className={`text-center w-full p-2 rounded-lg transition-all ${showBreakdown ? 'bg-slate-800/50' : 'bg-slate-800/20 opacity-60'}`}>
                                 {calculations.capitalPart > 0 ? (
                                     <>
                                         <p className="text-green-400 font-bold text-sm flex items-center justify-center gap-1">
                                             <ArrowRight className="rotate-90 sm:rotate-0" size={12}/> Amortiza Capital
                                         </p>
                                         <p className="text-white font-bold text-lg">{formatCurrency(calculations.capitalPart)}</p>
                                     </>
                                 ) : (
                                     <>
                                         <p className="text-red-400 font-bold text-sm flex items-center justify-center gap-1">
                                             <AlertCircle size={12}/> Solo Interés
                                         </p>
                                         <p className="text-slate-400 text-xs">No cubre cuota total.</p>
                                     </>
                                 )}
                             </div>

                             <ArrowRight className="hidden sm:block text-slate-600" />

                             <div className="text-center w-full">
                                 <p className="text-slate-400 text-xs uppercase mb-1">Nuevo Saldo</p>
                                 <p className={`font-bold text-xl ${calculations.newBalance < calculations.previousBalance ? 'text-green-400' : 'text-slate-200'}`}>
                                     {formatCurrency(calculations.newBalance)}
                                 </p>
                             </div>
                        </div>
                        
                        {!showBreakdown && (
                            <div className="text-xs text-center text-slate-500 italic bg-slate-900/30 p-2 rounded border border-slate-700/50 flex items-center justify-center gap-2">
                                <EyeOff size={12} />
                                <span>El PDF generado ocultará el desglose de cuánto va a capital vs interés.</span>
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
