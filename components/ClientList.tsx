
import React, { useMemo, useState, useEffect } from 'react';
import { Loan, LoanStatus, Client } from '../types';
import { useDataContext } from '../contexts/DataContext';
import { useAppContext } from '../contexts/AppContext';
import { Users, Search, PlusCircle, Sparkles, RefreshCw, Banknote, TrendingUp, Phone, FileDown, Wallet, ArrowRight, Archive, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatCurrency, calculateLoanProgress, formatPhone } from '../services/utils';
import LoanDetailsModal from './LoanDetailsModal';
import NewLoanModal from './NewLoanModal';
import { generateClientReport, generateFullClientListPDF } from '../services/pdfService';

interface ClientWithData extends Client {
    loans: Loan[];
}

const ProgressBar: React.FC<{ percent: number }> = ({ percent }) => (
    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden mt-3 border border-slate-700/50 shadow-inner">
        <div 
            className={`h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,0,0,0.3)] ${percent >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-primary-600 to-indigo-500'}`} 
            style={{ width: `${percent}%` }}
        />
    </div>
);

const StatBadge: React.FC<{ label: string, value: string | number, icon: any, color: string }> = ({ label, value, icon: Icon, color }) => (
    <div className="flex items-center gap-4 bg-slate-800/60 backdrop-blur-md px-5 py-4 rounded-2xl border border-white/5 shadow-lg flex-1 min-w-[200px] hover:bg-slate-800/80 transition-colors">
        <div className={`p-3 rounded-xl bg-${color}-500/10 text-${color}-400 ring-1 ring-${color}-500/20 shadow-lg shadow-${color}-900/20`}>
            <Icon size={24} />
        </div>
        <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{label}</p>
            <p className="text-2xl font-heading font-bold text-white leading-none tracking-tight">{value}</p>
        </div>
    </div>
);

interface ClientCardProps {
    client: ClientWithData;
    onAddLoan: (client: Client) => void;
    onViewDetails: (loan: Loan) => void;
    onQuickPay: (loan: Loan) => void;
    onArchive: (client: Client) => void;
}

const ClientCard: React.FC<ClientCardProps> = ({ client, onAddLoan, onViewDetails, onQuickPay, onArchive }) => {
    const loans = client.loans || [];
    const activeLoan = loans.find(l => l.status === LoanStatus.PENDING || l.status === LoanStatus.OVERDUE);
    const hasActiveLoan = !!activeLoan;
    
    const isNewClient = useMemo(() => {
        if (!client.joinDate) return false;
        return (Date.now() - new Date(client.joinDate).getTime()) < 86400000;
    }, [client.joinDate]);

    // LOGIC: Check payment status for current month
    const monthlyStatus = useMemo(() => {
        if (!activeLoan) return null;
        
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const currentMonthName = now.toLocaleDateString('es-ES', { month: 'long' });

        // Check if any payment exists in history for this month/year
        const hasPaidThisMonth = activeLoan.paymentHistory?.some(payment => {
            const pDate = new Date(payment.date);
            return pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear;
        });

        // Special case: If loan started this month and has no payments, it's pending.
        // If loan started previous months, it's definitely pending.
        
        return {
            hasPaid: hasPaidThisMonth,
            monthName: currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1)
        };
    }, [activeLoan]);

    const handleDownloadReport = (e: React.MouseEvent) => {
        e.stopPropagation();
        generateClientReport(client, loans);
    };

    const handleCardClick = () => {
        if (activeLoan) {
            onViewDetails(activeLoan);
        } else if (loans.length > 0) {
            // If only paid loans, open details for the most recent one to see history
            const lastLoan = loans[loans.length - 1];
            onViewDetails(lastLoan);
        } else {
            // New client with no loans -> Prompt to create one
            onAddLoan(client);
        }
    };

    const handleActionClick = (e: React.MouseEvent, action: () => void) => {
        e.stopPropagation();
        action();
    }

    return (
        <div 
            onClick={handleCardClick}
            className={`relative flex flex-col bg-slate-800 rounded-2xl border shadow-xl overflow-hidden group transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 cursor-pointer ${
                hasActiveLoan && monthlyStatus && !monthlyStatus.hasPaid 
                ? 'border-red-500/40 shadow-red-900/10' // Highlight unpaid clients subtly
                : 'border-slate-700/60 hover:border-primary-500/30 hover:shadow-primary-900/10'
            }`}
        >
             {/* Header */}
            <div className="p-5 flex justify-between items-start relative z-10">
                <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-white font-heading font-bold text-lg border border-slate-600 shadow-inner">
                            {client.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-lg font-heading font-bold text-white truncate leading-none mb-1" title={client.name}>
                                {client.name}
                            </h3>
                            <div className="flex items-center gap-2">
                                {isNewClient && (
                                    <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                        <Sparkles size={8} /> NUEVO
                                    </span>
                                )}
                                <span className="text-xs font-mono text-slate-500">{client.idNumber}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* PDF Button */}
                <button 
                    onClick={handleDownloadReport}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all border border-slate-700 hover:border-slate-600 shadow-sm z-20 active:scale-90"
                    title="Descargar Ficha PDF"
                >
                    <FileDown size={18} />
                </button>
            </div>

            {/* Content Body */}
            <div className="px-5 pb-5 flex-1 flex flex-col">
                {hasActiveLoan ? (
                    <div className="flex-1 flex flex-col">
                        {/* Status Bar Monthly */}
                        {monthlyStatus && (
                            <div className={`mb-3 px-3 py-1.5 rounded-lg flex items-center justify-between text-xs font-bold border ${
                                monthlyStatus.hasPaid 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                : 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse'
                            }`}>
                                <div className="flex items-center gap-1.5">
                                    <Calendar size={12} />
                                    <span>{monthlyStatus.monthName}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {monthlyStatus.hasPaid ? (
                                        <>
                                            <span>ABONADO</span>
                                            <CheckCircle2 size={14} />
                                        </>
                                    ) : (
                                        <>
                                            <span>PENDIENTE</span>
                                            <AlertCircle size={14} />
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 mb-4 relative overflow-hidden group-hover:border-slate-600 transition-colors">
                             <div className="flex justify-between items-end mb-1 relative z-10">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pendiente Total</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${activeLoan.status === LoanStatus.OVERDUE ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
                                    {activeLoan.status}
                                </span>
                             </div>
                             <div className="text-2xl font-bold text-white tracking-tight relative z-10 font-mono">
                                 {formatCurrency(activeLoan.remainingCapital)}
                             </div>
                             
                             <ProgressBar percent={calculateLoanProgress(activeLoan)} />
                             
                             <div className="flex justify-between mt-2 text-[10px] font-medium">
                                 <span className="text-slate-500">Progreso</span>
                                 <span className="text-slate-300">{calculateLoanProgress(activeLoan).toFixed(0)}%</span>
                             </div>
                        </div>
                        
                        <div className="mt-auto pt-2">
                            <button 
                                onClick={(e) => handleActionClick(e, () => onQuickPay(activeLoan))}
                                className={`w-full group/btn relative flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-bold text-sm transition-all shadow-lg border-t border-white/10 active:scale-95 ${
                                    monthlyStatus?.hasPaid 
                                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-emerald-900/20'
                                    : 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 shadow-red-900/20 animate-pulse-slow'
                                }`}
                            >
                                <Wallet size={16} /> 
                                {monthlyStatus?.hasPaid ? 'Registrar Otro Pago' : 'Registrar Cobro Mes'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-4 bg-slate-900/20 rounded-xl border border-dashed border-slate-700/50">
                        <div className="p-2 rounded-full bg-slate-800/50 mb-2"><Banknote size={20} className="text-slate-600" /></div>
                        <p className="text-xs text-slate-500 mb-3 font-medium">Sin deuda activa</p>
                        
                        <div className="flex gap-2 w-full">
                            <button 
                                onClick={(e) => handleActionClick(e, () => onArchive(client))}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-bold text-xs border border-slate-700 hover:border-slate-600 transition-all"
                                title="Archivar Cliente (Ocultar)"
                            >
                                <Archive size={14} /> Archivar
                            </button>
                            <button 
                                onClick={(e) => handleActionClick(e, () => onAddLoan(client))}
                                className="flex-[2] flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white font-bold text-xs border border-indigo-500/20 hover:border-indigo-500 transition-all"
                            >
                                <PlusCircle size={14} /> Prestar
                            </button>
                        </div>
                    </div>
                )}
            </div>
            
            {client.phone && (
                <div className="px-5 py-3 border-t border-slate-700/50 flex items-center text-xs text-slate-400 bg-slate-800/30">
                    <Phone size={12} className="mr-2" />
                    {formatPhone(client.phone)}
                </div>
            )}
        </div>
    );
};

const ClientList: React.FC = () => {
    const { clientLoanData, refreshAllData, handleArchiveClient } = useDataContext(); 
    const { setCurrentView, showToast, showConfirmModal } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    
    // Modal States
    const [selectedClientForNewLoan, setSelectedClientForNewLoan] = useState<Client | null>(null);
    const [selectedLoanForDetails, setSelectedLoanForDetails] = useState<Loan | null>(null);
    const [detailsModalTab, setDetailsModalTab] = useState<'details' | 'payment'>('details'); 
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const filteredClients = useMemo(() => {
        // Sort logic: 
        // 1. Clients with UNPAID current month come first
        // 2. Then clients with active loans
        // 3. Then alphabetical/date
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const isUnpaidThisMonth = (c: ClientWithData) => {
            const activeLoan = c.loans.find(l => l.status === LoanStatus.PENDING || l.status === LoanStatus.OVERDUE);
            if (!activeLoan) return false;
            const hasPaid = activeLoan.paymentHistory?.some(p => {
                const d = new Date(p.date);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            });
            return !hasPaid;
        };

        const sorted = [...clientLoanData].sort((a, b) => {
            const aUnpaid = isUnpaidThisMonth(a);
            const bUnpaid = isUnpaidThisMonth(b);
            
            if (aUnpaid && !bUnpaid) return -1;
            if (!aUnpaid && bUnpaid) return 1;

            const aActive = a.loans.some(l => l.status === LoanStatus.PENDING || l.status === LoanStatus.OVERDUE);
            const bActive = b.loans.some(l => l.status === LoanStatus.PENDING || l.status === LoanStatus.OVERDUE);
            if (aActive && !bActive) return -1;
            if (!aActive && bActive) return 1;
            
            return new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime();
        });

        if (!debouncedSearchTerm) return sorted;
        
        const term = debouncedSearchTerm.toLowerCase();
        return sorted.filter(c => 
            c.name.toLowerCase().includes(term) || 
            (c.idNumber && c.idNumber.toLowerCase().includes(term))
        );
    }, [clientLoanData, debouncedSearchTerm]);

    // Stats for Dashboard
    const stats = useMemo(() => {
        const totalClients = clientLoanData.length;
        const clientsWithDebt = clientLoanData.filter(c => c.loans.some(l => l.status === LoanStatus.PENDING || l.status === LoanStatus.OVERDUE)).length;
        const totalDebt = clientLoanData.reduce((acc, c) => acc + c.loans.reduce((lAcc, l) => lAcc + l.remainingCapital, 0), 0);
        return { totalClients, clientsWithDebt, totalDebt };
    }, [clientLoanData]);
    
    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refreshAllData();
        setIsRefreshing(false);
    };

    const handleQuickPay = (loan: Loan) => {
        setSelectedLoanForDetails(loan);
        setDetailsModalTab('payment');
    };

    const handleViewDetails = (loan: Loan) => {
        setSelectedLoanForDetails(loan);
        setDetailsModalTab('details');
    };

    const confirmArchive = (client: Client) => {
        showConfirmModal({
            title: 'Archivar Cliente',
            message: `¿Estás seguro de que quieres archivar a ${client.name}? Se moverá al historial y no aparecerá en esta lista. Podrás restaurarlo más tarde.`,
            onConfirm: async () => {
                await handleArchiveClient(client.id);
            },
            type: 'info'
        });
    };

    const activeClient = useMemo(() => {
        if (!selectedLoanForDetails) return null;
        return clientLoanData.find(c => c.id === selectedLoanForDetails.clientId) || null;
    }, [selectedLoanForDetails, clientLoanData]);

    const handleGlobalPDF = () => {
        generateFullClientListPDF(clientLoanData);
    };

    return (
        <>
            <NewLoanModal 
                isOpen={!!selectedClientForNewLoan} 
                onClose={() => setSelectedClientForNewLoan(null)} 
                client={selectedClientForNewLoan} 
            />
            
            <LoanDetailsModal
                isOpen={!!selectedLoanForDetails}
                onClose={() => setSelectedLoanForDetails(null)}
                loan={selectedLoanForDetails}
                client={activeClient}
                initialTab={detailsModalTab} 
            />
            
            <div className="space-y-8 animate-fade-in max-w-[1600px] mx-auto pb-10">
                
                {/* 1. Top Header & Actions */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                     <div>
                         <h1 className="text-3xl font-heading font-bold text-white flex items-center gap-3">
                             Cartera de Clientes
                             <button 
                                onClick={handleRefresh} 
                                className={`p-2 rounded-full bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-400 transition-all ${isRefreshing ? 'animate-spin text-primary-500' : ''}`} 
                                title="Sincronizar"
                             >
                                 <RefreshCw size={18} />
                             </button>
                         </h1>
                         <p className="text-sm text-slate-400 mt-1">Gestiona préstamos y visualiza el estado financiero de tus contactos.</p>
                     </div>
                     
                     <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                        <button
                            onClick={handleGlobalPDF}
                            className="flex-1 lg:flex-none flex items-center justify-center px-5 py-3 bg-slate-800 text-slate-200 font-bold rounded-xl border border-slate-700 hover:bg-slate-700 hover:border-slate-600 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 text-sm active:scale-95"
                        >
                            <FileDown size={18} className="mr-2 text-blue-400" />
                            Reporte Global
                        </button>
                        <button
                            onClick={() => setCurrentView('newClient')}
                            className="flex-1 lg:flex-none flex items-center justify-center px-6 py-3 bg-gradient-to-r from-primary-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-primary-900/30 hover:shadow-primary-500/40 hover:from-primary-500 hover:to-indigo-500 transition-all transform hover:-translate-y-0.5 border-t border-white/20 text-sm group active:scale-95"
                        >
                            <PlusCircle size={20} className="mr-2 group-hover:rotate-90 transition-transform" />
                            Nuevo Cliente
                        </button>
                     </div>
                </div>

                {/* 2. Mini Dashboard */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatBadge label="Total Clientes" value={stats.totalClients} icon={Users} color="blue" />
                    <StatBadge label="Con Deuda Activa" value={stats.clientsWithDebt} icon={TrendingUp} color="amber" />
                    <StatBadge label="Cartera Pendiente" value={formatCurrency(stats.totalDebt)} icon={Wallet} color="emerald" />
                </div>

                {/* 3. Search & Filters */}
                <div className="relative max-w-xl">
                     <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-slate-400" />
                     </div>
                     <input
                        type="text"
                        placeholder="Buscar cliente por nombre, DNI o teléfono..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-slate-800/80 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all shadow-lg backdrop-blur-sm outline-none"
                    />
                </div>

                {/* 4. Grid of Cards */}
                {clientLoanData.length === 0 ? (
                    <div className="text-center py-24 bg-slate-800/20 rounded-3xl border border-dashed border-slate-700/50 flex flex-col items-center">
                         <div className="bg-slate-800 p-6 rounded-full mb-4 shadow-xl ring-1 ring-slate-700">
                            <Users size={48} className="text-slate-600" />
                         </div>
                         <h2 className="text-2xl font-heading font-bold text-slate-200">Base de datos vacía</h2>
                         <p className="mt-2 text-slate-400 max-w-md">No tienes clientes registrados. Comienza añadiendo uno nuevo para gestionar sus préstamos.</p>
                         <button onClick={() => setCurrentView('newClient')} className="mt-6 text-primary-400 font-bold hover:text-primary-300 flex items-center gap-2">
                             Registrar Primer Cliente <ArrowRight size={16} />
                         </button>
                    </div>
                ) : (
                    <>
                        {filteredClients.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredClients.map(client => (
                                    <ClientCard 
                                        key={client.id} 
                                        client={client as ClientWithData} 
                                        onAddLoan={(c) => setSelectedClientForNewLoan(c)}
                                        onViewDetails={handleViewDetails}
                                        onQuickPay={handleQuickPay}
                                        onArchive={confirmArchive}
                                    />
                                ))}
                            </div>
                        ) : (
                             <div className="text-center py-20 bg-slate-800/30 rounded-2xl border border-dashed border-slate-700">
                                 <p className="text-lg text-slate-400 font-medium">No se encontraron resultados para "{searchTerm}"</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
};

export default ClientList;
