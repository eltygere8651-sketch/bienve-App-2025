
import React, { useState, useMemo } from 'react';
import { useDataContext } from '../../contexts/DataContext';
import { formatCurrency } from '../../services/utils';
import { 
    Plus, History, Wallet, Trash2, Calendar, Target, Edit3, Save, X, ArrowRight,
    TrendingUp, TrendingDown, BrainCircuit, ShieldCheck, Database, Info, Edit2, Loader2, Coins
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ICON_MAP, COLOR_STYLES } from './shared';

const PersonalFinanceManager: React.FC = () => {
    const { personalFunds, handleUpdateFund, handleAddFund, handleDeleteFund, handleSubmittingTransaction } = useDataContext();
    const [isAddingFund, setIsAddingFund] = useState(false);
    const [newFundName, setNewFundName] = useState('');
    const [newFundIcon, setNewFundIcon] = useState('wallet');
    const [newFundColor, setNewFundColor] = useState<keyof typeof COLOR_STYLES>('blue');
    const [newFundGoal, setNewFundGoal] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Calculator state
    const [selectedFundId, setSelectedFundId] = useState<string | null>(null);
    const [calcMonths, setCalcMonths] = useState(6);
    const [calcExtra, setCalcExtra] = useState('');

    const handleCreateFund = async () => {
        if (!newFundName.trim()) return;
        setIsSubmitting(true);
        try {
            await handleAddFund(newFundName, newFundIcon, newFundColor, parseFloat(newFundGoal) || 0);
            setNewFundName('');
            setIsAddingFund(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTransaction = async (fundId: string, type: 'deposit' | 'expense') => {
        const amountStr = window.prompt(`Monto a ${type === 'deposit' ? 'depositar' : 'gastar'} (€):`);
        if (!amountStr) return;
        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount <= 0) return;
        
        const note = window.prompt('Nota (opcional):') || '';
        await handleSubmittingTransaction(fundId, amount, type, note);
    };

    const selectedFund = useMemo(() => personalFunds?.find(f => f.id === selectedFundId), [personalFunds, selectedFundId]);
    const projection = useMemo(() => {
        if (!selectedFund) return null;
        const extra = parseFloat(calcExtra) || 0;
        const savingsPerMonth = 0; // Se podría añadir un campo 'ahorroMensual' al fondo
        const total = selectedFund.balance + (extra * calcMonths);
        const goalReached = selectedFund.goal > 0 && total >= selectedFund.goal;
        return { total, goalReached };
    }, [selectedFund, calcMonths, calcExtra]);

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight uppercase">Finanzas Personales</h2>
                    <p className="text-slate-500 text-sm font-bold tracking-widest flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
                        Sistema de Ahorro y Fondos Compartimentados
                    </p>
                </div>
                <button 
                    onClick={() => setIsAddingFund(true)}
                    className="flex items-center gap-2 px-5 py-3 bg-white text-black font-black rounded-xl hover:bg-slate-200 transition-all shadow-xl active:scale-95 italic"
                >
                    <Plus size={20} />
                    Crear Nuevo Fondo
                </button>
            </div>

            <AnimatePresence>
                {isAddingFund && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl relative overflow-hidden"
                    >
                         <div className="absolute -top-10 -right-10 opacity-5 pointer-events-none text-white">
                            <Database size={180} />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-3">
                            <Database size={24} className="text-cyan-400" />
                            Configuración de Nuevo Fondo
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nombre del Fondo</label>
                                <input 
                                    type="text" 
                                    value={newFundName}
                                    onChange={e => setNewFundName(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold focus:border-cyan-500 outline-none shadow-inner"
                                    placeholder="Ej: Vacaciones"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Icono</label>
                                <div className="grid grid-cols-5 gap-2 bg-slate-900/50 p-2 rounded-xl border border-slate-700">
                                    {Object.keys(ICON_MAP).map(key => (
                                        <button 
                                            key={key} 
                                            onClick={() => setNewFundIcon(key)}
                                            className={`p-2 rounded-lg flex items-center justify-center transition-all ${newFundIcon === key ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-900/30' : 'text-slate-500 hover:text-white'}`}
                                        >
                                            {React.createElement(ICON_MAP[key], { size: 18 })}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Color del Tema</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(Object.keys(COLOR_STYLES) as Array<keyof typeof COLOR_STYLES>).map(c => (
                                        <button 
                                            key={c}
                                            onClick={() => setNewFundColor(c)}
                                            className={`h-8 rounded-lg border transition-all ${newFundColor === c ? 'border-white scale-105 shadow-xl ring-2 ring-cyan-500/20' : 'border-transparent opacity-50'} bg-${c}-500`}
                                            style={{ backgroundColor: c === 'rose' ? '#e11d48' : c === 'emerald' ? '#10b981' : c === 'cyan' ? '#06b6d4' : c === 'purple' ? '#a855f7' : c === 'orange' ? '#f59e0b' : '#3b82f6' }}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Meta de Ahorro (€)</label>
                                <input 
                                    type="number" 
                                    value={newFundGoal}
                                    onChange={e => setNewFundGoal(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold focus:border-cyan-500 outline-none shadow-inner"
                                    placeholder="Opcional"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8 relative z-10">
                            <button 
                                onClick={handleCreateFund}
                                disabled={isSubmitting}
                                className="flex-1 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-2xl shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                                GENERAR FONDO
                            </button>
                            <button 
                                onClick={() => setIsAddingFund(false)}
                                className="px-8 py-4 bg-slate-700 hover:bg-slate-600 text-slate-300 font-black rounded-2xl transition-all"
                            >
                                CANCELAR
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {(personalFunds || []).map((fund, index) => {
                    const style = COLOR_STYLES[fund.color as keyof typeof COLOR_STYLES] || COLOR_STYLES.blue;
                    const Icon = ICON_MAP[fund.icon] || Wallet;
                    const progress = fund.goal > 0 ? Math.min(100, (fund.balance / fund.goal) * 100) : 0;

                    return (
                        <motion.div 
                            key={fund.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                            className={`bg-gradient-to-br ${style.bg} border ${style.border} p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group hover:-translate-y-2 transition-all duration-500`}
                        >
                            <div className={`absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 group-hover:scale-150 transition-all duration-1000 ${style.text}`}>
                                <Icon size={120} />
                            </div>
                            
                            <div className="flex justify-between items-start mb-8 relative z-10">
                                <div className={`p-4 bg-slate-900/40 rounded-2xl shadow-inner border border-white/5 ${style.text}`}>
                                    <Icon size={28} />
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setSelectedFundId(fund.id)}
                                        className="p-2 bg-slate-900/40 hover:bg-slate-900/60 text-slate-400 hover:text-white rounded-lg transition-colors shadow-sm"
                                        title="Proyectar ahorros"
                                    >
                                        <TrendingUp size={16} />
                                    </button>
                                    <button 
                                        onClick={() => { if(window.confirm('¿Eliminar este fondo permanentemente?')) handleDeleteFund(fund.id); }}
                                        className="p-2 bg-slate-900/40 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition-colors shadow-sm"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="relative z-10">
                                <h3 className="text-xl font-black text-white mb-1 uppercase tracking-tight">{fund.name}</h3>
                                <p className="text-4xl font-mono font-bold text-white mb-6 tracking-tighter">{formatCurrency(fund.balance)}</p>
                                
                                {fund.goal > 0 && (
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                            <span className="text-slate-300">Progreso del Objetivo</span>
                                            <span className={style.text}>{progress.toFixed(0)}%</span>
                                        </div>
                                        <div className="w-full h-3 bg-slate-900/60 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${progress}%` }}
                                                transition={{ duration: 1, delay: 0.5 }}
                                                className={`h-full bg-gradient-to-r ${style.bar} shadow-lg`}
                                            />
                                        </div>
                                        <div className="flex justify-between text-[9px] text-slate-400 font-bold uppercase">
                                            <span>Meta: {formatCurrency(fund.goal)}</span>
                                            <span>Faltan: {formatCurrency(Math.max(0, fund.goal - fund.balance))}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-8 pt-6 border-t border-white/5 grid grid-cols-2 gap-4 relative z-10">
                                <button 
                                    onClick={() => handleTransaction(fund.id, 'deposit')}
                                    className={`py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md ${style.btn} text-white`}
                                >
                                    <Plus size={14} /> Depositar
                                </button>
                                <button 
                                    onClick={() => handleTransaction(fund.id, 'expense')}
                                    className="py-3 px-4 bg-slate-900/60 hover:bg-slate-900 text-rose-400 border border-white/10 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md"
                                >
                                    <TrendingDown size={14} /> Gastar
                                </button>
                            </div>

                            {fund.transactions && fund.transactions.length > 0 && (
                                <div className="mt-6 pt-4 relative z-10">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <History size={12} /> Últimos Movimientos
                                    </h4>
                                    <div className="space-y-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                                        {fund.transactions.slice(-3).reverse().map(t => (
                                            <div key={t.id} className="flex justify-between items-center bg-slate-900/30 p-2 rounded-lg border border-white/5">
                                                <div className="flex flex-col">
                                                    <span className={`text-[10px] font-bold ${t.type === 'deposit' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {t.type === 'deposit' ? '+' : '-'}{formatCurrency(t.amount)}
                                                    </span>
                                                    <span className="text-[8px] text-slate-500 uppercase">{new Date(t.date).toLocaleDateString()}</span>
                                                </div>
                                                {t.note && <span className="text-[9px] text-slate-400 italic truncate ml-2 max-w-[80px]">{t.note}</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            <AnimatePresence>
                {selectedFundId && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl"
                        onClick={() => setSelectedFundId(null)}
                    >
                        <motion.div 
                            className="bg-slate-900 border border-slate-700 w-full max-w-lg p-8 rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.5)] relative overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none text-cyan-400">
                                <TrendingUp size={140} />
                            </div>
                            
                            <div className="flex justify-between items-start mb-8 relative z-10">
                                <div>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">Proyector de Ahorro</h3>
                                    <p className="text-slate-500 text-xs font-bold tracking-widest">FONDO: {selectedFund?.name?.toUpperCase()}</p>
                                </div>
                                <button onClick={() => setSelectedFundId(null)} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition-colors shadow-inner">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-6 relative z-10">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Meses a Proyectar</label>
                                        <input 
                                            type="number" 
                                            value={calcMonths}
                                            onChange={e => setCalcMonths(parseInt(e.target.value) || 0)}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-4 text-white font-mono font-bold text-xl focus:border-cyan-500 outline-none shadow-inner"
                                            min="1"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Depósito Mensual (€)</label>
                                        <input 
                                            type="number" 
                                            value={calcExtra}
                                            onChange={e => setCalcExtra(e.target.value)}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-4 text-white font-mono font-bold text-xl focus:border-cyan-500 outline-none shadow-inner"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                <div className="p-8 bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-3xl shadow-inner group">
                                    <div className="flex justify-between items-center mb-6">
                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                           <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                                           Saldo Estimado en {calcMonths} meses
                                        </p>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter ${projection?.goalReached ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                                            {projection?.goalReached ? 'META ALCANZADA' : 'EN PROGRESO'}
                                        </span>
                                    </div>
                                    <p className="text-5xl font-mono font-bold text-white tracking-tighter group-hover:scale-105 transition-transform duration-500 origin-left">
                                        {formatCurrency(projection?.total || 0)}
                                    </p>
                                    <div className="mt-8 flex items-center justify-between border-t border-slate-800 pt-6">
                                        <div className="flex items-center gap-4">
                                            <div className="text-[11px] font-bold text-slate-500 uppercase">Balance Actual: <span className="text-slate-300 ml-1">{formatCurrency(selectedFund?.balance || 0)}</span></div>
                                            <ArrowRight size={14} className="text-slate-700" />
                                            <div className="text-[11px] font-bold text-slate-500 uppercase">Incremento: <span className="text-emerald-400 ml-1">+{formatCurrency((projection?.total || 0) - (selectedFund?.balance || 0))}</span></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5 bg-cyan-950/20 border border-cyan-500/10 rounded-2xl flex items-start gap-3">
                                    <BrainCircuit className="text-cyan-400 shrink-0 mt-0.5" size={24} />
                                    <div>
                                        <h4 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-1">Análisis Predictivo</h4>
                                        <p className="text-[11px] text-slate-400 italic leading-relaxed">
                                            "Con un esfuerzo sostenido de {formatCurrency(parseFloat(calcExtra) || 0)}/mes, alcanzarás tu meta de {formatCurrency(selectedFund?.goal || 0)} en {Math.ceil(Math.max(0, (selectedFund?.goal || 0) - (selectedFund?.balance || 0)) / (parseFloat(calcExtra) || 1))} períodos."
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PersonalFinanceManager;
