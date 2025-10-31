import React from 'react';
import { Loan, Client, LoanStatus } from '../types';
import { X, Banknote, Calendar, BarChart, Percent, User, ThumbsUp, Clock, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../services/utils';
import PaymentHistory from './PaymentHistory';

interface LoanDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    loan: Loan | null;
    client: Client | null;
}

const DetailItem: React.FC<{ icon: React.ReactNode, label: string, value: string | number }> = ({ icon, label, value }) => (
    <div className="flex items-center space-x-3 bg-gray-50 p-3 rounded-lg">
        <div className="text-blue-600">{icon}</div>
        <div>
            <p className="text-xs text-gray-500 font-medium">{label}</p>
            <p className="text-sm font-semibold text-gray-800">{value}</p>
        </div>
    </div>
);

const LoanDetailsModal: React.FC<LoanDetailsModalProps> = ({ isOpen, onClose, loan, client }) => {
    if (!isOpen || !loan || !client) {
        return null;
    }

    const ProgressBar: React.FC = () => {
        const progress = (loan.paymentsMade / loan.term) * 100;
        return (
            <div>
                <div className="flex justify-between items-center mb-1">
                    <p className="text-sm font-semibold text-gray-700">Progreso del Pago</p>
                    <p className="text-sm font-bold text-gray-800">{loan.paymentsMade} / {loan.term} cuotas</p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
            </div>
        );
    };
    
    const StatusBadge: React.FC<{ status: LoanStatus }> = ({ status }) => {
        const baseClasses = "px-3 py-1 text-sm font-semibold rounded-full inline-flex items-center";
        let icon, textClasses;
        switch (status) {
            case LoanStatus.PAID:
                icon = <ThumbsUp size={14} className="mr-2"/>;
                textClasses = 'bg-green-100 text-green-700';
                break;
            case LoanStatus.PENDING:
                icon = <Clock size={14} className="mr-2"/>;
                 textClasses = 'bg-blue-100 text-blue-700';
                 break;
            case LoanStatus.OVERDUE:
                icon = <AlertTriangle size={14} className="mr-2"/>;
                 textClasses = 'bg-red-100 text-red-700';
                 break;
        }
        return <span className={`${baseClasses} ${textClasses}`}>{icon} {status}</span>;
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-0 sm:p-4" 
            onClick={onClose}
        >
            <div
                className="bg-white rounded-none sm:rounded-2xl shadow-xl w-full h-full sm:h-auto sm:max-w-2xl transform transition-all animate-fade-in flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 sm:p-6 flex justify-between items-center border-b border-gray-200 flex-shrink-0">
                    <h2 className="text-xl font-bold text-gray-900">Detalles del Préstamo</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
                        <X className="h-6 w-6 text-gray-500" />
                    </button>
                </div>

                <div className="p-4 sm:p-6 space-y-6 overflow-y-auto">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="grid grid-cols-1">
                             <DetailItem icon={<User size={18}/>} label="Cliente" value={client.name} />
                        </div>
                        <StatusBadge status={loan.status} />
                    </div>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        <DetailItem icon={<Banknote size={18}/>} label="Monto Principal" value={formatCurrency(loan.amount)} />
                        <DetailItem icon={<Percent size={18}/>} label="Interés Anual" value={`${loan.interestRate}%`} />
                        <DetailItem icon={<Calendar size={18}/>} label="Plazo" value={`${loan.term} meses`} />
                        <DetailItem icon={<Banknote size={18}/>} label="Cuota Mensual" value={formatCurrency(loan.monthlyPayment)} />
                        <DetailItem icon={<BarChart size={18}/>} label="Total a Pagar" value={formatCurrency(loan.totalRepayment)} />
                        <DetailItem icon={<Calendar size={18}/>} label="Fecha Inicio" value={new Date(loan.startDate).toLocaleDateString('es-ES')} />
                    </div>

                    <ProgressBar />

                    <PaymentHistory loan={loan} />
                </div>
            </div>
        </div>
    );
};

if (!document.getElementById('modal-animations')) {
    const style = document.createElement('style');
    style.id = 'modal-animations';
    style.innerHTML = `
        @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
            animation: fadeIn 0.2s ease-out forwards;
        }
    `;
    document.head.appendChild(style);
}

export default LoanDetailsModal;
