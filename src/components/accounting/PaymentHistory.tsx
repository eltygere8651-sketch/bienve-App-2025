
import React from 'react';
import { formatCurrency } from '../../services/utils';
import { History, Search, Download, CreditCard, ChevronRight, User, Calendar, Database, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

interface PaymentHistoryProps {
    loans: any[];
    isLoading: boolean;
    hasMore: boolean;
    onLoadMore: () => void;
}

const PaymentHistory: React.FC<PaymentHistoryProps> = ({ loans, isLoading, hasMore, onLoadMore }) => {
    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-slate-800/40 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl relative"
        >
            <div className="p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h3 className="text-2xl font-black text-white tracking-tight uppercase">Historial de Préstamos Pagados</h3>
                    <p className="text-slate-500 text-sm font-bold tracking-widest flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        Archivo de Transacciones Consolidadas
                    </p>
                </div>
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                    <input 
                        type="text" 
                        placeholder="Buscar en el archivo..." 
                        className="w-full bg-slate-900/60 border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-white text-xs font-bold outline-none focus:border-rose-500 transition-colors shadow-inner"
                    />
                </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-900/40 border-b border-white/5">
                            <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Cliente</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Capital</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Interés</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Cierre</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-medium">
                        {loans.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-8 py-20 text-center">
                                    <div className="flex flex-col items-center gap-4">
                                        <Database size={48} className="text-slate-700 opacity-20" />
                                        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest italic">No se han encontrado registros archivados</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            loans.map((loan, i) => (
                                <motion.tr 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.02 }}
                                    key={loan.id} 
                                    className="hover:bg-slate-700/20 transition-colors group cursor-pointer"
                                >
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-rose-400 font-black border border-white/5 shadow-inner">
                                                {loan.clientName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-white group-hover:text-rose-400 transition-colors tracking-tight">{loan.clientName}</p>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{loan.phoneNumber || 'Sin contacto'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 font-mono text-slate-300">{formatCurrency(loan.initialCapital)}</td>
                                    <td className="px-8 py-5 font-mono text-emerald-400">+{formatCurrency(loan.totalInterestPaid || 0)}</td>
                                    <td className="px-8 py-5 text-xs text-slate-400 font-bold">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} className="text-slate-600" />
                                            {loan.endDate ? new Date(loan.endDate).toLocaleDateString() : 'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                                            Liquidado
                                        </span>
                                    </td>
                                </motion.tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {hasMore && (
                <div className="p-8 flex justify-center bg-slate-900/40 border-t border-white/5">
                    <button 
                        onClick={onLoadMore}
                        disabled={isLoading}
                        className="flex items-center gap-3 px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 border border-white/5 disabled:opacity-50 group"
                    >
                        {isLoading ? <RefreshCw className="animate-spin" size={18} /> : <Download size={18} className="group-hover:translate-y-1 transition-transform" />}
                        CARGAR HISTORIAL COMPLETO
                    </button>
                </div>
            )}
        </motion.div>
    );
};

export default PaymentHistory;
