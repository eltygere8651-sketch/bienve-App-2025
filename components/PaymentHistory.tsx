
import React, { useState } from 'react';
import { Loan, PaymentRecord } from '../types';
import { formatCurrency } from '../services/utils';
import { Calendar, Info, ArrowUp, Edit, Save, X, Loader2 } from 'lucide-react';
import { useDataContext } from '../contexts/DataContext';

interface PaymentHistoryProps {
    loan: Loan;
}

const PaymentHistory: React.FC<PaymentHistoryProps> = ({ loan }) => {
    const { handleUpdatePayment } = useDataContext();
    const history = loan.paymentHistory || [];
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Edit Form State
    const [editForm, setEditForm] = useState({
        date: '',
        amount: 0,
        interestPaid: 0,
        notes: ''
    });

    // Sort by date ASCENDING
    const sortedHistory = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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

    if (sortedHistory.length === 0) {
        return (
            <div className="text-center py-8 text-slate-500 bg-slate-800/30 rounded-xl border border-slate-700/50">
                <Info className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p>No hay pagos registrados aún.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-xl border border-slate-700 shadow-lg relative">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-800 text-slate-400 uppercase font-medium text-xs">
                    <tr>
                        <th className="px-4 py-3">#</th>
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
                        return (
                            <tr key={record.id} className={`transition-colors ${isEditing ? 'bg-slate-800' : 'hover:bg-slate-800/50'}`}>
                                <td className="px-4 py-3 text-slate-500 font-mono text-xs w-10">
                                    {index + 1}
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
                                        <td className="px-4 py-3 text-right">
                                            <button 
                                                onClick={() => startEditing(record)} 
                                                className="p-1.5 hover:bg-slate-700 rounded text-slate-500 hover:text-primary-400 transition-colors"
                                                title="Corregir Pago"
                                            >
                                                <Edit size={14} />
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
    );
};

export default PaymentHistory;
