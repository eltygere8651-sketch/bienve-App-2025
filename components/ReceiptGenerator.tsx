import React, { useState, useRef } from 'react';
import { ReceiptText, Download } from 'lucide-react';
import { generatePaymentReceipt } from '../services/pdfService';
import SignaturePad, { SignaturePadRef } from './SignaturePad';
import { useAppContext } from '../contexts/AppContext';

const ReceiptGenerator: React.FC = () => {
    const { showToast } = useAppContext();
    const [clientName, setClientName] = useState('');
    const [loanId, setLoanId] = useState('');
    const [previousBalance, setPreviousBalance] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentType, setPaymentType] = useState('Capital + Interés');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const signaturePadRef = useRef<SignaturePadRef>(null);

    const isFormValid = clientName.trim() !== '' && parseFloat(paymentAmount) > 0 && previousBalance !== '' && !isNaN(parseFloat(previousBalance));

    const resetForm = () => {
        setClientName('');
        setLoanId('');
        setPreviousBalance('');
        setPaymentAmount('');
        setPaymentType('Capital + Interés');
        setPaymentDate(new Date().toISOString().split('T')[0]);
        setNotes('');
        signaturePadRef.current?.clear();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid) return;

        const amount = parseFloat(paymentAmount);
        const prevBalance = parseFloat(previousBalance);
        const signatureImage = signaturePadRef.current?.toDataURL();
        
        generatePaymentReceipt({
            clientName: clientName.trim(),
            loanId: loanId.trim() || 'N/A',
            paymentAmount: amount,
            paymentType: paymentType,
            paymentDate: paymentDate,
            notes: notes,
            previousBalance: prevBalance,
            newBalance: prevBalance - amount,
        }, signatureImage);

        showToast('Recibo generado y descargado con éxito.', 'success');
        resetForm();
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center">
                <ReceiptText className="h-8 w-8 mr-3 text-primary-400" />
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">Generador de Recibos</h1>
            </div>
            
            <form onSubmit={handleSubmit} className="bg-slate-800 p-4 sm:p-8 rounded-xl shadow-lg space-y-6 border border-slate-700">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="clientName" className="block text-sm font-medium text-slate-300 mb-1">
                            Nombre del Cliente
                        </label>
                        <input
                            id="clientName"
                            type="text"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            required
                            placeholder="Ej: Juan Pérez"
                            className="w-full px-3 py-2 border border-slate-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-slate-700 text-slate-100"
                        />
                    </div>
                     <div>
                        <label htmlFor="loanId" className="block text-sm font-medium text-slate-300 mb-1">
                            ID de Préstamo / Referencia (Opcional)
                        </label>
                        <input
                            id="loanId"
                            type="text"
                            value={loanId}
                            onChange={(e) => setLoanId(e.target.value)}
                            placeholder="Ej: loan-12345"
                            className="w-full px-3 py-2 border border-slate-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-slate-700 text-slate-100"
                        />
                    </div>
                 </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                        <label htmlFor="previousBalance" className="block text-sm font-medium text-slate-300 mb-1">
                            Saldo Anterior (€)
                        </label>
                        <input
                            id="previousBalance"
                            type="number"
                            value={previousBalance}
                            onChange={(e) => setPreviousBalance(e.target.value)}
                            required
                            min="0"
                            step="0.01"
                            placeholder="Ej: 1250.75"
                            className="w-full px-3 py-2 border border-slate-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-slate-700 text-slate-100"
                        />
                    </div>
                    <div>
                        <label htmlFor="paymentAmount" className="block text-sm font-medium text-slate-300 mb-1">
                            Monto del Pago (€)
                        </label>
                        <input
                            id="paymentAmount"
                            type="number"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            required
                            min="0.01"
                            step="0.01"
                            placeholder="Ej: 150.00"
                            className="w-full px-3 py-2 border border-slate-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-slate-700 text-slate-100"
                        />
                    </div>
                    
                </div>
                 <div>
                    <label htmlFor="paymentDate" className="block text-sm font-medium text-slate-300 mb-1">
                        Fecha del Pago
                    </label>
                    <input
                        id="paymentDate"
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-slate-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-slate-700 text-slate-100"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Tipo de Pago
                    </label>
                    <div className="flex flex-wrap gap-4">
                        {['Capital + Interés', 'Solo Capital', 'Solo Interés'].map(type => (
                            <div key={type} className="flex items-center">
                                <input
                                    id={type}
                                    name="paymentType"
                                    type="radio"
                                    value={type}
                                    checked={paymentType === type}
                                    onChange={(e) => setPaymentType(e.target.value)}
                                    className="h-4 w-4 text-primary-600 border-slate-500 bg-slate-700 focus:ring-primary-500"
                                />
                                <label htmlFor={type} className="ml-2 block text-sm text-slate-200">
                                    {type}
                                </label>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-slate-300 mb-1">
                        Notas Adicionales (Opcional)
                    </label>
                    <textarea
                        id="notes"
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-slate-700 text-slate-100"
                        placeholder="Ej: Pago adelantado correspondiente a la cuota de..."
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Firma del Prestamista (Opcional)
                    </label>
                    <p className="text-xs text-slate-400 mb-2">
                        Dibuja tu firma en el recuadro para añadirla al recibo.
                    </p>
                    <SignaturePad ref={signaturePadRef} />
                </div>

                <div className="text-right">
                    <button 
                        type="submit"
                        disabled={!isFormValid}
                        className="inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white font-bold rounded-lg shadow-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-transform hover:scale-105 disabled:bg-primary-400 disabled:cursor-not-allowed"
                    >
                        <Download className="mr-2 h-5 w-5" />
                        Generar y Descargar PDF
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ReceiptGenerator;