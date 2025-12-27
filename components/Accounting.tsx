
import React, { useMemo, useState } from 'react';
import { useDataContext } from '../contexts/DataContext';
import { formatCurrency } from '../services/utils';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
    PieChart, Pie, Cell 
} from 'recharts';
import { TrendingUp, DollarSign, PieChart as PieIcon, Wallet, BarChart3, Coins, ArrowRight, PiggyBank, Landmark, AlertTriangle, CheckCircle, XCircle, Info, Lock, ShieldCheck, Scale } from 'lucide-react';

const KPICard: React.FC<{ title: string, value: string, subtext?: string, icon: any, color: string }> = ({ title, value, subtext, icon: Icon, color }) => (
    <div className="bg-slate-800/60 border border-slate-700 p-6 rounded-2xl flex flex-col justify-between backdrop-blur-md relative overflow-hidden group hover:-translate-y-1 transition-transform">
        <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-500 text-${color}-400`}>
            <Icon size={64} />
        </div>
        <div>
            <div className={`flex items-center gap-2 text-${color}-400 mb-2`}>
                <Icon size={20} />
                <span className="text-sm font-bold uppercase tracking-wider">{title}</span>
            </div>
            <h3 className="text-3xl font-heading font-bold text-white mb-1">{value}</h3>
            {subtext && <p className="text-xs text-slate-400">{subtext}</p>}
        </div>
    </div>
);

interface ProfitsProps {
    totalInvested: number;
    totalRecoveredCapital: number;
    totalInterestEarned: number;
    overdueAmount: number;
}

const ProfitsCalculator: React.FC<ProfitsProps> = ({ totalInvested, totalRecoveredCapital, totalInterestEarned, overdueAmount }) => {
    // REGLA DE ORO: Total Dinero Entrado (Capital + Interés) vs Total Dinero Salido (Capital Prestado)
    const totalCashIn = totalRecoveredCapital + totalInterestEarned;
    const netPosition = totalCashIn - totalInvested;
    const isBreakEvenReached = netPosition > 0;
    
    // Cálculo de "Ganancia Real Segura"
    // Incluso si recuperaste el capital, si tienes mucha deuda vencida, esa deuda se come tu ganancia futura.
    const safeDistributableProfit = Math.max(0, netPosition - overdueAmount);
    
    // UI State
    const [withdrawalPercentage, setWithdrawalPercentage] = useState(0); 
    const withdrawAmount = safeDistributableProfit * (withdrawalPercentage / 100);

    const progressPercent = Math.min(100, (totalCashIn / totalInvested) * 100);

    return (
        <div className="space-y-6 animate-fade-in">
            
            {/* Header Section */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-6 rounded-2xl shadow-xl">
                <div className="flex flex-col md:flex-row gap-6 justify-between items-start">
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl ${isBreakEvenReached ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                            {isBreakEvenReached ? <Scale size={32} /> : <Lock size={32} />}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Análisis de Retorno de Inversión (ROI)</h2>
                            <p className="text-slate-400 text-sm mt-1 max-w-lg">
                                Aplicando la <strong>Regla de Oro</strong>: No retires ganancias hasta que tu flujo de caja haya cubierto tu inversión inicial.
                            </p>
                        </div>
                    </div>
                    
                    <div className="text-right bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                        <p className="text-xs text-slate-500 uppercase font-bold">Posición Neta Actual</p>
                        <p className={`text-2xl font-mono font-bold ${netPosition >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {netPosition >= 0 ? '+' : ''}{formatCurrency(netPosition)}
                        </p>
                    </div>
                </div>

                {/* Progress Bar To Break Even */}
                <div className="mt-8">
                    <div className="flex justify-between text-sm mb-2 font-medium">
                        <span className="text-slate-400">Progreso Recuperación Capital</span>
                        <span className={isBreakEvenReached ? "text-emerald-400" : "text-amber-400"}>{progressPercent.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-4 bg-slate-700 rounded-full overflow-hidden border border-slate-600 relative">
                        {/* Marker for Break Even */}
                        <div className="absolute top-0 bottom-0 w-0.5 bg-white/30 z-10 left-[100%]" style={{ left: '100%' }}></div>
                        <div 
                            className={`h-full transition-all duration-1000 ${isBreakEvenReached ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-600 to-amber-400'}`} 
                            style={{ width: `${progressPercent}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>$0</span>
                        <span>Meta: {formatCurrency(totalInvested)} (Invertido)</span>
                    </div>
                </div>
            </div>

            {/* Decision Engine */}
            {!isBreakEvenReached ? (
                // SCENARIO 1: STILL RECOVERING (LOCKED)
                <div className="bg-red-900/10 border border-red-500/20 p-6 rounded-2xl flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                    <div className="p-4 bg-red-500/10 rounded-full text-red-400 animate-pulse">
                        <AlertTriangle size={40} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-red-200 mb-2">Fase de Acumulación: NO RETIRAR</h3>
                        <p className="text-slate-300 text-sm mb-4">
                            Aún no has recuperado tu capital inicial. Todo el dinero que entra (capital + intereses) debe reinvertirse para cubrir el dinero que salió de tu bolsillo.
                        </p>
                        <div className="bg-slate-900/50 p-4 rounded-xl inline-block border border-red-500/20">
                            <p className="text-xs text-slate-400 uppercase">Te falta recuperar</p>
                            <p className="text-xl font-bold text-white">{formatCurrency(Math.abs(netPosition))}</p>
                        </div>
                    </div>
                </div>
            ) : (
                // SCENARIO 2: PROFITABLE (UNLOCKED)
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-slate-800 border border-slate-700 p-6 rounded-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <ShieldCheck className="text-emerald-400" size={24} />
                            <h3 className="text-lg font-bold text-white">Calculadora de Dividendos Seguros</h3>
                        </div>

                        {safeDistributableProfit <= 0 ? (
                             <div className="p-4 bg-amber-900/20 border border-amber-500/30 rounded-xl text-amber-200 text-sm flex items-start gap-3">
                                <AlertTriangle className="shrink-0 mt-0.5" />
                                <div>
                                    <strong>Precaución:</strong> Aunque has recuperado tu capital, tienes deudas vencidas ({formatCurrency(overdueAmount)}) que superan tu ganancia libre. Se recomienda usar el excedente para cubrir estas posibles pérdidas antes de retirar.
                                </div>
                             </div>
                        ) : (
                            <>
                                <div className="mb-6">
                                    <label className="block text-sm font-bold text-slate-300 mb-2">
                                        ¿Cuánto quieres pagarte? ({withdrawalPercentage}%)
                                    </label>
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="100" 
                                        step="10"
                                        value={withdrawalPercentage}
                                        onChange={(e) => setWithdrawalPercentage(parseInt(e.target.value))}
                                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                    />
                                    <div className="flex justify-between mt-2 text-xs text-slate-500">
                                        <span>Reinvertir Todo</span>
                                        <span>Retirar Máximo Seguro</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-emerald-900/20 border border-emerald-500/30 p-4 rounded-xl">
                                        <p className="text-xs text-emerald-400 font-bold uppercase mb-1">A tu Bolsillo</p>
                                        <p className="text-2xl font-bold text-white">{formatCurrency(withdrawAmount)}</p>
                                    </div>
                                    <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl">
                                        <p className="text-xs text-blue-400 font-bold uppercase mb-1">Reinvertir en Negocio</p>
                                        <p className="text-2xl font-bold text-white">{formatCurrency(safeDistributableProfit - withdrawAmount)}</p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl flex flex-col justify-center space-y-4 text-sm">
                        <h4 className="font-bold text-white border-b border-slate-700 pb-2">Desglose de Lógica</h4>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Capital Invertido:</span>
                            <span className="text-slate-200">{formatCurrency(totalInvested)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Total Recuperado:</span>
                            <span className="text-emerald-400">+{formatCurrency(totalCashIn)}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-700 pt-2">
                            <span className="text-slate-300">Posición Neta:</span>
                            <span className="text-white font-bold">{formatCurrency(netPosition)}</span>
                        </div>
                        <div className="flex justify-between text-red-300">
                            <span className="flex items-center gap-1"><AlertTriangle size={12}/> Reserva Riesgo (Vencido):</span>
                            <span>-{formatCurrency(overdueAmount)}</span>
                        </div>
                        <div className="bg-slate-900 p-3 rounded-lg flex justify-between items-center mt-2">
                            <span className="text-emerald-400 font-bold uppercase text-xs">Disponible Real:</span>
                            <span className="text-xl font-bold text-white">{formatCurrency(Math.max(0, netPosition - overdueAmount))}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const Accounting: React.FC = () => {
    const { loans, archivedLoans } = useDataContext();
    const [activeTab, setActiveTab] = useState<'global' | 'profits'>('global');

    const allLoans = useMemo(() => [...loans, ...archivedLoans], [loans, archivedLoans]);

    const stats = useMemo(() => {
        let totalInvested = 0;
        let totalRecoveredCapital = 0;
        let totalInterestEarned = 0;
        let currentOutstanding = 0;
        let forecastedMonthlyIncome = 0;
        let overdueAmount = 0;

        allLoans.forEach(loan => {
            const initial = loan.initialCapital || loan.amount;
            totalInvested += initial;
            
            // Calculate active debts
            if (!loan.archived && loan.status !== 'Pagado') {
                currentOutstanding += loan.remainingCapital;
                forecastedMonthlyIncome += loan.remainingCapital * 0.08;
                
                if (loan.status === 'Vencido') {
                    overdueAmount += loan.remainingCapital;
                }
            }

            totalRecoveredCapital += (loan.totalCapitalPaid || 0);
            totalInterestEarned += (loan.totalInterestPaid || 0);
        });

        return {
            totalInvested,
            totalRecoveredCapital,
            totalInterestEarned,
            currentOutstanding,
            forecastedMonthlyIncome,
            overdueAmount
        };
    }, [allLoans]);

    // Data for Monthly Cash Flow Chart
    const monthlyData = useMemo(() => {
        const data: Record<string, { name: string, capital: number, interes: number, total: number }> = {};

        allLoans.forEach(loan => {
            if (loan.paymentHistory) {
                loan.paymentHistory.forEach(payment => {
                    const date = new Date(payment.date);
                    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    const label = date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });

                    if (!data[key]) {
                        data[key] = { name: label, capital: 0, interes: 0, total: 0 };
                    }
                    data[key].capital += payment.capitalPaid;
                    data[key].interes += payment.interestPaid;
                    data[key].total += payment.amount;
                });
            }
        });

        // Convert to array and sort chronologically
        return Object.entries(data)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([_, val]) => val)
            .slice(-12); // Last 12 months
    }, [allLoans]);

    // Data for Pie Chart (Distribution)
    const distributionData = [
        { name: 'Capital Recuperado', value: stats.totalRecoveredCapital, color: '#3b82f6' }, // blue-500
        { name: 'Interés (Ganancia)', value: stats.totalInterestEarned, color: '#10b981' }, // emerald-500
        { name: 'Pendiente de Cobro', value: stats.currentOutstanding, color: '#ef4444' }, // red-500
    ];

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-heading font-bold text-white flex items-center gap-3">
                        <PieIcon className="text-primary-400" size={32} />
                        Contabilidad
                    </h1>
                    <p className="text-slate-400 mt-1">Análisis financiero y gestión de utilidades.</p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-700 space-x-4 mb-6">
                <button
                    onClick={() => setActiveTab('global')}
                    className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'global' ? 'border-primary-500 text-primary-400' : 'border-transparent text-slate-400 hover:text-white'}`}
                >
                    <BarChart3 size={16} /> Visión Global
                </button>
                <button
                    onClick={() => setActiveTab('profits')}
                    className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'profits' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-white'}`}
                >
                    <Coins size={16} /> Mis Ganancias
                    <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded ml-1 animate-pulse">Nuevo</span>
                </button>
            </div>

            {activeTab === 'profits' ? (
                <ProfitsCalculator 
                    totalInvested={stats.totalInvested}
                    totalRecoveredCapital={stats.totalRecoveredCapital}
                    totalInterestEarned={stats.totalInterestEarned} 
                    overdueAmount={stats.overdueAmount}
                />
            ) : (
                <>
                    {/* KPI Cards - Responsive Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        <KPICard 
                            title="Capital Prestado" 
                            value={formatCurrency(stats.totalInvested)} 
                            subtext="Total histórico acumulado"
                            icon={Wallet} 
                            color="blue" 
                        />
                        <KPICard 
                            title="Ganancia Neta" 
                            value={formatCurrency(stats.totalInterestEarned)} 
                            subtext="Intereses cobrados efectivamente"
                            icon={TrendingUp} 
                            color="emerald" 
                        />
                        <KPICard 
                            title="Proyección Mes" 
                            value={formatCurrency(stats.forecastedMonthlyIncome)} 
                            subtext="Ingreso esperado (8% de deuda)"
                            icon={BarChart3} 
                            color="amber" 
                        />
                        <KPICard 
                            title="Cartera Pendiente" 
                            value={formatCurrency(stats.currentOutstanding)} 
                            subtext="Deuda activa por cobrar"
                            icon={DollarSign} 
                            color="red" 
                        />
                    </div>

                    {/* Charts Section - Flexible layout */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        
                        {/* Monthly Cash Flow */}
                        <div className="xl:col-span-2 bg-slate-800 p-4 sm:p-6 rounded-2xl border border-slate-700 shadow-lg overflow-hidden">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <TrendingUp size={20} className="text-primary-400" />
                                Flujo de Caja Mensual (Ingresos)
                            </h3>
                            <div className="h-[250px] sm:h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `€${val}`} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                                            formatter={(value: number) => formatCurrency(value)}
                                        />
                                        <Legend wrapperStyle={{fontSize: '12px', paddingTop: '10px'}}/>
                                        <Bar dataKey="capital" name="Capital Amortizado" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
                                        <Bar dataKey="interes" name="Interés (Ganancia)" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Distribution Pie */}
                        <div className="bg-slate-800 p-4 sm:p-6 rounded-2xl border border-slate-700 shadow-lg flex flex-col overflow-hidden">
                            <h3 className="text-lg font-bold text-white mb-6">Distribución de Activos</h3>
                            <div className="flex-1 min-h-[250px] relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={distributionData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {distributionData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                             contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                                             formatter={(value: number) => formatCurrency(value)}
                                        />
                                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{fontSize: '12px'}}/>
                                    </PieChart>
                                </ResponsiveContainer>
                                {/* Center Text */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                                    <div className="text-center">
                                        <p className="text-xs text-slate-400 font-bold uppercase">Total Movido</p>
                                        <p className="text-lg sm:text-xl font-bold text-white">{formatCurrency(stats.totalInvested + stats.totalInterestEarned)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Table - Horizontal Scroll enabled for Mobile */}
                    <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-lg overflow-hidden">
                        <div className="p-6 border-b border-slate-700">
                            <h3 className="text-lg font-bold text-white">Desglose por Préstamo</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-slate-900/50 text-slate-400 uppercase font-bold text-xs">
                                    <tr>
                                        <th className="px-6 py-4">Cliente</th>
                                        <th className="px-6 py-4">Fecha Inicio</th>
                                        <th className="px-6 py-4">Capital Inicial</th>
                                        <th className="px-6 py-4 text-emerald-400">Interés Ganado</th>
                                        <th className="px-6 py-4 text-blue-400">Capital Amortizado</th>
                                        <th className="px-6 py-4 text-red-400">Deuda Pendiente</th>
                                        <th className="px-6 py-4 text-right">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {allLoans.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()).map(loan => (
                                        <tr key={loan.id} className="hover:bg-slate-700/30 transition-colors">
                                            <td className="px-6 py-4 font-bold text-white">{loan.clientName}</td>
                                            <td className="px-6 py-4 text-slate-400">{new Date(loan.startDate).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-slate-300 font-mono">{formatCurrency(loan.initialCapital || loan.amount)}</td>
                                            <td className="px-6 py-4 text-emerald-400 font-mono font-bold">+{formatCurrency(loan.totalInterestPaid)}</td>
                                            <td className="px-6 py-4 text-blue-400 font-mono">{formatCurrency(loan.totalCapitalPaid)}</td>
                                            <td className="px-6 py-4 text-red-400 font-mono">{formatCurrency(loan.remainingCapital)}</td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                                    loan.status === 'Pagado' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                                                    loan.status === 'Vencido' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                                    'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                                }`}>
                                                    {loan.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Accounting;
