import React, { useState } from 'react';
import { LoanRequest, RequestStatus } from '../types';
import { ChevronDown, ChevronUp, Hash, MapPin, Phone, Mail, FileText, Briefcase, Calendar, Check, X, Banknote, Edit2, Info, Loader2, Clock } from 'lucide-react';
import { useDataContext } from '../contexts/DataContext';
import { useAppContext } from '../contexts/AppContext';
import ImageViewer from './ImageViewer';
import { formatCurrency } from '../services/utils';

const InfoRow: React.FC<{ icon: React.ReactNode, label: string, value?: string | number }> = ({ icon, label, value }) => (
    value ? (
        <div className="flex items-start text-sm">
            <div className="text-gray-500 dark:text-gray-400 mr-2 mt-0.5">{icon}</div>
            <div>
                <span className="font-semibold text-gray-700 dark:text-gray-300 mr-2">{label}:</span>
                <span className="text-gray-600 dark:text-gray-200">{value}</span>
            </div>
        </div>
    ) : null
);

const StatusBadge: React.FC<{ status: RequestStatus }> = ({ status }) => {
    const baseClasses = "px-2 py-1 text-xs font-semibold rounded-full inline-flex items-center";
    switch (status) {
        case RequestStatus.PENDING:
            return <span className={`${baseClasses} bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300`}><Clock size={12} className="mr-1"/> {status}</span>;
        case RequestStatus.UNDER_REVIEW:
            return <span className={`${baseClasses} bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300`}><Info size={12} className="mr-1"/> {status}</span>;
        default:
            return null;
    }
};

const RequestCard: React.FC<{ request: LoanRequest }> = ({ request }) => {
    const { handleApproveRequest, handleDenyRequest, handleUpdateRequestStatus } = useDataContext();
    const { showToast, showConfirmModal } = useAppContext();
    
    const [isExpanded, setIsExpanded] = useState(false);
    const [amount, setAmount] = useState(request.loanAmount || 500);
    const [term, setTerm] = useState(12);
    const [isProcessing, setIsProcessing] = useState(false);

    const approveAction = async () => {
        setIsProcessing(true);
        try {
            await handleApproveRequest(request, amount, term);
        } finally {
            setIsProcessing(false);
        }
    };
    
    const denyAction = async () => {
        setIsProcessing(true);
        try {
            await handleDenyRequest(request);
        } finally {
            setIsProcessing(false);
        }
    };
    
    const reviewAction = async () => {
        setIsProcessing(true);
        try {
            await handleUpdateRequestStatus(request.id, RequestStatus.UNDER_REVIEW);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleApproveClick = () => {
        if (amount > 0 && term > 0) {
            showConfirmModal({
                title: 'Confirmar Aprobación',
                message: `¿Estás seguro de que quieres aprobar un préstamo de ${formatCurrency(amount)} a ${term} meses para ${request.fullName}?`,
                onConfirm: approveAction,
            });
        } else {
            showToast('Por favor, introduce un monto y un plazo válidos.', 'error');
        }
    };
    
    const handleDenyClick = () => {
        showConfirmModal({
            title: 'Confirmar Denegación',
            message: `¿Estás seguro de que quieres denegar y eliminar la solicitud de ${request.fullName}? Esta acción no se puede deshacer.`,
            onConfirm: denyAction,
        });
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="p-4 flex justify-between items-center cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div>
                    <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">{request.fullName}</h3>
                    <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Solicitud del {new Date(request.requestDate).toLocaleDateString()}</p>
                        <StatusBadge status={request.status} />
                    </div>
                </div>
                <div className="flex items-center">
                     <span className="text-sm font-bold text-blue-600 dark:text-blue-400 mr-4">
                        {formatCurrency(request.loanAmount)}
                    </span>
                    {isExpanded ? <ChevronUp className="text-gray-500" /> : <ChevronDown className="text-gray-500" />}
                </div>
            </div>
            {isExpanded && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-4 mb-4">
                        <InfoRow icon={<Banknote size={16} />} label="Monto Solicitado" value={formatCurrency(request.loanAmount)} />
                        <InfoRow icon={<FileText size={16} />} label="Motivo" value={request.loanReason} />
                        <InfoRow icon={<Hash size={16} />} label="DNI/NIE" value={request.idNumber} />
                        <InfoRow icon={<Briefcase size={16} />} label="Situación Laboral" value={request.employmentStatus} />
                        <InfoRow icon={<Phone size={16} />} label="Teléfono" value={request.phone} />
                         {request.contractType && <InfoRow icon={<Calendar size={16} />} label="Contrato" value={request.contractType} />}
                        <InfoRow icon={<Mail size={16} />} label="Email" value={request.email} />
                        <div className="md:col-span-2">
                             <InfoRow icon={<MapPin size={16} />} label="Dirección" value={request.address} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <p className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Anverso DNI</p>
                            <ImageViewer imageUrl={request.frontIdUrl} alt="Front ID" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Reverso DNI</p>
                            <ImageViewer imageUrl={request.backIdUrl} alt="Back ID" />
                        </div>
                    </div>
                     <div className="space-y-4 mb-6">
                        <div>
                            <p className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Firma del Solicitante</p>
                            {request.signature ? (
                                 <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
                                    <img src={request.signature} alt="Firma del solicitante" className="mx-auto bg-white dark:bg-gray-200 rounded" style={{ maxHeight: '100px' }} />
                                 </div>
                            ) : (
                                <p className="text-xs text-gray-500">No se proporcionó firma.</p>
                            )}
                        </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg space-y-4">
                        <div className="flex flex-col md:flex-row items-center gap-4">
                            <div className="w-full">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Monto a Aprobar (€)</label>
                                <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                            </div>
                            <div className="w-full">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Plazo (meses)</label>
                                <input type="number" value={term} onChange={e => setTerm(Number(e.target.value))} className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                            </div>
                        </div>
                         <div className="flex flex-col sm:flex-row gap-2 justify-end">
                            <button onClick={reviewAction} disabled={isProcessing} className="w-full sm:w-auto bg-yellow-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-yellow-600 flex items-center justify-center disabled:bg-yellow-400">
                                {isProcessing ? <Loader2 size={18} className="mr-2 animate-spin"/> : <Edit2 size={18} className="mr-2" />} 
                                {isProcessing ? 'Procesando...' : 'En Estudio'}
                            </button>
                            <button onClick={handleDenyClick} disabled={isProcessing} className="w-full sm:w-auto bg-red-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-600 flex items-center justify-center disabled:bg-red-400">
                                {isProcessing ? <Loader2 size={18} className="mr-2 animate-spin"/> : <X size={18} className="mr-2" />} 
                                {isProcessing ? 'Procesando...' : 'Denegar'}
                            </button>
                            <button onClick={handleApproveClick} disabled={isProcessing} className="w-full sm:w-auto bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600 flex items-center justify-center disabled:bg-green-400">
                                {isProcessing ? <Loader2 size={18} className="mr-2 animate-spin"/> : <Check size={18} className="mr-2" />} 
                                {isProcessing ? 'Procesando...' : 'Aprobar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RequestCard;