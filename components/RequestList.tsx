import React, { useState, useEffect } from 'react';
import { LoanRequest, RequestStatus } from '../types';
import { ChevronDown, ChevronUp, User, Hash, MapPin, Phone, Mail, FileText, Briefcase, Calendar, Check, X, Banknote, Edit2, Info, Download, Printer } from 'lucide-react';
import { useDataContext } from '../contexts/DataContext';
import { useAppContext } from '../contexts/AppContext';
import { downloadPdf } from '../services/pdfService';


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

const ImageViewer: React.FC<{ imageBlob: File | Blob, alt: string }> = ({ imageBlob, alt }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    useEffect(() => {
        if (imageBlob instanceof Blob && imageBlob.size > 0) {
            const url = URL.createObjectURL(imageBlob);
            setImageUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [imageBlob]);

    if (!imageUrl) return <div className="rounded-lg w-full h-32 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-500">Sin Imagen</div>;

    return <img src={imageUrl} alt={alt} className="rounded-lg w-full h-auto object-cover" />;
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
                message: `¿Estás seguro de que quieres aprobar un préstamo de ${amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} a ${term} meses para ${request.fullName}?`,
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

    const handlePrintId = () => {
        const frontUrl = request.frontId instanceof Blob ? URL.createObjectURL(request.frontId) : '';
        const backUrl = request.backId instanceof Blob ? URL.createObjectURL(request.backId) : '';
    
        if (!frontUrl || !backUrl) {
            showToast('No se encontraron las imágenes del DNI.', 'error');
            return;
        }
    
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Documento de Identidad - ${request.fullName}</title>
                        <style>
                            body { font-family: sans-serif; margin: 20px; }
                            h1 { font-size: 1.2em; border-bottom: 1px solid #ccc; padding-bottom: 10px; margin-bottom: 20px; }
                            .id-container { display: flex; flex-direction: column; gap: 20px; }
                            .id-image { max-width: 100%; border: 1px solid #eee; padding: 5px; border-radius: 5px; }
                            h2 { font-size: 1em; margin-bottom: 5px; }
                            @media print {
                                body { margin: 0; }
                                .id-image { page-break-inside: avoid; max-width: 80%; }
                            }
                        </style>
                    </head>
                    <body>
                        <h1>Documento de Identidad: ${request.fullName}</h1>
                        <div class="id-container">
                            <div>
                                <h2>Anverso</h2>
                                <img src="${frontUrl}" class="id-image" alt="Anverso DNI" />
                            </div>
                            <div>
                                <h2>Reverso</h2>
                                <img src="${backUrl}" class="id-image" alt="Reverso DNI" />
                            </div>
                        </div>
                        <script>
                            window.onload = function() {
                                setTimeout(function() {
                                    window.print();
                                    window.close();
                                }, 100);
                            };
                        </script>
                    </body>
                </html>
            `);
            printWindow.document.close();
            // URLs will be revoked when the ImageViewer component unmounts, or by the browser when the tab closes.
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
                        {request.loanAmount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                    </span>
                    {isExpanded ? <ChevronUp className="text-gray-500" /> : <ChevronDown className="text-gray-500" />}
                </div>
            </div>
            {isExpanded && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-4 mb-4">
                        <InfoRow icon={<Banknote size={16} />} label="Monto Solicitado" value={request.loanAmount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })} />
                        <InfoRow icon={<FileText size={16} />} label="Motivo" value={request.loanReason} />
                        <InfoRow icon={<Hash size={16} />} label="DNI/NIE" value={request.idNumber} />
                        <InfoRow icon={<Briefcase size={16} />} label="Situación Laboral" value={request.employmentStatus} />
                        <InfoRow icon={<Phone size={16} />} label="Teléfono" value={request.phone} />
                         {request.contractType && <InfoRow icon={<Calendar size={16} />} label="Contrato" value={request.contractType} />}
                        <InfoRow icon={<Mail size={16} />} label="Email" value={request.email} />
                        {request.referredBy && <InfoRow icon={<User size={16} />} label="Referido por" value={request.referredBy} />}
                        <div className="md:col-span-2">
                             <InfoRow icon={<MapPin size={16} />} label="Dirección" value={request.address} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        <div>
                            <p className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Anverso DNI</p>
                            <ImageViewer imageBlob={request.frontId} alt="Front ID" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Reverso DNI</p>
                            <ImageViewer imageBlob={request.backId} alt="Back ID" />
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