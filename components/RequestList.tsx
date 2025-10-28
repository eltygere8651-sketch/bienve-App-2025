import React, { useState } from 'react';
import { LoanRequest, RequestStatus } from '../types';
import { ChevronDown, ChevronUp, User, Hash, MapPin, Phone, Mail, FileText, Briefcase, Calendar, Check, X, Banknote, Edit2, Info, Download, Printer } from 'lucide-react';
import { useDataContext } from '../contexts/DataContext';
import { useAppContext } from '../contexts/AppContext';
import { downloadPdf, generateIdPdf } from '../services/pdfService';
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
    if (status === RequestStatus.UNDER_REVIEW) {
        return <span className={`${baseClasses} bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300`}><Info size={12} className="mr-1"/> {status}</span>;
    }
    return null;
};

const RequestCard: React.FC<{ request: LoanRequest }> = ({ request }) => {
    const { handleApproveRequest, handleDenyRequest, handleUpdateRequestStatus } = useDataContext();
    const { showToast, showConfirmModal } = useAppContext();
    
    const [isExpanded, setIsExpanded] = useState(false);
    const [amount, setAmount] = useState(request.loanAmount || 500);
    const [term, setTerm] = useState(12);

    const handleApproveClick = () => {
        if (amount > 0 && term > 0) {
            showConfirmModal({
                title: 'Confirmar Aprobación',
                message: `¿Estás seguro de que quieres aprobar un préstamo de ${formatCurrency(amount)} a ${term} meses para ${request.fullName}?`,
                onConfirm: () => handleApproveRequest(request.id, amount, term),
            });
        } else {
            showToast('Por favor, introduce un monto y un plazo válidos.', 'error');
        }
    };
    
    const handleDenyClick = () => {
        showConfirmModal({
            title: 'Confirmar Denegación',
            message: `¿Estás seguro de que quieres denegar y eliminar la solicitud de ${request.fullName}? Esta acción no se puede deshacer.`,
            onConfirm: () => handleDenyRequest(request.id),
        });
    };

    const handleReviewClick = () => {
        handleUpdateRequestStatus(request.id, RequestStatus.UNDER_REVIEW);
    };

    const handleDownloadContract = () => {
        if (request.contractPdf) {
            downloadPdf(request.contractPdf, `Contrato-${request.fullName.replace(/\s/g, '_')}.pdf`);
        } else {
            showToast('No se encontró el contrato en PDF.', 'error');
        }
    };

    const handlePrintId = async () => {
        if (!(request.frontId instanceof Blob) || !(request.backId instanceof Blob)) {
            showToast('No se encontraron las imágenes del DNI.', 'error');
            return;
        }
        try {
            await generateIdPdf(request.frontId, request.backId, request.fullName);
        } catch (error) {
            console.error("Error generating ID PDF:", error);
            showToast('No se pudo generar el PDF del DNI.', 'error');
        }
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        <div>
                            <p className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Anverso DNI</p>
                            <ImageViewer imageBlob={request.frontId} alt="Front ID" isTestData={request.isTestData} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Reverso DNI</p>
                            <ImageViewer imageBlob={request.backId} alt="Back ID" isTestData={request.isTestData} />
                        </div>
                        <div className="md:col-span-2 lg:col-span-1">
                            <p className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Firma</p>
                            {request.signature ? (
                                 <div className="bg-gray-100 dark:bg-gray-700/50 p-2 rounded-lg border border-gray-200 dark:border-gray-600">
                                    <img src={request.signature} alt="Signature" className="w-full h-auto" />
                                 </div>
                            ) : (
                                <p className="text-xs text-gray-500">No se proporcionó firma.</p>
                            )}
                             <div className="flex flex-col gap-2 mt-4">
                                {request.contractPdf && (
                                    <button onClick={handleDownloadContract} className="w-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold py-2 px-4 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 flex items-center justify-center text-sm">
                                        <Download size={16} className="mr-2" /> Descargar Contrato
                                    </button>
                                )}
                                 <button onClick={handlePrintId} className="w-full bg-gray-100 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 font-bold py-2 px-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 flex items-center justify-center text-sm">
                                    <Printer size={16} className="mr-2" /> Imprimir/Descargar DNI
                                </button>
                             </div>
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
                            <button onClick={handleReviewClick} className="w-full sm:w-auto bg-yellow-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-yellow-600 flex items-center justify-center">
                                <Edit2 size={18} className="mr-2" /> En Estudio
                            </button>
                            <button onClick={handleDenyClick} className="w-full sm:w-auto bg-red-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-600 flex items-center justify-center">
                                <X size={18} className="mr-2" /> Denegar
                            </button>
                            <button onClick={handleApproveClick} className="w-full sm:w-auto bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600 flex items-center justify-center">
                                <Check size={18} className="mr-2" /> Aprobar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const RequestList: React.FC = () => {
    const { requests } = useDataContext();

    if (requests.length === 0) {
        return (
            <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-6">Gestión de Solicitudes</h1>
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                     <FileText size={48} className="mx-auto text-gray-400" />
                     <h2 className="mt-4 text-xl font-semibold text-gray-700 dark:text-gray-200">No hay solicitudes pendientes</h2>
                     <p className="mt-1 text-gray-500 dark:text-gray-400">Cuando un nuevo cliente complete el formulario, su solicitud aparecerá aquí.</p>
                </div>
            </div>
        )
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-6">Gestión de Solicitudes ({requests.length})</h1>
            <div className="space-y-4">
                {requests.map(request => (
                    <RequestCard key={request.id} request={request} />
                ))}
            </div>
        </div>
    );
};

export default RequestList;