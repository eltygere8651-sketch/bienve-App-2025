
import React, { useState } from 'react';
import { useDataContext } from '../../contexts/DataContext';
import { formatCurrency } from '../../services/utils';
import { LogOut, Loader2, History, FileDown, Share2, Calendar, Trash2, Wallet } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { downloadPdf } from '../../services/pdfService';
import { motion } from 'motion/react';

const WithdrawalManager: React.FC = () => {
    const { handleRegisterWithdrawal, handleDeleteWithdrawal, withdrawals } = useDataContext();
    const [amount, setAmount] = useState('');
    const [source, setSource] = useState<'Banco' | 'Efectivo'>('Banco');
    const [notes, setNotes] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const val = parseFloat(amount);
        if (isNaN(val) || val <= 0) return;

        setIsSubmitting(true);
        try {
            await handleRegisterWithdrawal(val, source, notes, date, 0);
            setAmount('');
            setNotes('');
            setSource('Banco');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Estás seguro de eliminar este registro? Se restaurará el saldo.')) {
            await handleDeleteWithdrawal(id);
        }
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('Historial de Pagos y Retiros', 14, 22);
        doc.setFontSize(11);
        doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 14, 30);

        const tableColumn = ["Fecha", "Monto", "Origen", "Notas"];
        const tableRows: any[] = [];
        [...withdrawals].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).forEach(record => {
            tableRows.push([
                new Date(record.date).toLocaleDateString(),
                formatCurrency(record.amount),
                record.source,
                record.notes || '-'
            ]);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            theme: 'grid',
            styles: { fontSize: 10, cellPadding: 3 },
            headStyles: { fillColor: [66, 66, 66] }
        });

        const total = withdrawals.reduce((acc, r) => acc + r.amount, 0);
        const finalY = (doc as any).lastAutoTable.finalY || 40;
        doc.text(`Total: ${formatCurrency(total)}`, 14, finalY + 10);
        downloadPdf(doc.output('blob'), `pagos_retiros_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const handleShare = async () => {
        const text = `Historial de Pagos:\n\n` + 
            withdrawals.map(w => `${new Date(w.date).toLocaleDateString()}: ${formatCurrency(w.amount)} (${w.source}) - ${w.notes || ''}`).join('\n') +
            `\n\nTotal: ${formatCurrency(withdrawals.reduce((acc, r) => acc + r.amount, 0))}`;

        if (navigator.share) {
            try { await navigator.share({ title: 'Historial de Pagos', text }); } catch (err) { console.error('Error sharing:', err); }
        } else {
            navigator.clipboard.writeText(text);
            alert('Historial copiado al portapapeles');
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
        >
            <motion.div 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="bg-slate-800 p-6 rounded-2xl border border-slate-700 h-fit shadow-xl"
            >
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <LogOut size={20} className="text-rose-400" />
                    Registrar Pago / Retiro
                </h3>
                <p className="text-xs text-slate-400 mb-4 font-medium italic">
                    Registra pagos o retiros personales. El monto se descontará automáticamente de la caja.
                </p>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 tracking-tight">Monto Total (€)</label>
                        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white font-bold text-lg focus:border-rose-500 outline-none" placeholder="0.00" step="0.01" required />
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
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-rose-500 outline-none" required />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 tracking-tight">Notas (Opcional)</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-rose-500 outline-none resize-none" placeholder="Detalles..." />
                    </div>
                    <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                        {isSubmitting ? <Loader2 className="animate-spin" /> : <LogOut size={18} />}
                        Registrar Pago
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
                        Historial de Pagos
                    </h3>
                    <div className="flex items-center gap-2">
                        <button onClick={handleExportPDF} className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg transition-colors" title="Exportar PDF"><FileDown size={18} /></button>
                        <button onClick={handleShare} className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg transition-colors" title="Compartir"><Share2 size={18} /></button>
                        <div className="bg-slate-900 px-3 py-1 rounded-lg border border-slate-600 text-xs font-mono text-rose-400 font-bold">
                            Total: {formatCurrency((withdrawals || []).reduce((acc, r) => acc + r.amount, 0))}
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                    {(!withdrawals || withdrawals.length === 0) ? (
                        <div className="text-center py-12 text-slate-500 border border-dashed border-slate-700 rounded-xl">
                            <History size={32} className="mx-auto mb-2 opacity-20" />
                            <p className="text-sm">No hay pagos registrados.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {[...(withdrawals || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((record, i) => (
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
                                            {record.peñaAmount && record.peñaAmount > 0 && (
                                                <span className="text-[10px] uppercase px-2 py-0.5 rounded border border-purple-500/30 text-purple-400 bg-purple-500/10 flex items-center gap-1">
                                                    <Wallet size={10} /> Peña: {formatCurrency(record.peñaAmount)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                            <Calendar size={12} /> {new Date(record.date).toLocaleDateString()}
                                            {record.notes && <span className="text-slate-400">• {record.notes}</span>}
                                        </div>
                                    </div>
                                    <button onClick={() => handleDelete(record.id)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Eliminar registro">
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

export default WithdrawalManager;
