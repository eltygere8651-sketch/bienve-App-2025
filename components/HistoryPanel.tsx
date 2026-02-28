import React, { useState, useMemo } from 'react';
import { useDataContext } from '../contexts/DataContext';
import { Archive, Sparkles, TrendingUp, CheckCircle, AlertTriangle, FileText, Calendar, Search, History, Users, RefreshCw, Trash2, CheckSquare, Square, ArrowDown, Edit } from 'lucide-react';
import { formatCurrency } from '../services/utils';
import { Loan, LoanStatus, Client } from '../types';
import LoanDetailsModal from './LoanDetailsModal';
import { useAppContext } from '../contexts/AppContext';

const HistoryPanel: React.FC = () => {
    const { archivedLoans, handleArchivePaidLoans, clients, archivedClients, handleRestoreClient, handleBatchDeleteClients, loadMoreArchivedLoans, hasMoreArchivedLoans, handleDeleteLoan } = useDataContext();
    const { showConfirmModal } = useAppContext();
    const [activeTab, setActiveTab] = useState<'loans' | 'clients'>('loans');
    const [searchTerm, setSearchTerm] = useState('');
    const [isCleaning, setIsCleaning] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
    const [initialModalTab, setInitialModalTab] = useState<'details' | 'payment' | 'history' | 'edit'>('history');
    
    // Selection state for Batch Delete
    const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);

    // Calcular estadísticas generales
    const totalRecovered = useMemo(() => archivedLoans.reduce((acc, l) => acc + (l.initialCapital || l.amount), 0), [archivedLoans]);
    const totalInterest = useMemo(() => archivedLoans.reduce((acc, l) => acc + l.totalInterestPaid, 0), [archivedLoans]);

    // Filtrar lista de préstamos
    const filteredLoans = useMemo(() => {
        return archivedLoans.filter(l => 
            l.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
            l.id.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [archivedLoans, searchTerm]);

    // Filtrar lista de clientes
    const filteredClients = useMemo(() => {
        return archivedClients.filter(c => 
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (c.idNumber && c.idNumber.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [archivedClients, searchTerm]);

    // Generar informe de reputación
    const clientReputation = useMemo(() => {
        const rep = new Map<string, { name: string, paidLoans: number, totalAmount: number }>();
        
        archivedLoans.forEach(loan => {
            if (!rep.has(loan.clientId)) {
                rep.set(loan.clientId, { name: loan.clientName, paidLoans: 0, totalAmount: 0 });
            }
            const data = rep.get(loan.clientId)!;
            data.paidLoans += 1;
            data.totalAmount += (loan.initialCapital || loan.amount);
        });
        
        return Array.from(rep.values()).sort((a, b) => b.totalAmount - a.totalAmount);
    }, [archivedLoans]);

    const runSmartClean = async () => {
        setIsCleaning(true);
        await new Promise(r => setTimeout(r, 800));
        await handleArchivePaidLoans();
        setIsCleaning(false);
    };

    const handleLoadMore = async () => {
        setIsLoadingMore(true);
        await loadMoreArchivedLoans();
        setIsLoadingMore(false);
    };

    const restoreClient = (client: Client) => {
        showConfirmModal({
            title: 'Restaurar Cliente',
            message: `¿Quieres volver a mostrar a ${client.name} en la lista principal de clientes?`,
            onConfirm: async () => {
                await handleRestoreClient(client.id);
                // Also unselect if selected
                setSelectedClientIds(prev => prev.filter(id => id !== client.id));
            },
            type: 'info'
        });
    };

    const toggleClientSelection = (clientId: string) => {
        setSelectedClientIds(prev => 
            prev.includes(clientId) 
                ? prev.filter(id => id !== clientId)
                : [...prev, clientId]
        );
    };

    const handleSmartDelete = () => {
        if (selectedClientIds.length === 0) return;

        showConfirmModal({
            title: `Eliminar ${selectedClientIds.length} Clientes`,
            message: `¿Estás seguro de que quieres eliminar permanentemente a estos ${selectedClientIds.length} clientes del archivo? Esta acción es irreversible.`,
            onConfirm: async () => {
                await handleBatchDeleteClients(selectedClientIds);
                setSelectedClientIds([]);
            },
            type: 'warning'
        });
    };

    const handleDeleteLoanClick = (loan: Loan) => {
        showConfirmModal({
            title: 'Eliminar Préstamo Archivado',
            message: `¿Estás seguro de que quieres eliminar permanentemente el préstamo de ${loan.clientName} por ${formatCurrency(loan.amount)}? Esta acción es irreversible.`,
            onConfirm: async () => {
                await handleDeleteLoan(loan.id, loan.clientName);
            },
            type: 'warning'
        });
    };

    return (
        <>
             <LoanDetailsModal
                isOpen={!!selectedLoan}
                onClose={() => setSelectedLoan(null)}
                loan={selectedLoan}
                client={selectedLoan ? clients.find(c => c.id === selectedLoan.clientId) || null : null}
                initialTab={initialModalTab}
            />
            
            <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-20 relative">
                {/* Header & Smart Action */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <History className="h-8 w-8 text-primary-400" />
                            <h1 className="text-3xl font-heading font-bold text-slate-100">Historial y Archivo</h1>
                        </div>
                        <p className="text-slate-400 mt-2">Consulta préstamos finalizados y gestiona clientes ocultos.</p>
                    </div>

                    {activeTab === 'loans' && (
                        <button
                            onClick={runSmartClean}
                            disabled={isCleaning}
                            className="group relative inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-indigo-500/30 transition-all transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
                        >
                            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></span>
                            <Sparkles size={20} className={`mr-2 ${isCleaning ? 'animate-spin' : ''}`} />
                            {isCleaning ? 'Limpiando registros...' : 'Limpieza Inteligente'}
                        </button>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-700 space-x-4">
                    <button
                        onClick={() => setActiveTab('loans')}
                        className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'loans' ? 'border-primary-500 text-primary-400' : 'border-transparent text-slate-400 hover:text-white'}`}
                    >
                        <Archive size={16} /> Préstamos Cerrados
                    </button>
                    <button
                        onClick={() => setActiveTab('clients')}
                        className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'clients' ? 'border-primary-500 text-primary-400' : 'border-transparent text-slate-400 hover:text-white'}`}
                    >
                        <Users size={16} /> Clientes Archivados
                        <span className="bg-slate-700 text-white px-2 py-0.5 rounded-full text-xs">{archivedClients.length}</span>
                    </button>
                </div>

                {activeTab === 'loans' && (
                    <>
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="glass-card p-6 rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center gap-4">
                                <div className="p-3 bg-green-500/20 text-green-400 rounded-xl"><CheckCircle size={24} /></div>
                                <div>
                                    <p className="text-sm text-slate-400 font-bold uppercase">Préstamos Cerrados</p>
                                    <p className="text-2xl font-bold text-white">{archivedLoans.length}</p>
                                </div>
                            </div>
                            <div className="glass-card p-6 rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center gap-4">
                                <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl"><TrendingUp size={24} /></div>
                                <div>
                                    <p className="text-sm text-slate-400 font-bold uppercase">Capital Recuperado</p>
                                    <p className="text-2xl font-bold text-white">{formatCurrency(totalRecovered)}</p>
                                </div>
                            </div>
                            <div className="glass-card p-6 rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center gap-4">
                                <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl"><Archive size={24} /></div>
                                <div>
                                    <p className="text-sm text-slate-400 font-bold uppercase">Intereses Ganados</p>
                                    <p className="text-2xl font-bold text-white">{formatCurrency(totalInterest)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Main Archive List */}
                            <div className="lg:col-span-2 space-y-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Archive size={20} className="text-slate-500" /> Registros Archivados
                                    </h2>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                        <input 
                                            type="text" 
                                            placeholder="Buscar préstamo..." 
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-9 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-200 focus:ring-primary-500 focus:border-primary-500 w-48"
                                        />
                                    </div>
                                </div>

                                {filteredLoans.length > 0 ? (
                                    <>
                                        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-slate-900/50 text-slate-400 uppercase font-bold text-xs">
                                                    <tr>
                                                        <th className="px-6 py-3">Cliente</th>
                                                        <th className="px-6 py-3">Monto Original</th>
                                                        <th className="px-6 py-3">Finalizado</th>
                                                        <th className="px-6 py-3 text-right">Acción</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-700">
                                                    {filteredLoans.map(loan => (
                                                        <tr key={loan.id} className="hover:bg-slate-700/30 transition-colors group">
                                                            <td className="px-6 py-4 font-medium text-white">{loan.clientName}</td>
                                                            <td className="px-6 py-4 text-slate-300 font-mono">{formatCurrency(loan.initialCapital || loan.amount)}</td>
                                                            <td className="px-6 py-4 text-slate-400">
                                                                <div className="flex items-center gap-1.5">
                                                                    <Calendar size={14} />
                                                                    {new Date(loan.lastPaymentDate || loan.startDate).toLocaleDateString()}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <button 
                                                                        onClick={() => {
                                                                            setInitialModalTab('history');
                                                                            setSelectedLoan(loan);
                                                                        }}
                                                                        className="text-primary-400 hover:text-primary-300 font-medium text-xs bg-primary-500/10 px-3 py-1.5 rounded-lg border border-primary-500/20 hover:bg-primary-500/20 transition-all"
                                                                        title="Ver Detalles"
                                                                    >
                                                                        <FileText size={16} />
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => {
                                                                            setInitialModalTab('edit');
                                                                            setSelectedLoan(loan);
                                                                        }}
                                                                        className="text-amber-400 hover:text-amber-300 font-medium text-xs bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20 hover:bg-amber-500/20 transition-all"
                                                                        title="Editar Préstamo"
                                                                    >
                                                                        <Edit size={16} />
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => handleDeleteLoanClick(loan)}
                                                                        className="text-red-400 hover:text-red-300 font-medium text-xs bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/20 transition-all"
                                                                        title="Eliminar Préstamo"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        {hasMoreArchivedLoans && (
                                            <button 
                                                onClick={handleLoadMore}
                                                disabled={isLoadingMore}
                                                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 rounded-xl transition-all font-medium text-sm flex items-center justify-center gap-2"
                                            >
                                                {isLoadingMore ? <RefreshCw size={16} className="animate-spin" /> : <ArrowDown size={16} />}
                                                Cargar más antiguos
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-dashed border-slate-700">
                                        <Archive size={40} className="mx-auto text-slate-600 mb-3" />
                                        <p className="text-slate-400 font-medium">No hay préstamos archivados.</p>
                                        <p className="text-xs text-slate-500 mt-1">Usa el botón "Limpieza Inteligente" para archivar préstamos pagados.</p>
                                    </div>
                                )}
                            </div>

                            {/* Reputation Report */}
                            <div className="space-y-6">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <FileText size={20} className="text-slate-500" /> Informes de Reputación
                                </h2>
                                
                                <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-700 pb-2">Top Buenos Pagadores</h3>
                                    {clientReputation.length > 0 ? (
                                        <div className="space-y-4">
                                            {clientReputation.slice(0, 5).map((client, idx) => (
                                                <div key={idx} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-emerald-900/50 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/20">
                                                            {idx + 1}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-200">{client.name}</p>
                                                            <p className="text-xs text-slate-500">{client.paidLoans} préstamos cerrados</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs font-mono font-bold text-slate-400 bg-slate-900 px-2 py-1 rounded">
                                                        {formatCurrency(client.totalAmount)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-500 italic">No hay suficientes datos históricos.</p>
                                    )}
                                </div>

                                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="text-amber-400 h-5 w-5 mt-0.5" />
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-200">Nota del Sistema</h4>
                                            <p className="text-xs text-slate-400 mt-1">
                                                El historial se basa en préstamos archivados. Un cliente con múltiples préstamos cerrados y archivados se considera confiable.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'clients' && (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Users size={20} className="text-slate-500"/> Clientes Ocultos
                                <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400 font-normal">Toca para seleccionar</span>
                            </h2>
                            <div className="relative w-full sm:w-auto">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                <input 
                                    type="text" 
                                    placeholder="Buscar cliente..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-200 focus:ring-primary-500 focus:border-primary-500 w-full sm:w-48"
                                />
                            </div>
                        </div>

                        {filteredClients.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredClients.map(client => {
                                    const isSelected = selectedClientIds.includes(client.id);
                                    return (
                                        <div 
                                            key={client.id} 
                                            onClick={() => toggleClientSelection(client.id)}
                                            className={`relative rounded-xl border p-5 flex flex-col items-center text-center cursor-pointer transition-all duration-200 select-none ${
                                                isSelected 
                                                    ? 'bg-red-900/20 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)] scale-[1.02]' 
                                                    : 'bg-slate-800 border-slate-700 hover:border-slate-600 hover:bg-slate-750'
                                            }`}
                                        >
                                            {isSelected && (
                                                <div className="absolute top-3 right-3 text-red-500 animate-fade-in">
                                                    <CheckSquare size={20} />
                                                </div>
                                            )}
                                            {!isSelected && (
                                                <div className="absolute top-3 right-3 text-slate-600">
                                                    <Square size={20} />
                                                </div>
                                            )}

                                            <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center text-slate-400 mb-3">
                                                {client.name.charAt(0)}
                                            </div>
                                            <h3 className="font-bold text-slate-200">{client.name}</h3>
                                            <p className="text-xs text-slate-500 font-mono mb-4">{client.idNumber}</p>
                                            
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); restoreClient(client); }}
                                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded-lg text-sm font-bold transition-all border border-emerald-500/20 z-10"
                                            >
                                                <RefreshCw size={14} /> Restaurar
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-dashed border-slate-700">
                                <Users size={40} className="mx-auto text-slate-600 mb-3" />
                                <p className="text-slate-400 font-medium">No hay clientes archivados.</p>
                                <p className="text-xs text-slate-500 mt-1">Los clientes archivados desde la lista principal aparecerán aquí.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Smart Delete Action Button (Floating) */}
                {activeTab === 'clients' && selectedClientIds.length > 0 && (
                    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-30 animate-fade-in-down">
                        <button
                            onClick={handleSmartDelete}
                            className="flex items-center gap-3 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full shadow-2xl shadow-red-900/50 transition-all hover:scale-105 active:scale-95 border-2 border-red-400/50"
                        >
                            <Trash2 size={20} />
                            <span>Eliminar Permanentemente ({selectedClientIds.length})</span>
                        </button>
                    </div>
                )}
            </div>
        </>
    );
};

export default HistoryPanel;
