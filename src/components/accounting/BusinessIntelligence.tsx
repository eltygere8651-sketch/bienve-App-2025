
import React, { useMemo } from 'react';
import { formatCurrency } from '../../services/utils';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { TrendingUp, Trophy, ShieldAlert, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const BusinessIntelligence: React.FC<{ allLoans: any[] }> = ({ allLoans }) => {
    const projections = useMemo(() => {
        const activeLoans = allLoans.filter(l => !l.archived && l.status !== 'Pagado');
        const months = ['Próximo Mes', 'Mes +2', 'Mes +3'];
        
        return months.map((name, i) => {
            let totalExpected = 0;
            activeLoans.forEach(loan => {
                const interest = loan.remainingCapital * 0.08;
                let capitalRepayment = 0;
                if (loan.term > 0) {
                    capitalRepayment = loan.initialCapital / loan.term;
                }
                totalExpected += interest + Math.min(capitalRepayment, loan.remainingCapital);
            });
            return { name, total: totalExpected };
        });
    }, [allLoans]);

    const clientStats = useMemo(() => {
        const clients: Record<string, { name: string, loans: any[], score: number }> = {};
        allLoans.forEach(loan => {
            if (!clients[loan.clientId]) {
                clients[loan.clientId] = { name: loan.clientName, loans: [], score: 70 };
            }
            clients[loan.clientId].loans.push(loan);
        });

        return Object.values(clients).map(c => {
            let score = 70;
            let paidCount = 0;
            let overdueCount = 0;
            let totalInterest = 0;
            let totalPayments = 0;

            c.loans.forEach(l => {
                if (l.status === 'Pagado') paidCount++;
                if (l.status === 'Vencido') overdueCount++;
                totalInterest += l.totalInterestPaid || 0;
                totalPayments += l.paymentHistory?.length || 0;
            });

            score += (paidCount * 10);
            score -= (overdueCount * 20);
            score += Math.min(15, totalPayments * 0.5);
            const avgInterest = totalInterest / c.loans.length;
            if (avgInterest > 500) score += 5;

            return {
                ...c,
                score: Math.min(100, Math.max(0, score)),
                paidCount,
                overdueCount,
                totalLoans: c.loans.length
            };
        }).sort((a, b) => b.score - a.score);
    }, [allLoans]);

    const topClients = clientStats.slice(0, 5);
    const riskyClients = clientStats.filter(c => c.score < 50).slice(0, 5);

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 pb-12"
        >
            <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none text-indigo-400">
                    <TrendingUp size={160} />
                </div>
                <div className="flex items-center gap-3 mb-6 relative z-10">
                    <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl shadow-lg shadow-indigo-900/20">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white tracking-tight">Proyección de Flujo de Caja</h3>
                        <p className="text-sm text-slate-400 font-medium">Análisis predictivo de entradas para los próximos 90 días.</p>
                    </div>
                </div>

                <div className="h-64 w-full relative z-10">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={projections}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(value) => `${value}€`} />
                            <Tooltip 
                                cursor={{ fill: '#1e293b' }}
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
                                formatter={(value: number) => [formatCurrency(value), 'Proyección']}
                            />
                            <Bar dataKey="total" radius={[6, 6, 0, 0]} fill="#6366f1">
                                {projections.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#818cf8' : index === 1 ? '#6366f1' : '#4f46e5'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <motion.div 
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-xl hover:border-emerald-500/20 transition-colors"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl shadow-inner">
                            <Trophy size={22} />
                        </div>
                        <h3 className="text-lg font-bold text-white uppercase tracking-wider">Top Clientes de Confianza</h3>
                    </div>

                    <div className="space-y-4">
                        {topClients.map((client, idx) => (
                            <motion.div 
                                key={idx}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + (idx * 0.1) }}
                                className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-700 hover:border-emerald-500/30 transition-all hover:bg-slate-900 group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-emerald-400 font-bold border border-slate-700 group-hover:bg-emerald-500 group-hover:text-white transition-colors shadow-inner">
                                        #{idx + 1}
                                    </div>
                                    <div>
                                        <p className="font-bold text-white group-hover:text-emerald-500 transition-colors">{client.name}</p>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{client.totalLoans} Préstamos • {client.paidCount} Pagados</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-xl font-bold ${client.score > 80 ? 'text-emerald-400' : 'text-blue-400'}`}>
                                        {client.score}
                                    </div>
                                    <p className="text-[9px] text-slate-500 uppercase font-black">Score Confianza</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                <motion.div 
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-xl hover:border-rose-500/20 transition-colors"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl shadow-inner">
                            <ShieldAlert size={22} />
                        </div>
                        <h3 className="text-lg font-bold text-white uppercase tracking-wider">Cartera en Riesgo</h3>
                    </div>

                    <AnimatePresence mode="wait">
                        {riskyClients.length === 0 ? (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-12 text-slate-500"
                            >
                                <ShieldCheck size={56} className="mx-auto mb-4 opacity-10 text-emerald-500" />
                                <p className="text-sm font-bold uppercase tracking-widest">Sin amenazas detectadas</p>
                                <p className="text-xs mt-1 text-slate-600">Todos los clientes mantienen scores saludables.</p>
                            </motion.div>
                        ) : (
                            <div className="space-y-4">
                                {riskyClients.map((client, idx) => (
                                    <motion.div 
                                        key={idx}
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.3 + (idx * 0.1) }}
                                        className="flex items-center justify-between p-4 bg-rose-900/10 rounded-xl border border-rose-500/20 hover:bg-rose-900/20 transition-colors"
                                    >
                                        <div>
                                            <p className="font-bold text-rose-100">{client.name}</p>
                                            <p className="text-[10px] text-rose-400/80 uppercase font-bold">{client.overdueCount} Incumplimientos Detectados</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-bold text-rose-400">{client.score}</p>
                                            <p className="text-[9px] text-rose-500 uppercase font-black tracking-tighter">Nivel Crítico</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </AnimatePresence>

                    <div className="mt-8 p-5 bg-slate-900/40 rounded-2xl border border-slate-700/50 shadow-inner group">
                        <div className="flex items-center gap-2 mb-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                           <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Terminal Inteligente v1.0</h4>
                        </div>
                        <p className="text-[11px] text-slate-300 italic leading-relaxed font-medium">
                            "Analizando patrones: {riskyClients.length > 0 ? `El ${((riskyClients.length / clientStats.length) * 100).toFixed(0)}% de tu base de clientes presenta anomalías.` : 'Cartera estable.'} Se recomienda {riskyClients.length > 0 ? 'limitar nuevos desembolsos a clientes con score < 55.' : 'continuar reinversión en el Top 3 para flujo de caja óptimo.'}"
                        </p>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default BusinessIntelligence;
