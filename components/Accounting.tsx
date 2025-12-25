
import React, { useMemo } from 'react';
import { useDataContext } from '../contexts/DataContext';
import { formatCurrency } from '../services/utils';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
    AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, PieChart as PieIcon, Wallet, ArrowUpRight } from 'lucide-react';

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

const Accounting: React.FC = () => {
    const { loans, archivedLoans } = useDataContext();

    const allLoans = useMemo(() => [...loans, ...archivedLoans], [loans, archivedLoans]);

    const stats = useMemo(() => {
        let totalInvested = 0;
        let totalRecoveredCapital = 0;
        let totalInterestEarned = 0;
        let currentOutstanding = 0;
        let potentialTotalInterest = 0;

        allLoans.forEach(loan => {
            const initial = loan.initialCapital || loan.amount;
            totalInvested += initial;
            currentOutstanding += loan.remainingCapital;
            totalRecoveredCapital += (loan.totalCapitalPaid || 0);
            totalInterestEarned += (loan.totalInterestPaid || 0);
            
            // Calculate potential interest if all goes well (simple estimation)
            // Monthly Payment * Term - Initial Capital
            // For indefinite, we can't easily calculate total potential without a date range
            if (loan.term > 0) {
                potentialTotalInterest += (loan.monthlyPayment * loan.term) - initial;
            }
        });

        return {
            totalInvested,
            totalRecoveredCapital,
            totalInterestEarned,
            currentOutstanding,
            potentialTotalInterest
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
        <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-heading font-bold text-white flex items-center gap-3">
                        <PieIcon className="text-primary-400" size={32} />
                        Contabilidad Global
                    </h1>
                    <p className="text-slate-400 mt-1">Análisis financiero de flujos de caja y rentabilidad de cartera.</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                    title="Capital Recuperado" 
                    value={formatCurrency(stats.totalRecoveredCapital)} 
                    subtext="Retorno de inversión (Amortización)"
                    icon={ArrowUpRight} 
                    color="indigo" 
                />
                <KPICard 
                    title="Cartera Pendiente" 
                    value={formatCurrency(stats.currentOutstanding)} 
                    subtext="Deuda activa por cobrar"
                    icon={DollarSign} 
                    color="red" 
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Monthly Cash Flow */}
                <div className="lg:col-span-2 bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <TrendingUp size={20} className="text-primary-400" />
                        Flujo de Caja Mensual (Ingresos)
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `€${val}`} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                                    formatter={(value: number) => formatCurrency(value)}
                                />
                                <Legend />
                                <Bar dataKey="capital" name="Capital Amortizado" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
                                <Bar dataKey="interes" name="Interés (Ganancia)" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Distribution Pie */}
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg flex flex-col">
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
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Text */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                            <div className="text-center">
                                <p className="text-xs text-slate-400 font-bold uppercase">Total Movido</p>
                                <p className="text-xl font-bold text-white">{formatCurrency(stats.totalInvested + stats.totalInterestEarned)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-lg overflow-hidden">
                <div className="p-6 border-b border-slate-700">
                    <h3 className="text-lg font-bold text-white">Desglose por Préstamo</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
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
        </div>
    );
};

export default Accounting;
