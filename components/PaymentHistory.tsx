
import React, { useState, useMemo } from 'react';
import { Loan, PaymentRecord } from '../types';
import { formatCurrency } from '../services/utils';
import { Calendar, Info, ArrowUp, Edit, Save, X, Loader2, FileText, CheckCircle2, TrendingDown, Clock, Trash2 } from 'lucide-react';
import { useDataContext } from '../contexts/DataContext';
import { generatePaymentReceipt } from '../services/pdfService';

interface PaymentHistoryProps {
    loan: Loan;
}

const PaymentHistory: React.FC<PaymentHistoryProps> = ({ loan }) => {
    const { handleUpdatePayment, handleDeletePayment } = useDataContext();
    const history = loan.paymentHistory || [];
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showInterestCovered, setShowInterestCovered] = useState(false);

    // Edit Form State
    const [editForm, setEditForm] = useState({
        date: '',
        amount: 0,
        interestPaid: 0,
        notes: ''
    });

    // Sort by date ASCENDING
    const sortedHistory = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate Summary Stats
    const stats = useMemo(() => {
        const totalPaid = sortedHistory.reduce((sum, p) => sum + p.amount, 0);
        const totalInterest = sortedHistory.reduce((sum, p) => sum + p.interestPaid, 0);
        const totalCapital = sortedHistory.reduce((sum, p) => sum + p.capitalPaid, 0);
        const monthsPaid = new Set(sortedHistory.map(p => {
            const d = new Date(p.date);
            return `${d.getFullYear()}-${d.getMonth()}`;
        })).size;

        return { totalPaid, totalInterest, totalCapital, monthsPaid };
    }, [sortedHistory]);

    const getMonthNumber = (paymentDate: string) => {
        const start = new Date(loan.startDate);
        const payment = new Date(paymentDate);
        const months = (payment.getFullYear() - start.getFullYear()) * 12 + (payment.getMonth() - start.getMonth());
        return months + 1; // Month 1 is the first month
    };

    const startEditing = (record: PaymentRecord) => {
        setEditForm({
            date: record.date,
            amount: record.amount,
            interestPaid: record.interestPaid,
            notes: record.notes || ''
        });
        setEditingId(record.id);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setIsSaving(false);
    };

    const saveEditing = async () => {
        if (!editingId) return;
        setIsSaving(true);
        try {
            await handleUpdatePayment(
                loan.id, 
                editingId, 
                editForm.interestPaid, 
                editForm.amount, 
                editForm.date, 
                editForm.notes
            );
            setEditingId(null);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    const confirmDelete = async (paymentId: string) => {
        if (window.confirm('¿Está seguro de eliminar este pago? Esto recalculará el saldo del préstamo y registrará la salida correspondiente en el tesoro.')) {
            try {
                await handleDeletePayment(loan.id, paymentId);
            } catch (e) {
                console.error(e);
            }
        }
    };

    const handleExportReceipt = (record: PaymentRecord) => {
        const previousBalance = record.remainingCapitalAfter + record.capitalPaid;
        
        generatePaymentReceipt({
            clientName: loan.clientName,
            loanId: loan.id,
            paymentAmount: record.amount,
            paymentType: 'Pago de Cuota',
            paymentDate: record.date,
            notes: record.notes || '',
            previousBalance: previousBalance,
            newBalance: record.remainingCapitalAfter,
            interestPaid: record.interestPaid,
            capitalPaid: record.capitalPaid,
            showInterestCovered: showInterestCovered
        });
    };

    if (sortedHistory.length === 0) {
        return (
            <div className="text-center py-8 text-slate-500 bg-slate-800/30 rounded-xl border border-slate-700/50">
                <Info className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p>No hay pagos registrados aún.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Options Toggle */}
            <div className="flex justify-end">
                <button 
                    onClick={() => setShowInterestCovered(!showInterestCovered)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                        showInterestCovered 
                        ? 'bg-amber-500/10 border-amber-500/50 text-amber-400' 
                        : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                >
                    <div className={`w-8 h-4 rounded-full relative transition-colors ${showInterestCovered ? 'bg-amber-500' : 'bg-slate-600'}`}>
                        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${showInterestCovered ? 'left-4.5' : 'left-0.5'}`} />
                    </div>
                    <span className="text-xs font-medium">Interés Cubierto en Recibo</span>
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                        <Clock size={14} />
                        <span className="text-xs uppercase font-bold">Meses Pagados</span>
                    </div>
                    <p className="text-xl font-bold text-white">{stats.monthsPaid} <span className="text-sm font-normal text-slate-500">meses</span></p>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                        <CheckCircle2 size={14} className="text-emerald-400" />
                        <span className="text-xs uppercase font-bold">Total Abonado</span>
                    </div>
                    <p className="text-xl font-bold text-emerald-400">{formatCurrency(stats.totalPaid)}</p>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                        <TrendingDown size={14} className="text-blue-400" />
                        <span className="text-xs uppercase font-bold">Capital Reducido</span>
                    </div>
                    <p className="text-xl font-bold text-blue-400">{formatCurrency(stats.totalCapital)}</p>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                        <ArrowUp size={14} className="text-amber-400" />
                        <span className="text-xs uppercase font-bold">Intereses Pagados</span>
                    </div>
                    <p className="text-xl font-bold text-amber-400">{formatCurrency(stats.totalInterest)}</p>
                </div>
            </div>

            {/* History Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-700 shadow-lg relative">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-800 text-slate-400 uppercase font-medium text-xs">
                        <tr>
                            <th className="px-4 py-3">Período</th>
                            <th className="px-4 py-3">Fecha</th>
                            <th className="px-4 py-3">Total Pagado</th>
                            <th className="px-4 py-3 text-green-400">Interés</th>
                            <th className="px-4 py-3 text-blue-400">Capital</th>
                            <th className="px-4 py-3 text-amber-400">Saldo</th>
                            <th className="px-4 py-3 text-right">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700 bg-slate-900/40">
                        {sortedHistory.map((record: PaymentRecord, index) => {
                            const isEditing = editingId === record.id;
                            const monthNum = index + 1;
                            
                            return (
                                <tr key={record.id} className={`transition-colors ${isEditing ? 'bg-slate-800' : 'hover:bg-slate-800/50'}`}>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center justify-center px-2 py-1 rounded text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                            Mes {monthNum}
                                        </span>
                                    </td>
                                    
                                    {isEditing ? (
                                        <>
                                            <td className="px-4 py-3">
                                                <input 
                                                    type="date" 
                                                    value={editForm.date}
                                                    onChange={e => setEditForm({...editForm, date: e.target.value})}
                                                    className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white w-full"
                                                />
                                                <input 
                                                    type="text" 
                                                    value={editForm.notes}
                                                    onChange={e => setEditForm({...editForm, notes: e.target.value})}
                                                    placeholder="Notas"
                                                    className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white w-full mt-1"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input 
                                                    type="number" 
                                                    value={editForm.amount}
                                                    onChange={e => setEditForm({...editForm, amount: parseFloat(e.target.value)})}
                                                    className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white w-20 font-bold"
                                                    step="0.01"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input 
                                                    type="number" 
                                                    value={editForm.interestPaid}
                                                    onChange={e => setEditForm({...editForm, interestPaid: parseFloat(e.target.value)})}
                                                    className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-green-400 w-20"
                                                    step="0.01"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-blue-400 font-mono">
                                                {formatCurrency(editForm.amount - editForm.interestPaid)}
                                            </td>
                                            <td className="px-4 py-3 text-slate-500 text-xs italic">
                                                (Se recalculará)
                                            </td>
                                            <td className="px-4 py-3 text-right flex justify-end gap-2">
                                                <button onClick={saveEditing} disabled={isSaving} className="p-1.5 bg-green-600 hover:bg-green-500 rounded text-white transition-colors">
                                                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                                </button>
                                                <button onClick={cancelEditing} disabled={isSaving} className="p-1.5 bg-slate-600 hover:bg-slate-500 rounded text-white transition-colors">
                                                    <X size={14} />
                                                </button>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-4 py-3 text-slate-300 font-mono">
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={14} className="text-slate-500" />
                                                    {new Date(record.date).toLocaleDateString('es-ES')}
                                                </div>
                                                {record.notes && <p className="text-[10px] text-slate-500 mt-1 truncate max-w-[120px]">{record.notes}</p>}
                                            </td>
                                            <td className="px-4 py-3 font-bold text-slate-100">{formatCurrency(record.amount)}</td>
                                            <td className="px-4 py-3 text-green-400">{formatCurrency(record.interestPaid)}</td>
                                            <td className="px-4 py-3 text-blue-400">{formatCurrency(record.capitalPaid)}</td>
                                            <td className="px-4 py-3 font-mono text-amber-400">{formatCurrency(record.remainingCapitalAfter)}</td>
                                            <td className="px-4 py-3 text-right flex justify-end gap-2">
                                                <button 
                                                    onClick={() => handleExportReceipt(record)} 
                                                    className="p-1.5 hover:bg-slate-700 rounded text-slate-500 hover:text-blue-400 transition-colors"
                                                    title="Descargar Recibo"
                                                >
                                                    <FileText size={14} />
                                                </button>
                                                <button 
                                                    onClick={() => startEditing(record)} 
                                                    className="p-1.5 hover:bg-slate-700 rounded text-slate-500 hover:text-primary-400 transition-colors"
                                                    title="Corregir Pago"
                                                >
                                                    <Edit size={14} />
                                                </button>
                                                <button 
                                                    onClick={() => confirmDelete(record.id)} 
                                                    className="p-1.5 hover:bg-slate-700 rounded text-slate-500 hover:text-red-400 transition-colors"
                                                    title="Eliminar Pago"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PaymentHistory;
