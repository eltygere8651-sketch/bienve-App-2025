
import React, { useState, useEffect } from 'react';
import { LoanRequest, RequestStatus } from '../types';
import { ChevronDown, ChevronUp, Hash, MapPin, Phone, Mail, FileText, Briefcase, Calendar, Check, X, Banknote, Edit2, Info, Loader2, Clock, Download, CheckCircle, XCircle, AlertTriangle, Eye } from 'lucide-react';
import { useDataContext } from '../contexts/DataContext';
import { useAppContext } from '../contexts/AppContext';
import ImageViewer from './ImageViewer';
import { formatCurrency } from '../services/utils';
import { generateRequestSummaryPDF, generateIdDocumentsPDF } from '../services/pdfService';

const InfoRow: React.FC<{ icon: React.ReactNode, label: string, value?: string | number, highlight?: boolean }> = ({ icon, label, value, highlight }) => (
    value ? (
        <div className={`flex items-start text-sm p-2 rounded-md ${highlight ? 'bg-slate-700/50 border border-slate-600' : ''}`}>
            <div className={`mr-3 mt-0.5 ${highlight ? 'text-primary-400' : 'text-slate-400'}`}>{icon}</div>
            <div className="flex-1">
                <span className="block text-xs uppercase tracking-wider font-semibold text-slate-400 mb-0.5">{label}</span>
                <span className={`block font-medium ${highlight ? 'text-white text-base' : 'text-slate-200'}`}>{value}</span>
            </div>
        </div>
    ) : null
);

const StatusBadge: React.FC<{ status: RequestStatus }> = ({ status }) => {
    const baseClasses = "px-2.5 py-1 text-xs font-bold rounded-full inline-flex items-center uppercase tracking-wide";
    switch (status) {
        case RequestStatus.PENDING:
            return <span className={`${baseClasses} bg-blue-500/20 text-blue-400 border border-blue-500/30`}><Clock size={12} className="mr-1.5"/> {status}</span>;
        case RequestStatus.UNDER_REVIEW:
            return <span className={`${baseClasses} bg-yellow-500/20 text-yellow-400 border border-yellow-500/30`}><Info size={12} className="mr-1.5"/> {status}</span>;
        case RequestStatus.APPROVED:
            return <span className={`${baseClasses} bg-green-500/20 text-green-400 border border-green-500/30`}><CheckCircle size={12} className="mr-1.5"/> {status}</span>;
        case RequestStatus.DENIED:
            return <span className={`${baseClasses} bg-red-500/20 text-red-400 border border-red-500/30`}><XCircle size={12} className="mr-1.5"/> {status}</span>;
        default:
            return null;
    }
};

interface RequestCardProps {
    request: LoanRequest;
    forceExpand?: boolean;
}

const RequestCard: React.FC<RequestCardProps> = ({ request, forceExpand = false }) => {
    const { handleApproveRequest, handleRejectRequest, handleUpdateRequestStatus } = useDataContext();
    const { showToast, showConfirmModal, annualInterestRate } = useAppContext();
    
    const [isExpanded, setIsExpanded] = useState(forceExpand);
    const [amount, setAmount] = useState(request.loanAmount || 500);
    const [term, setTerm] = useState(12);
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
    const [isDownloadingDniPdf, setIsDownloadingDniPdf] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    useEffect(() => {
        setIsExpanded(forceExpand);
    }, [forceExpand]);

    const approveAction = async () => {
        await handleApproveRequest(request, amount, term);
    };
    
    const rejectAction = async () => {
        await handleRejectRequest(request);
    };
    
    const reviewAction = async () => {
        setIsUpdatingStatus(true);
        try {
            await handleUpdateRequestStatus(request.id, RequestStatus.UNDER_REVIEW);
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleDownloadSummaryClick = () => {
        setIsDownloadingPdf(true);
        try {
            generateRequestSummaryPDF(request);
        } catch (e) {
            console.error("Failed to generate PDF:", e);
            showToast("Error al generar el PDF.", "error");
        } finally {
            setIsDownloadingPdf(false);
        }
    };

    const handleDownloadDniPdfClick = async () => {
        setIsDownloadingDniPdf(true);
        try {
            await generateIdDocumentsPDF(request);
        } catch (e) {
            console.error("Failed to generate DNI PDF:", e);
            showToast("Error al generar el PDF del DNI.", "error");
        } finally {
            setIsDownloadingDniPdf(false);
        }
    };

    const handleApproveClick = () => {
        if (amount > 0 && term > 0) {
            showConfirmModal({
                title: 'Confirmar Aprobación',
                message: `¿Estás seguro de que quieres aprobar un préstamo de ${formatCurrency(amount)} a ${term} meses para ${request.fullName}? La tasa de interés anual aplicada será del ${annualInterestRate}%.`,
                onConfirm: approveAction,
                type: 'info',
            });
        } else {
            showToast('Por favor, introduce un monto y un plazo válidos.', 'error');
        }
    };
    
    const handleRejectClick = () => {
        showConfirmModal({
            title: 'Confirmar Rechazo',
            message: `¿Estás seguro de que quieres rechazar la solicitud de ${request.fullName}? La solicitud y todos sus datos serán eliminados permanentemente. Esta acción no se puede deshacer.`,
            onConfirm: rejectAction,
            type: 'warning',
        });
    };
    
    const isActionable = [RequestStatus.PENDING, RequestStatus.UNDER_REVIEW].includes(request.status);

    return (
        <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden border border-slate-700 transition-all hover:border-slate-600">
            {/* Header / Summary View */}
            <div 
                className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer bg-slate-800 hover:bg-slate-750" 
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex-1 w-full">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg text-white">{request.fullName}</h3>
                        <StatusBadge status={request.status} />
                    </div>
                    {/* INFO RAPIDA EN CABECERA */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-slate-300">
                         <div className="flex items-center bg-slate-900/40 px-2 py-1 rounded">
                            <Hash size={14} className="mr-2 text-slate-500"/>
                            <span className="font-mono">{request.idNumber}</span>
                        </div>
                        <div className="flex items-center bg-slate-900/40 px-2 py-1 rounded">
                            <Phone size={14} className="mr-2 text-slate-500"/>
                            <span>{request.phone}</span>
                        </div>
                         <div className="flex items-center bg-slate-900/40 px-2 py-1 rounded">
                            <Calendar size={14} className="mr-2 text-slate-500"/>
                            <span>{new Date(request.requestDate).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end mt-2 sm:mt-0 pl-2 border-l border-slate-700 sm:border-0 sm:pl-0">
                    <div className="text-right">
                        <span className="block text-xs text-slate-500 uppercase font-bold">Solicitado</span>
                        <span className="block text-lg font-bold text-primary-400">
                            {formatCurrency(request.loanAmount)}
                        </span>
                    </div>
                    <div className={`p-2 rounded-full bg-slate-700/50 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                        <ChevronDown size={20} />
                    </div>
                </div>
            </div>

            {/* Expanded Full Details */}
            {isExpanded && (
                <div className="border-t border-slate-700 bg-slate-900/30 animate-fade-in">
                    <div className="p-4 sm:p-6">
                        
                        {/* Section 1: Contact & Location */}
                        <div className="mb-6">
                            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center">
                                <MapPin size={16} className="mr-2" /> Ubicación y Contacto
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                <div className="md:col-span-2">
                                    <InfoRow icon={<MapPin size={18} />} label="Dirección Completa" value={request.address} highlight />
                                </div>
                                <InfoRow icon={<Phone size={18} />} label="Teléfono Móvil" value={request.phone} highlight />
                                <InfoRow icon={<Mail size={18} />} label="Correo Electrónico" value={request.email || 'No especificado'} />
                            </div>
                        </div>

                        {/* Section 2: Loan & Employment Details */}
                        <div className="mb-6">
                            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center">
                                <FileText size={16} className="mr-2" /> Datos Económicos
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <InfoRow icon={<Banknote size={18} />} label="Monto Solicitado" value={formatCurrency(request.loanAmount)} />
                                <InfoRow icon={<FileText size={18} />} label="Motivo del Préstamo" value={request.loanReason} />
                                <InfoRow icon={<Briefcase size={18} />} label="Situación Laboral" value={request.employmentStatus} />
                                {request.contractType && <InfoRow icon={<Calendar size={18} />} label="Tipo Contrato" value={request.contractType} />}
                            </div>
                        </div>
                        
                        {/* Section 3: Documents (DNI & Signature) */}
                        <div className="mb-6">
                            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center">
                                <Eye size={16} className="mr-2" /> Documentación Adjunta
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold text-slate-400">DNI / NIE (Anverso)</p>
                                    <ImageViewer imageUrl={request.frontIdUrl} alt="Front ID" />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold text-slate-400">DNI / NIE (Reverso)</p>
                                    <ImageViewer imageUrl={request.backIdUrl} alt="Back ID" />
                                </div>
                            </div>
                            
                            <div className="mt-4">
                                <p className="text-xs font-semibold text-slate-400 mb-2">Firma Digital del Contrato</p>
                                {request.signature ? (
                                    <div className="p-4 rounded-lg border border-slate-700 bg-white inline-block">
                                        <img src={request.signature} alt="Firma del solicitante" className="h-20 w-auto" />
                                    </div>
                                ) : (
                                    <p className="text-sm text-red-400 italic">No se ha registrado firma digital.</p>
                                )}
                            </div>
                        </div>

                        {/* Actions Toolbar */}
                        {isActionable && (
                            <div className="mt-8 pt-6 border-t border-slate-700 bg-slate-800 -mx-4 -mb-4 px-4 py-4 sm:-mx-6 sm:-mb-6 sm:px-6">
                                <div className="flex flex-col xl:flex-row gap-6 items-start xl:items-center justify-between">
                                    
                                    {/* Download Tools */}
                                    <div className="flex gap-3 w-full xl:w-auto">
                                        <button
                                            onClick={handleDownloadDniPdfClick}
                                            disabled={isDownloadingDniPdf}
                                            className="flex-1 xl:flex-none inline-flex items-center justify-center px-4 py-2 bg-slate-700 border border-slate-600 text-slate-200 text-sm font-medium rounded-lg hover:bg-slate-600 hover:text-white transition-colors disabled:opacity-50"
                                        >
                                            {isDownloadingDniPdf ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Download size={16} className="mr-2" />}
                                            Descargar DNI
                                        </button>
                                        <button
                                            onClick={handleDownloadSummaryClick}
                                            disabled={isDownloadingPdf}
                                            className="flex-1 xl:flex-none inline-flex items-center justify-center px-4 py-2 bg-slate-700 border border-slate-600 text-slate-200 text-sm font-medium rounded-lg hover:bg-slate-600 hover:text-white transition-colors disabled:opacity-50"
                                        >
                                            {isDownloadingPdf ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Download size={16} className="mr-2" />}
                                            Resumen PDF
                                        </button>
                                    </div>

                                    {/* Approval Form */}
                                    <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto items-end sm:items-center bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                                        <div className="flex gap-4 w-full sm:w-auto">
                                            <div className="w-full sm:w-32">
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Monto (€)</label>
                                                <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} className="w-full px-2 py-1.5 text-sm border border-slate-600 rounded bg-slate-800 text-white font-bold text-right" />
                                            </div>
                                            <div className="w-full sm:w-24">
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Meses</label>
                                                <input type="number" value={term} onChange={e => setTerm(Number(e.target.value))} className="w-full px-2 py-1.5 text-sm border border-slate-600 rounded bg-slate-800 text-white font-bold text-right" />
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                             <button
                                                onClick={reviewAction}
                                                disabled={request.status === RequestStatus.UNDER_REVIEW || isUpdatingStatus}
                                                title="Marcar como En Estudio"
                                                className="flex-1 bg-yellow-600/20 text-yellow-400 border border-yellow-600/50 p-2 rounded-lg hover:bg-yellow-600/40 disabled:opacity-50"
                                            >
                                                {isUpdatingStatus ? <Loader2 size={20} className="animate-spin mx-auto" /> : <Edit2 size={20} className="mx-auto" />}
                                            </button>
                                            <button 
                                                onClick={handleRejectClick} 
                                                title="Rechazar Solicitud"
                                                className="flex-1 bg-red-600/20 text-red-400 border border-red-600/50 p-2 rounded-lg hover:bg-red-600/40"
                                            >
                                                <X size={20} className="mx-auto" />
                                            </button>
                                            <button 
                                                onClick={handleApproveClick} 
                                                className="flex-[2] bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 shadow-lg shadow-green-900/20 flex items-center justify-center gap-2"
                                            >
                                                <Check size={18} /> Aprobar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RequestCard;
