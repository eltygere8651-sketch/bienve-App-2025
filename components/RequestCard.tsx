import React, { useState } from 'react';
import { LoanRequest, RequestStatus } from '../types';
import { ChevronDown, ChevronUp, Hash, MapPin, Phone, Mail, FileText, Briefcase, Calendar, Check, X, Banknote, Edit2, Info, Loader2, Clock, Download, Sparkles } from 'lucide-react';
import { useDataContext } from '../contexts/DataContext';
import { useAppContext } from '../contexts/AppContext';
import ImageViewer from './ImageViewer';
import { formatCurrency } from '../services/utils';
import { generateRequestSummaryPDF, generateIdDocumentsPDF } from '../services/pdfService';
import InfoModal from './InfoModal';
import { generateRequestSummary } from '../services/geminiService';


const InfoRow: React.FC<{ icon: React.ReactNode, label: string, value?: string | number }> = ({ icon, label, value }) => (
    value ? (
        <div className="flex items-start text-sm">
            <div className="text-slate-500 mr-2 mt-0.5">{icon}</div>
            <div>
                <span className="font-semibold text-slate-700 mr-2">{label}:</span>
                <span className="text-slate-600">{value}</span>
            </div>
        </div>
    ) : null
);

const StatusBadge: React.FC<{ status: RequestStatus }> = ({ status }) => {
    const baseClasses = "px-2 py-1 text-xs font-semibold rounded-full inline-flex items-center";
    switch (status) {
        case RequestStatus.PENDING:
            return <span className={`${baseClasses} bg-primary-100 text-primary-700`}><Clock size={12} className="mr-1"/> {status}</span>;
        case RequestStatus.UNDER_REVIEW:
            return <span className={`${baseClasses} bg-yellow-100 text-yellow-700`}><Info size={12} className="mr-1"/> {status}</span>;
        default:
            return null;
    }
};

const SimpleMarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let listItems: string[] = [];

    const renderLine = (line: string): React.ReactNode => {
        const parts = line.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index}>{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    const flushList = () => {
        if (listItems.length > 0) {
            elements.push(
                <ul key={`ul-${elements.length}`} className="list-disc pl-5 mt-2 space-y-1">
                    {listItems.map((item, index) => <li key={index}>{renderLine(item)}</li>)}
                </ul>
            );
            listItems = [];
        }
    };

    lines.forEach((line, lineIndex) => {
        const listItemMatch = line.match(/^[\s-]*\*\s(.*)/) || line.match(/^[\s-]*-\s(.*)/);
        if (listItemMatch) {
            listItems.push(listItemMatch[1]);
        } else {
            flushList();
            elements.push(<p key={`p-${lineIndex}`} className={line.trim() === '' ? 'h-2' : ''}>{renderLine(line)}</p>);
        }
    });

    flushList();

    return <>{elements}</>;
};

const RequestCard: React.FC<{ request: LoanRequest }> = ({ request }) => {
    const { handleApproveRequest, handleDenyRequest, handleUpdateRequestStatus } = useDataContext();
    const { showToast, showConfirmModal } = useAppContext();
    
    const [isExpanded, setIsExpanded] = useState(false);
    const [amount, setAmount] = useState(request.loanAmount || 500);
    const [term, setTerm] = useState(12);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
    const [isDownloadingDniPdf, setIsDownloadingDniPdf] = useState(false);
    const [summaryModal, setSummaryModal] = useState({ isOpen: false, content: '', isLoading: false });


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

    const handleGenerateSummary = async () => {
        setSummaryModal({ isOpen: true, content: '', isLoading: true });
        try {
            const summary = await generateRequestSummary(request);
            setSummaryModal({ isOpen: true, content: summary, isLoading: false });
        } catch (e) {
            console.error(e);
            showToast("Error al generar el resumen.", "error");
            setSummaryModal({ isOpen: false, content: '', isLoading: false });
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
            message: `¿Estás seguro de que quieres denegar la solicitud de ${request.fullName}? La solicitud se marcará como 'Denegada' y desaparecerá de esta lista, pero se conservará en la base de datos.`,
            onConfirm: denyAction,
        });
    };

    return (
        <>
            <InfoModal
                isOpen={summaryModal.isOpen}
                onClose={() => setSummaryModal({ ...summaryModal, isOpen: false })}
                title="Resumen con Inteligencia Artificial"
            >
                {summaryModal.isLoading ? (
                    <div className="flex flex-col items-center justify-center min-h-[150px]">
                        <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
                        <p className="mt-4 text-slate-600">Analizando la solicitud...</p>
                    </div>
                ) : (
                    <div className="text-sm text-slate-800 font-sans leading-relaxed">
                        <SimpleMarkdownRenderer text={summaryModal.content} />
                    </div>
                )}
            </InfoModal>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 flex justify-between items-center cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">{request.fullName}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-sm text-slate-500">Solicitud del {new Date(request.requestDate).toLocaleDateString()}</p>
                            <StatusBadge status={request.status} />
                        </div>
                    </div>
                    <div className="flex items-center">
                        <span className="text-sm font-bold text-primary-600 mr-2 sm:mr-4">
                            {formatCurrency(request.loanAmount)}
                        </span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleGenerateSummary();
                            }}
                            className="p-2 rounded-full text-slate-500 hover:bg-yellow-100 hover:text-yellow-600 disabled:opacity-50 disabled:cursor-wait"
                            title="Generar resumen con IA"
                            disabled={summaryModal.isLoading}
                        >
                            {summaryModal.isLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                        </button>
                        <div className="p-2">
                            {isExpanded ? <ChevronUp className="text-slate-500" /> : <ChevronDown className="text-slate-500" />}
                        </div>
                    </div>
                </div>
                {isExpanded && (
                    <div className="p-4 border-t border-slate-200 animate-fade-in-down">
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
                        
                        <div className="border-t border-slate-200 mt-4 pt-4">
                            <h4 className="text-base font-semibold text-slate-700 mb-4">Documentos y Firma</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <p className="text-sm font-medium text-slate-700 mb-2">Anverso DNI</p>
                                    <ImageViewer imageUrl={request.frontIdUrl} alt="Front ID" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-700 mb-2">Reverso DNI</p>
                                    <ImageViewer imageUrl={request.backIdUrl} alt="Back ID" />
                                </div>
                            </div>
                            
                            <div>
                                <p className="text-sm font-medium mb-2 text-slate-700">Firma del Solicitante</p>
                                {request.signature ? (
                                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                                        <img src={request.signature} alt="Firma del solicitante" className="mx-auto bg-white rounded" style={{ maxHeight: '100px' }} />
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-500">No se proporcionó firma.</p>
                                )}
                            </div>
                        </div>

                        <div className="border-t border-slate-200 mt-6 pt-4">
                            <h4 className="text-base font-semibold text-slate-700 mb-4">Acciones</h4>
                            <div className="bg-slate-50 p-4 rounded-lg space-y-4">
                                <div>
                                    <p className="text-sm text-slate-700 font-semibold mb-3">Descargar Documentación</p>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            onClick={handleDownloadDniPdfClick}
                                            disabled={isDownloadingDniPdf}
                                            className="inline-flex items-center px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-medium rounded-md hover:bg-slate-100 disabled:opacity-50"
                                        >
                                            {isDownloadingDniPdf ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Download size={14} className="mr-1.5" />}
                                            {isDownloadingDniPdf ? 'Generando...' : 'DNI (PDF)'}
                                        </button>
                                        <button
                                            onClick={handleDownloadSummaryClick}
                                            disabled={isDownloadingPdf}
                                            className="inline-flex items-center px-3 py-1.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-md hover:bg-primary-200 disabled:opacity-50"
                                        >
                                            {isDownloadingPdf ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Download size={14} className="mr-1.5" />}
                                            {isDownloadingPdf ? 'Generando...' : 'Resumen (PDF)'}
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-200">
                                    <p className="text-sm text-slate-700 font-semibold mb-3">Gestionar Solicitud</p>
                                    <div className="flex flex-col md:flex-row items-center gap-4">
                                        <div className="w-full">
                                            <label className="block text-sm font-medium text-slate-700">Monto a Aprobar (€)</label>
                                            <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900" />
                                        </div>
                                        <div className="w-full">
                                            <label className="block text-sm font-medium text-slate-700">Plazo (meses)</label>
                                            <input type="number" value={term} onChange={e => setTerm(Number(e.target.value))} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900" />
                                        </div>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2 justify-end mt-4">
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
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default RequestCard;