
import React, { useMemo, useState, useEffect } from 'react';
import { Loan, LoanStatus, Client } from '../types';
import { useDataContext } from '../contexts/DataContext';
import { useAppContext } from '../contexts/AppContext';
import { Users, Search, PlusCircle, Plus, CalendarArrowDown, Sparkles, RefreshCw, Banknote, TrendingUp, AlertCircle, Phone, ArrowRight, Eye } from 'lucide-react';
import { formatCurrency, calculateLoanProgress, formatPhone } from '../services/utils';
import LoanDetailsModal from './LoanDetailsModal';
import NewLoanModal from './NewLoanModal';

interface ClientWithData extends Client {
    loans: Loan[];
}

const ProgressBar: React.FC<{ percent: number }> = ({ percent }) => (
    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden mt-2 border border-slate-700/50">
        <div 
            className={`h-full rounded-full transition-all duration-500 ${percent >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-primary-600 to-primary-400'}`} 
            style={{ width: `${percent}%` }}
        />
    </div>
);

interface ClientCardProps {
    client: ClientWithData;
    onAddLoan: (client: Client) => void;
    onViewDetails: (loan: Loan) => void;
    onQuickPay: (loan: Loan) => void;
}

const ClientCard: React.FC<ClientCardProps> = ({ client, onAddLoan, onViewDetails, onQuickPay }) => {
    const loans = client.loans || [];
    
    // Calcular deuda activa (Solo préstamos pendientes)
    const activeLoan = loans.find(l => l.status === LoanStatus.PENDING || l.status === LoanStatus.OVERDUE);
    const hasActiveLoan = !!activeLoan;
    
    const isNewClient = useMemo(() => {
        if (!client.joinDate) return false;
        return (Date.now() - new Date(client.joinDate).getTime()) < 86400000;
    }, [client.joinDate]);

    return (
        <div className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 shadow-lg hover:shadow-xl hover:border-slate-600 transition-all duration-300 group flex flex-col h-full relative">
             {/* Decorative gradient top */}
             <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 to-indigo-600"></div>

            {/* Header */}
            <div className="p-5 pb-2 flex justify-between items-start">
                <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-slate-100 truncate pr-2 group-hover:text-primary-300 transition-colors" title={client.name}>
                        {client.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-900/50 px-1.5 py-0.5 rounded border border-slate-700">
                            {client.idNumber}
                        </span>
                        {isNewClient && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                <Sparkles size={8} /> NUEVO
                            </span>
                        )}
                    </div>
                </div>
                <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs border border-slate-600">
                    {client.name.charAt(0)}
                </div>
            </div>

            {/* Content Body */}
            <div className="p-5 pt-2 flex-1 flex flex-col">
                {client.phone && (
                     <p className="text-xs text-slate-500 flex items-center gap-1.5 mb-4">
                        <Phone size={12} /> {formatPhone(client.phone)}
                    </p>
                )}

                {hasActiveLoan ? (
                    <div className="flex-1 flex flex-col">
                        <div className="bg-slate-900/30 rounded-xl p-4 border border-slate-700/50 mb-4 flex-1">
                             <div className="flex justify-between items-end mb-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pendiente</span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${activeLoan.status === LoanStatus.OVERDUE ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                    {activeLoan.status}
                                </span>
                             </div>
                             <div className="text-2xl font-bold text-white mb-3">
                                 {formatCurrency(activeLoan.remainingCapital)}
                             </div>
                             
                             <div className="flex justify-between items-center text-[10px] text-slate-500 mb-1">
                                 <span>Progreso</span>
                                 <span>{calculateLoanProgress(activeLoan).toFixed(0)}%</span>
                             </div>
                             <ProgressBar percent={calculateLoanProgress(activeLoan)} />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mt-auto">
                             <button 
                                onClick={() => onViewDetails(activeLoan)}
                                className="px-3 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold transition-colors border border-slate-600 flex items-center justify-center gap-2"
                            >
                                <Eye size={14} /> Ficha
                            </button>
                            <button 
                                onClick={() => onQuickPay(activeLoan)}
                                className="px-3 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
                            >
                                <Banknote size={14} /> Cobrar
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-8 bg-slate-900/20 rounded-xl border border-dashed border-slate-700">
                        <p className="text-sm text-slate-500 font-medium mb-1">Sin deuda activa</p>
                        <p className="text-xs text-slate-600 mb-3">El cliente está al día.</p>
                        <button 
                            onClick={() => onAddLoan(client)}
                            className="text-xs flex items-center gap-1.5 bg-primary-500/10 text-primary-400 px-4 py-2 rounded-lg hover:bg-primary-500/20 transition-all font-bold border border-primary-500/20"
                        >
                            <Plus size={14} /> Nuevo Préstamo
                        </button>
                    </div>
                )}
            </div>
            
            {/* Footer Summary */}
            {loans.length > 1 && (
                <div className="bg-slate-900/50 px-5 py-2 border-t border-slate-800 flex justify-between items-center text-[10px]">
                    <span className="text-slate-500 uppercase font-bold tracking-wider">Historial Total</span>
                    <span className="text-slate-400 font-mono bg-slate-800 px-1.5 rounded">{loans.length} Préstamos</span>
                </div>
            )}
        </div>
    );
};

const ClientList: React.FC = () => {
    const { clientLoanData, refreshAllData } = useDataContext(); 
    const { setCurrentView } = useAppContext();
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
        const sorted = [...clientLoanData].sort((a, b) => {
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

    const activeClient = useMemo(() => {
        if (!selectedLoanForDetails) return null;
        return clientLoanData.find(c => c.id === selectedLoanForDetails.clientId) || null;
    }, [selectedLoanForDetails, clientLoanData]);

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
            
            <div className="space-y-6 animate-fade-in max-w-[1600px] mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                     <div>
                         <h1 className="text-3xl font-heading font-bold text-white flex items-center gap-3">
                             Cartera de Clientes
                             <button 
                                onClick={handleRefresh} 
                                className={`p-2 rounded-full bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-400 transition-all ${isRefreshing ? 'animate-spin text-primary-500' : ''}`} 
                                title="Sincronizar"
                             >
                                 <RefreshCw size={16} />
                             </button>
                         </h1>
                         <p className="text-sm text-slate-400 flex items-center mt-2">
                            <TrendingUp size={14} className="mr-1.5 text-emerald-400" /> 
                            {filteredClients.filter(c => c.loans.some(l => l.status === LoanStatus.PENDING)).length} clientes con deuda activa
                         </p>
                     </div>
                     <button
                        onClick={() => setCurrentView('newClient')}
                        className="inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white font-bold rounded-xl shadow-lg shadow-primary-900/30 hover:bg-primary-500 transition-all hover:-translate-y-0.5 group"
                    >
                        <PlusCircle size={20} className="mr-2 group-hover:rotate-90 transition-transform" />
                        Registrar Cliente
                    </button>
                </div>

                {clientLoanData.length === 0 ? (
                    <div className="text-center py-20 bg-slate-800/20 rounded-3xl border border-dashed border-slate-700/50">
                         <div className="bg-slate-800 p-6 rounded-full inline-block mb-4 shadow-xl">
                            <Users size={48} className="text-slate-600" />
                         </div>
                         <h2 className="text-2xl font-heading font-bold text-slate-200">Base de datos vacía</h2>
                         <p className="mt-2 text-slate-400">Comienza registrando tu primer cliente para ver actividad.</p>
                    </div>
                ) : (
                    <>
                        <div className="relative max-w-lg mb-8">
                             <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                             <input
                                type="text"
                                placeholder="Buscar por nombre, DNI o teléfono..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3.5 border border-slate-700 rounded-xl bg-slate-800 text-white placeholder-slate-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all shadow-lg"
                            />
                        </div>
                        
                        {filteredClients.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredClients.map(client => (
                                    <ClientCard 
                                        key={client.id} 
                                        client={client as ClientWithData} 
                                        onAddLoan={(c) => setSelectedClientForNewLoan(c)}
                                        onViewDetails={handleViewDetails}
                                        onQuickPay={handleQuickPay}
                                    />
                                ))}
                            </div>
                        ) : (
                             <div className="text-center py-16">
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
