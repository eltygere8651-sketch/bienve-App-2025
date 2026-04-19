
import React, { useState } from 'react';
import { formatCurrency } from '../../services/utils';
import { Landmark, Banknote, Edit2, CheckSquare, Save, X, RefreshCw, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { setDocument } from '../../services/firebaseService';
import { TABLE_NAMES } from '../../constants';
import { useAppContext } from '../../contexts/AppContext';

interface TreasuryConfig {
    bankName: string;
    bankBalance: number;
    cashBalance: number;
}

interface TreasuryManagerProps {
    settings: TreasuryConfig;
    onRecalculate: () => void;
}

const TreasuryManager: React.FC<TreasuryManagerProps> = ({ settings, onRecalculate }) => {
    const { showToast } = useAppContext();
    const [isEditing, setIsEditing] = useState(false);
    const [tempSettings, setTempSettings] = useState(settings);

    const handleSave = async () => {
        try {
            await setDocument(TABLE_NAMES.TREASURY, 'main', tempSettings);
            setIsEditing(false);
            showToast('Tesorería sincronizada.', 'success');
        } catch (e: any) {
            showToast('Error: ' + e.message, 'error');
        }
    };

    return (
        <div className="bg-slate-800/40 border border-slate-700 p-8 rounded-3xl backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none text-slate-400 group-hover:scale-110 transition-transform duration-1000">
                <Landmark size={120} />
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 relative z-10">
                <div>
                    <h3 className="text-2xl font-black text-white tracking-tight uppercase">Arqueo de Caja y Bancos</h3>
                    <div className="text-slate-500 text-sm font-bold tracking-widest flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        Disponibilidad de Capital en Tiempo Real
                    </div>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => { setTempSettings(settings); setIsEditing(true); }}
                        className="p-3 bg-slate-900 border border-slate-700 text-slate-400 hover:text-white rounded-xl transition-all hover:border-blue-500 shadow-lg"
                        title="Modificar saldo manualmente"
                    >
                        <Edit2 size={18} />
                    </button>
                    <button 
                        onClick={onRecalculate}
                        className="p-3 bg-slate-900 border border-slate-700 text-slate-400 hover:text-white rounded-xl transition-all hover:border-blue-500 shadow-lg group/btn"
                        title="Recalcular desde historial"
                    >
                        <RefreshCw size={18} className="group-hover/btn:rotate-180 transition-transform duration-500" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                <div className="bg-slate-900/60 p-8 rounded-[2rem] border border-white/5 shadow-inner hover:border-blue-500/20 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
                            <Landmark size={24} />
                        </div>
                        <span className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">{settings.bankName || 'Banco Principal'}</span>
                    </div>
                    <p className="text-5xl font-mono font-bold text-white tracking-tighter">{formatCurrency(settings.bankBalance)}</p>
                </div>

                <div className="bg-slate-900/60 p-8 rounded-[2rem] border border-white/5 shadow-inner hover:border-emerald-500/20 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
                            <Banknote size={24} />
                        </div>
                        <span className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Caja / Efectivo</span>
                    </div>
                    <p className="text-5xl font-mono font-bold text-white tracking-tighter">{formatCurrency(settings.cashBalance)}</p>
                </div>
            </div>

            <div className="mt-8 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-[11px] font-bold uppercase tracking-widest relative z-10">
                <div className="flex items-center gap-4">
                    <div className="text-slate-500">Saldo Consolidado: <span className="text-white text-base ml-2">{formatCurrency(settings.bankBalance + settings.cashBalance)}</span></div>
                </div>
                <div className="p-3 bg-blue-900/10 border border-blue-500/20 rounded-xl text-blue-400/80 flex items-center gap-3 normal-case tracking-normal font-medium max-w-md italic shadow-inner">
                    <Info size={16} className="shrink-0" />
                    El sistema detecta automáticamente desvíos basándose en el historial de intereses vs pagos realizados.
                </div>
            </div>

            <AnimatePresence>
                {isEditing && (
                    <motion.div 
                        initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                        animate={{ opacity: 1, backdropFilter: 'blur(10px)' }}
                        exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50"
                        onClick={() => setIsEditing(false)}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-slate-900 border border-slate-700 w-full max-w-md p-8 rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.6)] relative overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                             <div className="absolute -top-10 -right-10 opacity-5 pointer-events-none text-white">
                                <Landmark size={140} />
                            </div>

                            <div className="flex justify-between items-start mb-8 relative z-10">
                                <div>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Ajuste Manual</h3>
                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Sincronización forzada de saldos</p>
                                </div>
                                <button onClick={() => setIsEditing(false)} className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition-all shadow-inner">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-6 relative z-10">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nombre Institución</label>
                                    <input 
                                        type="text" 
                                        value={tempSettings.bankName} 
                                        onChange={e => setTempSettings({...tempSettings, bankName: e.target.value})}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-5 py-4 text-white font-bold focus:border-blue-500 outline-none shadow-inner" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Saldo en Banco (€)</label>
                                    <input 
                                        type="number" 
                                        value={tempSettings.bankBalance} 
                                        onChange={e => setTempSettings({...tempSettings, bankBalance: parseFloat(e.target.value) || 0})}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-5 py-4 text-white font-mono font-bold text-xl focus:border-blue-500 outline-none shadow-inner" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Saldo en Efectivo (€)</label>
                                    <input 
                                        type="number" 
                                        value={tempSettings.cashBalance} 
                                        onChange={e => setTempSettings({...tempSettings, cashBalance: parseFloat(e.target.value) || 0})}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-5 py-4 text-white font-mono font-bold text-xl focus:border-emerald-500 outline-none shadow-inner" 
                                    />
                                </div>
                                <button 
                                    onClick={handleSave}
                                    className="w-full py-5 mt-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 group"
                                >
                                    <Save size={20} className="group-hover:scale-110 transition-transform" />
                                    SINCRONIZAR SALDO
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TreasuryManager;
