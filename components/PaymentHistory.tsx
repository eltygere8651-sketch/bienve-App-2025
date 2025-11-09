import React from 'react';
import { Loan } from '../types';
import { formatCurrency } from '../services/utils';
import { CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface PaymentHistoryProps {
    loan: Loan;
}

const PaymentHistory: React.FC<PaymentHistoryProps> = ({ loan }) => {
    const payments = [];
    const startDate = new Date(loan.startDate);

    for (let i = 1; i <= loan.term; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(startDate.getMonth() + i);

        let status: 'Pagado' | 'Pendiente' | 'Vencido' = 'Pendiente';
        const isPaid = i <= loan.paymentsMade;
        const isOverdue = !isPaid && new Date() > dueDate;

        if (isPaid) {
            status = 'Pagado';
        } else if (isOverdue) {
            status = 'Vencido';
        }

        payments.push({
            paymentNumber: i,
            dueDate: dueDate.toLocaleDateString('es-ES'),
            amount: loan.monthlyPayment,
            status: status,
        });
    }

    const StatusIcon = ({ status }: { status: string }) => {
        switch (status) {
            case 'Pagado':
                return <CheckCircle className="text-green-500" size={16} />;
            case 'Vencido':
                return <AlertTriangle className="text-red-500" size={16} />;
            default:
                return <Clock className="text-slate-500" size={16} />;
        }
    };

    return (
        <div>
            <h4 className="text-md font-semibold text-slate-700 mb-3">Historial de Pagos</h4>
            <div className="max-h-60 overflow-y-auto pr-2 border-l-2 border-slate-200 pl-4 space-y-3">
                {payments.map(payment => (
                    <div key={payment.paymentNumber} className="flex justify-between items-center text-sm">
                        <div className="flex items-center">
                            <StatusIcon status={payment.status} />
                            <div className="ml-3">
                                <p className="font-medium text-slate-800">
                                    Cuota #{payment.paymentNumber}
                                </p>
                                <p className="text-xs text-slate-500">
                                    Vencimiento: {payment.dueDate}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                             <p className="font-semibold text-slate-800">{formatCurrency(payment.amount)}</p>
                             <p className={`text-xs font-bold ${
                                 payment.status === 'Pagado' ? 'text-green-500' :
                                 payment.status === 'Vencido' ? 'text-red-500' : 'text-slate-500'
                             }`}>
                                {payment.status}
                             </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PaymentHistory;