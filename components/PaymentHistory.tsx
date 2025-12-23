
import React from 'react';
import { Loan, PaymentRecord } from '../types';
import { formatCurrency } from '../services/utils';
import { Calendar, Info } from 'lucide-react';

interface PaymentHistoryProps {
    loan: Loan;
}

const PaymentHistory: React.FC<PaymentHistoryProps> = ({ loan }) => {
    const history = loan.paymentHistory || [];

    // Sort by date descending
    const sortedHistory = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (sortedHistory.length === 0) {
        return (
            <div className="text-center py-8 text-slate-500 bg-slate-800/30 rounded-xl border border-slate-700/50">
                <Info className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p>No hay pagos registrados aún.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-xl border border-slate-700 shadow-lg">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-800 text-slate-400 uppercase font-medium text-xs">
                    <tr>
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-4 py-3">Total Pagado</th>
                        <th className="px-4 py-3 text-green-400">Interés</th>
                        <th className="px-4 py-3 text-blue-400">Capital</th>
                        <th className="px-4 py-3 text-amber-400">Saldo Restante</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-700 bg-slate-900/40">
                    {sortedHistory.map((record: PaymentRecord) => (
                        <tr key={record.id} className="hover:bg-slate-800/50 transition-colors">
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
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default PaymentHistory;
