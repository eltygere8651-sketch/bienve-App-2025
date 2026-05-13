
import React, { useMemo } from 'react';
import { Loan, OverdueMonth } from '../types';
import { X, Clock, User, Calendar, Banknote } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency } from '../services/utils';

interface OverdueBreakdownModalProps {
    isOpen: boolean;
    onClose: () => void;
    loans: Loan[];
}

interface OverdueItem extends OverdueMonth {
    clientName: string;
    loanId: string;
}

const OverdueBreakdownModal: React.FC<OverdueBreakdownModalProps> = ({ isOpen, onClose, loans }) => {
    const overdueItems = useMemo(() => {
        const items: OverdueItem[] = [];
        loans.forEach(loan => {
            if (loan.overdueHistory) {
                loan.overdueHistory.forEach(history => {
                    if (history.status === 'pendiente') {
                        items.push({
                            ...history,
                            clientName: loan.clientName || 'Cliente desconocido',
                            loanId: loan.id
                        });
                    }
                });
            }
        });
        // Sort by year and month? Or maybe just alphabetical by client
        return items.sort((a, b) => b.year - a.year || b.monthName.localeCompare(a.monthName));
    }, [loans]);

    const totalSum = useMemo(() => {
        return overdueItems.reduce((acc, item) => acc + item.amount, 0);
    }, [overdueItems]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 italic-none">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                />
                
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-2xl max-h-[85vh] bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-500/20 text-amber-500 rounded-xl">
                                <Clock size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Desglose de Interés Mora</h2>
                                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-0.5">Detalle total de deuda por mora informativa</p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Summary Bar */}
                    <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-800 flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-300">Total Pendiente:</span>
                        <span className="text-2xl font-mono font-bold text-amber-400">{formatCurrency(totalSum)}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {overdueItems.length > 0 ? (
                            <div className="space-y-3">
                                {overdueItems.map((item) => (
                                    <div 
                                        key={item.id}
                                        className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-amber-500/30 transition-all group"
                                    >
                                        <div className="flex items-center gap-4 w-full sm:w-auto">
                                            <div className="p-2.5 bg-slate-700/50 text-slate-400 rounded-xl group-hover:text-amber-400 transition-colors">
                                                <User size={18} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-bold text-slate-100 truncate">{item.clientName}</p>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                                                        <Calendar size={12} className="text-slate-600" />
                                                        {item.monthName} {item.year}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4">
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-slate-500 uppercase mb-0.5">Monto Mora</p>
                                                <p className="text-lg font-mono font-bold text-white">{formatCurrency(item.amount)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                                <Clock size={48} className="text-slate-600 mb-4" />
                                <p className="text-slate-400 font-medium tracking-tight">No hay registros de mora pendientes.</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-slate-800 bg-slate-900/50 text-center">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                            {overdueItems.length} Registros encontrados
                        </p>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default OverdueBreakdownModal;
