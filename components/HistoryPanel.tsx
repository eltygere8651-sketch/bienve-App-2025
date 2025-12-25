
import React, { useState, useMemo } from 'react';
import { useDataContext } from '../contexts/DataContext';
import { Archive, Sparkles, TrendingUp, CheckCircle, AlertTriangle, FileText, Calendar, Search, History } from 'lucide-react';
import { formatCurrency } from '../services/utils';
import { Loan, LoanStatus } from '../types';
import LoanDetailsModal from './LoanDetailsModal';

const HistoryPanel: React.FC = () => {
    const { archivedLoans, handleArchivePaidLoans, clients } = useDataContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [isCleaning, setIsCleaning] = useState(false);
    const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

    // Calcular estadísticas generales (Excluyendo Cancelados)
    const totalRecovered = useMemo(() => archivedLoans
        .filter(l => l.status !== LoanStatus.CANCELLED)
        .reduce((acc, l) => acc + (l.initialCapital || l.amount), 0), [archivedLoans]);
        
    const totalInterest = useMemo(() => archivedLoans
        .filter(l => l.status !== LoanStatus.CANCELLED)
        .reduce((acc, l) => acc + l.totalInterestPaid, 0), [archivedLoans]);

    const closedLoansCount = useMemo(() => archivedLoans.filter(l => l.status !== LoanStatus.CANCELLED).length, [archivedLoans]);

    // Filtrar lista
    const filteredLoans = useMemo(() => {
        return archivedLoans.filter(l => 
            l.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
            l.id.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [archivedLoans, searchTerm]);

    // Generar informe de reputación (Excluyendo cancelados para reputación positiva)
    const clientReputation = useMemo(() => {
        const rep = new Map<string, { name: string, paidLoans: number, totalAmount: number }>();
        
        archivedLoans.forEach(loan => {
            if (loan.status === LoanStatus.CANCELLED) return; // Ignore cancelled loans for reputation

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
        // Simular un poco de proceso para UX
        await new Promise(r => setTimeout(r, 800));
        await handleArchivePaidLoans();
        setIsCleaning(false);
    };

    return (
        <>
             <LoanDetailsModal
                isOpen={!!selectedLoan}
                onClose={() => setSelectedLoan(null)}
                loan={selectedLoan}
                client={selectedLoan ? clients.find(c => c.id === selectedLoan.clientId) || null : null}
                initialTab="history"
            />
            
            <div className="space-y-8 animate-fade-in max-w-7xl mx-auto">
                {/* Header & Smart Action */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <History className="h-8 w-8 text-primary-400" />
                            <h1 className="text-3xl font-heading font-bold text-slate-100">Historial y Archivo</h1>
                        </div>
                        <p className="text-slate-400 mt-2">Consulta préstamos finalizados y limpia tu panel principal.</p>
                    </div>

                    <button
                        onClick={runSmartClean}
                        disabled={isCleaning}
                        className="group relative inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-indigo-500/30 transition-all transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
                    >
                        <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></span>
                        <Sparkles size={20} className={`mr-2 ${isCleaning ? 'animate-spin' : ''}`} />
                        {isCleaning ? 'Limpiando registros...' : 'Limpieza Inteligente'}
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="glass-card p-6 rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center gap-4">
                        <div className="p-3 bg-green-500/20 text-green-400 rounded-xl"><CheckCircle size={24} /></div>
                        <div>
                            <p className="text-sm text-slate-400 font-bold uppercase">Préstamos Cerrados</p>
                            <p className="text-2xl font-bold text-white">{closedLoansCount}</p>
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
                                    placeholder="Buscar..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-200 focus:ring-primary-500 focus:border-primary-500 w-48"
                                />
                            </div>
                        </div>

                        {filteredLoans.length > 0 ? (
                            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-900/50 text-slate-400 uppercase font-bold text-xs">
                                        <tr>
                                            <th className="px-6 py-3">Cliente</th>
                                            <th className="px-6 py-3">Monto Original</th>
                                            <th className="px-6 py-3">Fecha Fin / Estado</th>
                                            <th className="px-6 py-3 text-right">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700">
                                        {filteredLoans.map(loan => (
                                            <tr key={loan.id} className="hover:bg-slate-700/30 transition-colors group">
                                                <td className="px-6 py-4 font-medium text-white">{loan.clientName}</td>
                                                <td className="px-6 py-4 text-slate-300 font-mono">{formatCurrency(loan.initialCapital || loan.amount)}</td>
                                                <td className="px-6 py-4 text-slate-400">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar size={14} />
                                                        {new Date(loan.lastPaymentDate || loan.startDate).toLocaleDateString()}
                                                        {loan.status === LoanStatus.CANCELLED && (
                                                            <span className="text-[10px] font-bold text-red-400 bg-red-900/30 px-1.5 py-0.5 rounded border border-red-500/20">
                                                                Cancelado
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button 
                                                        onClick={() => setSelectedLoan(loan)}
                                                        className="text-primary-400 hover:text-primary-300 font-medium text-xs bg-primary-500/10 px-3 py-1.5 rounded-lg border border-primary-500/20 hover:bg-primary-500/20 transition-all"
                                                    >
                                                        Ver Ficha
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
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
            </div>
        </>
    );
};

export default HistoryPanel;
