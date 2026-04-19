
import React, { useState } from 'react';
import { formatCurrency } from '../../services/utils';
import { Scale, Lock, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProfitsProps {
    totalInvested: number;
    totalRecoveredCapital: number;
    totalInterestEarned: number;
    overdueAmount: number;
    totalReinvested: number;
}

const ProfitsCalculator: React.FC<ProfitsProps> = ({ totalInvested, totalRecoveredCapital, totalInterestEarned, overdueAmount, totalReinvested }) => {
    const totalCashIn = totalRecoveredCapital + totalInterestEarned;
    const netPosition = totalCashIn - totalInvested;
    const isBreakEvenReached = netPosition > 0;
    const availableForWithdrawal = Math.max(0, netPosition - overdueAmount - totalReinvested);
    const [withdrawalPercentage, setWithdrawalPercentage] = useState(0); 
    const withdrawAmount = availableForWithdrawal * (withdrawalPercentage / 100);
    const progressPercent = totalInvested > 0 ? Math.min(100, (totalCashIn / totalInvested) * 100) : 0;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 animate-fade-in"
        >
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-6 rounded-2xl shadow-xl relative overflow-hidden">
                <div className="absolute -top-10 -right-10 opacity-5 pointer-events-none text-white">
                    <Scale size={240} />
                </div>
                <div className="flex flex-col md:flex-row gap-6 justify-between items-start relative z-10">
                    <div className="flex items-start gap-4">
                        <div className={`p-4 rounded-2xl shadow-lg ${isBreakEvenReached ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                            {isBreakEvenReached ? <Scale size={32} /> : <Lock size={32} />}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Análisis de Retorno de Inversión (ROI)</h2>
                            <p className="text-slate-400 text-sm mt-1 max-w-lg leading-relaxed font-medium">
                                Aplicando la <strong className="text-white">Regla de Oro</strong>: No retires ganancias hasta que tu flujo de caja haya cubierto tu inversión inicial.
                            </p>
                        </div>
                    </div>
                    
                    <div className="text-right bg-slate-900/60 p-4 rounded-xl border border-white/5 backdrop-blur-sm">
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Posición Neta Actual</p>
                        <p className={`text-3xl font-mono font-bold ${netPosition >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {netPosition >= 0 ? '+' : ''}{formatCurrency(netPosition)}
                        </p>
                    </div>
                </div>

                <div className="mt-8 relative z-10">
                    <div className="flex justify-between text-xs mb-2 font-black uppercase tracking-wider">
                        <span className="text-slate-400">Recuperación de Capital Semilla</span>
                        <span className={isBreakEvenReached ? "text-emerald-400" : "text-amber-400"}>{progressPercent.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-4 bg-slate-900 rounded-full overflow-hidden border border-white/5 relative shadow-inner">
                        <div className="absolute top-0 bottom-0 w-0.5 bg-white/20 z-10 left-[100%]" style={{ left: '100%' }}></div>
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 1.5, ease: "circOut" }}
                            className={`h-full transition-all ${isBreakEvenReached ? 'bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-gradient-to-r from-amber-600 to-amber-400'}`} 
                        />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1.5 font-bold uppercase">
                        <span>Línea Base</span>
                        <span>Meta Amortización: {formatCurrency(totalInvested)}</span>
                    </div>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {!isBreakEvenReached ? (
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-red-900/10 border border-red-500/20 p-8 rounded-3xl flex flex-col md:flex-row items-center gap-8 text-center md:text-left shadow-2xl"
                    >
                        <div className="p-5 bg-red-500/10 rounded-full text-red-500 animate-pulse border border-red-500/20">
                            <AlertTriangle size={48} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-2xl font-black text-rose-200 mb-2 uppercase tracking-tight">Zona de Riesgo: Bloqueo de Retiros</h3>
                            <p className="text-slate-300 text-sm mb-5 font-medium leading-relaxed">
                                Tu capital inicial aún no está a salvo. Todo retorno debe considerarse capital de recuperación, no ganancia. 
                                <span className="text-white"> Invertir en esta fase es crítico para la supervivencia del modelo.</span>
                            </p>
                            <div className="bg-slate-900 border border-red-500/20 p-5 rounded-2xl inline-block shadow-inner">
                                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Déficit de Amortización</p>
                                <p className="text-3xl font-mono font-bold text-white">{formatCurrency(Math.abs(netPosition))}</p>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                    >
                        <div className="lg:col-span-2 bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-xl">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
                                    <ShieldCheck size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-white tracking-tight">Matriz de Distribución de Dividendos</h3>
                            </div>

                            {availableForWithdrawal <= 0 ? (
                                <div className="p-6 bg-amber-900/10 border border-amber-500/30 rounded-2xl text-amber-200 text-sm flex items-start gap-4">
                                    <AlertTriangle className="shrink-0 mt-0.5 text-amber-500" size={24} />
                                    <div>
                                        <strong className="text-white block mb-1">Liquidez Comprometida</strong>
                                        Punto de equilibrio alcanzado, pero el excedente líquido está actualmente atrapado en 
                                        <span className="text-white font-bold"> reinversiones de cartera</span> o <span className="text-rose-400 font-bold">cartera vencida</span>. No hay efectivo listo para retirar.
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    <div className="mb-6">
                                        <div className="flex justify-between items-center mb-3">
                                            <label className="block text-sm font-bold text-slate-300 uppercase tracking-wide">
                                                Porcentaje de Retiro ({withdrawalPercentage}%)
                                            </label>
                                            <span className="text-emerald-400 font-mono font-bold text-lg">{formatCurrency(withdrawAmount)}</span>
                                        </div>
                                        <input 
                                            type="range" 
                                            min="0" 
                                            max="100" 
                                            step="10"
                                            value={withdrawalPercentage}
                                            onChange={(e) => setWithdrawalPercentage(parseInt(e.target.value))}
                                            className="w-full h-3 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-500 border border-white/5"
                                        />
                                        <div className="flex justify-between mt-3 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                            <span>Reinversión Máxima</span>
                                            <span>Retiro Parcial</span>
                                            <span>Retiro Total</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6 pt-4">
                                        <div className="bg-emerald-900/10 border border-emerald-500/20 p-5 rounded-2xl shadow-inner group">
                                            <p className="text-[10px] text-emerald-500 font-black uppercase tracking-wider mb-2">Dividendo Personal</p>
                                            <p className="text-3xl font-mono font-bold text-white group-hover:scale-105 transition-transform origin-left">{formatCurrency(withdrawAmount)}</p>
                                            <p className="text-[10px] text-slate-500 mt-2 italic font-medium">Liquidez que sale del negocio.</p>
                                        </div>
                                        <div className="bg-blue-900/10 border border-blue-500/20 p-5 rounded-2xl shadow-inner group">
                                            <p className="text-[10px] text-blue-500 font-black uppercase tracking-wider mb-2">Escalamiento (Reinversión)</p>
                                            <p className="text-3xl font-mono font-bold text-white group-hover:scale-105 transition-transform origin-left">{formatCurrency(availableForWithdrawal - withdrawAmount)}</p>
                                            <p className="text-[10px] text-slate-500 mt-2 italic font-medium">Interés compuesto a favor.</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl flex flex-col justify-between shadow-xl relative overflow-hidden">
                             <div className="absolute -bottom-10 -right-10 opacity-5 pointer-events-none text-slate-400">
                                <RefreshCw size={180} />
                            </div>
                            
                            <div className="space-y-4 text-xs font-medium relative z-10">
                                <h4 className="font-black text-white border-b border-slate-700 pb-3 uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Balance Operativo
                                </h4>
                                <div className="flex justify-between items-center py-1">
                                    <span className="text-slate-500 uppercase text-[10px] font-bold">Inversión Base:</span>
                                    <span className="text-slate-300 font-mono">{formatCurrency(totalInvested)}</span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                    <span className="text-slate-500 uppercase text-[10px] font-bold">Retorno Acumulado:</span>
                                    <span className="text-emerald-500 font-mono">+{formatCurrency(totalCashIn)}</span>
                                </div>
                                <div className="flex justify-between items-center border-t border-slate-700/50 pt-3">
                                    <span className="text-slate-400 uppercase text-[10px] font-bold">Utilidad Bruta:</span>
                                    <span className="text-white font-mono font-bold text-sm tracking-tight">{formatCurrency(netPosition)}</span>
                                </div>
                                <div className="flex justify-between items-center text-red-400/80">
                                    <span className="flex items-center gap-1 uppercase text-[10px] font-bold"><AlertTriangle size={12}/> Provisión por Riesgo:</span>
                                    <span className="font-mono">-{formatCurrency(overdueAmount)}</span>
                                </div>
                                <div className="flex justify-between items-center text-blue-400/80">
                                    <span className="flex items-center gap-1 uppercase text-[10px] font-bold"><RefreshCw size={12}/> Dividendos Reinvertidos:</span>
                                    <span className="font-mono">-{formatCurrency(totalReinvested)}</span>
                                </div>
                            </div>

                            <div className="bg-slate-900 border border-emerald-500/20 p-5 rounded-2xl flex flex-col gap-1 mt-6 relative z-10 shadow-inner">
                                <span className="text-emerald-400 font-black uppercase text-[10px] tracking-widest mb-1">Excedente Líquido Real</span>
                                <span className="text-2xl font-mono font-bold text-white tracking-tighter leading-none">{formatCurrency(availableForWithdrawal)}</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default ProfitsCalculator;
