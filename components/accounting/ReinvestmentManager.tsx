
import React, { useState } from 'react';
import { useDataContext } from '../../contexts/DataContext';
import { formatCurrency } from '../../services/utils';
import { Plus, History, RefreshCw, Calendar, Trash2, Save, Loader2, CheckSquare, Square } from 'lucide-react';
import { motion } from 'motion/react';

const ReinvestmentManager: React.FC = () => {
    const { reinvestments, handleRegisterReinvestment, handleDeleteReinvestment } = useDataContext();
    const [amount, setAmount] = useState('');
    const [source, setSource] = useState<'Banco' | 'Efectivo'>('Banco');
    const [notes, setNotes] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [deductFromTreasury, setDeductFromTreasury] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const val = parseFloat(amount);
        if (isNaN(val) || val <= 0) return;

        setIsSubmitting(true);
        try {
            await handleRegisterReinvestment(val, source, notes, date, deductFromTreasury);
            setAmount('');
            setNotes('');
            setSource('Banco');
            setDeductFromTreasury(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
            <motion.div 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="bg-slate-800 p-6 rounded-2xl border border-slate-700 h-fit shadow-xl"
            >
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Plus size={20} className="text-emerald-400" />
                    Registrar Reinversión
                </h3>
                <p className="text-sm text-slate-400 mb-6 font-medium italic">
                    Registra el capital que has sacado de tus beneficios (intereses) para volver a prestarlo.
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 tracking-tight">Monto Reinvertido (€)</label>
                        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white font-bold text-lg focus:border-emerald-500 outline-none" placeholder="0.00" step="0.01" required />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 tracking-tight">Origen del Dinero</label>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setSource('Banco')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold border transition-all ${source === 'Banco' ? 'bg-blue-600/20 text-blue-400 border-blue-500/50' : 'bg-slate-700 text-slate-400 border-slate-600'}`}>Banco</button>
                            <button type="button" onClick={() => setSource('Efectivo')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold border transition-all ${source === 'Efectivo' ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/50' : 'bg-slate-700 text-slate-400 border-slate-600'}`}>Efectivo</button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 tracking-tight">Fecha</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 outline-none" required />
                    </div>
                    
                    <div onClick={() => setDeductFromTreasury(!deductFromTreasury)} className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${deductFromTreasury ? 'bg-blue-900/20 border-blue-500/30' : 'bg-slate-900 border-slate-600'}`}>
                        <div className={`mt-0.5 rounded text-white ${deductFromTreasury ? 'text-blue-400' : 'text-slate-500'}`}>
                            {deductFromTreasury ? <CheckSquare size={18} /> : <Square size={18} />}
                        </div>
                        <div>
                            <p className={`text-sm font-bold ${deductFromTreasury ? 'text-blue-200' : 'text-slate-400'}`}>Descontar del Saldo Actual</p>
                            <p className="text-[10px] text-slate-500 mt-1 leading-tight">Marca esto si el dinero sale de la caja en este momento. Desmárcalo si ya lo descontaste al crear el préstamo.</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 tracking-tight">Notas (Opcional)</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 outline-none resize-none" placeholder="Detalles..." />
                    </div>
                    <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                        {isSubmitting ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                        Guardar Registro
                    </button>
                </form>
            </motion.div>

            <motion.div 
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="lg:col-span-2 bg-slate-800 p-6 rounded-2xl border border-slate-700 flex flex-col shadow-xl"
            >
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <History size={20} className="text-slate-400" />
                        Historial de Reinversiones
                    </h3>
                    <div className="bg-slate-900 px-3 py-1 rounded-lg border border-slate-600 text-xs font-mono text-emerald-400 font-bold">
                        Total: {formatCurrency((reinvestments || []).reduce((acc, r) => acc + r.amount, 0))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                    {(!reinvestments || reinvestments.length === 0) ? (
                        <div className="text-center py-12 text-slate-500 border border-dashed border-slate-700 rounded-xl">
                            <RefreshCw size={32} className="mx-auto mb-2 opacity-20" />
                            <p className="text-sm">No hay reinversiones registradas.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {[...(reinvestments || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((record, i) => (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    key={record.id} 
                                    className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 flex justify-between items-center group hover:bg-slate-900 transition-colors shadow-sm"
                                >
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-white text-lg">{formatCurrency(record.amount)}</span>
                                            <span className={`text-[10px] uppercase px-2 py-0.5 rounded border ${record.source === 'Banco' ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' : 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'}`}>
                                                {record.source}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                            <Calendar size={12} /> {new Date(record.date).toLocaleDateString()}
                                            {record.notes && <span className="text-slate-400">• {record.notes}</span>}
                                        </div>
                                    </div>
                                    <button onClick={() => handleDeleteReinvestment(record.id)} className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Eliminar registro">
                                        <Trash2 size={16} />
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default ReinvestmentManager;
