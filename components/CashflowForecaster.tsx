import React, { useMemo, useState } from 'react';
import { useDataContext } from '../contexts/DataContext';
import { Loan, LoanStatus } from '../types';
import { formatCurrency } from '../services/utils';
import { 
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { TrendingUp, AlertTriangle, Clock, Activity, Info, BarChart3, Settings2 } from 'lucide-react';

interface CashflowForecasterProps {
    treasurySettings: { bankBalance: number, cashBalance: number };
}

const CashflowForecaster: React.FC<CashflowForecasterProps> = ({ treasurySettings }) => {
    const { loans } = useDataContext();
    const [monthsToProject, setMonthsToProject] = useState(6);

    // Logic for forecasting next n months
    const forecastData = useMemo(() => {
        const today = new Date();
        const data = [];
        
            // Let's project 'monthsToProject' ahead
            for (let i = 0; i < monthsToProject; i++) {
                const tempDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
                const label = tempDate.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
                
                let expectedCapital = 0;
                let expectedInterest = 0;
                
                loans.forEach(loan => {
                    if (loan.status === LoanStatus.PENDING || loan.status === LoanStatus.OVERDUE) {
                        const monthsDiff = (tempDate.getFullYear() - today.getFullYear()) * 12 + (tempDate.getMonth() - today.getMonth());
                        
                        // Préstamo indefinido o por réditos
                        if (loan.term === 0) {
                            if (monthsDiff >= 0) {
                                // En indefinido, se asume que solo paga interés cada mes
                                // y no se proyecta el retorno del capital en un mes específico
                                expectedInterest += loan.monthlyPayment > 0 ? loan.monthlyPayment : (loan.remainingCapital * (loan.interestRate / 100 / 12));
                            }
                        } else {
                            // Préstamo a plazo fijo
                            const remainingMonths = Math.max(1, loan.term - loan.paymentsMade);
                            const remainingCapital = loan.remainingCapital;
                            const remainingInterest = Math.max(0, loan.totalRepayment - loan.totalCapitalPaid - loan.totalInterestPaid - remainingCapital);
                            
                            const monthlyCapital = remainingCapital / remainingMonths;
                            const monthlyInterest = remainingInterest / remainingMonths;
                            
                            if (monthsDiff >= 0 && monthsDiff < remainingMonths) {
                                expectedCapital += monthlyCapital;
                                expectedInterest += monthlyInterest;
                            }
                        }
                    }
                });

                // Adjust by risk factor if loans are overdue
            const overdueRatio = loans.filter(l => l.status === LoanStatus.OVERDUE).length / (loans.filter(l => l.status === LoanStatus.PENDING || l.status === LoanStatus.OVERDUE).length || 1);
            const confidenceAdjustment = 1 - (overdueRatio * 0.5); // Max 50% penalty to forecast
            
            data.push({
                name: label,
                ingresoEsperado: (expectedCapital + expectedInterest) * confidenceAdjustment,
                capital: expectedCapital * confidenceAdjustment,
                interes: expectedInterest * confidenceAdjustment,
                riesgoResta: (expectedCapital + expectedInterest) * (1 - confidenceAdjustment)
            });
        }
        return data;
    }, [loans, monthsToProject]);

    const totalProjected = forecastData.reduce((acc, curr) => acc + curr.ingresoEsperado, 0);
    const treasuryCurrent = treasurySettings.bankBalance + treasurySettings.cashBalance;
    const futureTreasury = treasuryCurrent + totalProjected;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-800/40 p-4 sm:p-5 rounded-xl border border-slate-700/50">
                <div className="min-w-0">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <Settings2 size={18} className="text-blue-400 shrink-0" />
                        Configuración de Proyección
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Ajusta el horizonte de tiempo para el cálculo de liquidez.</p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <label className="text-sm text-slate-300 whitespace-nowrap">Meses a proyectar:</label>
                    <input 
                        type="number"
                        min="1"
                        max="120"
                        value={monthsToProject} 
                        onChange={(e) => setMonthsToProject(Math.max(1, Number(e.target.value)))}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-base sm:text-sm outline-none focus:border-blue-500 transition-colors w-full sm:w-32"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-800/60 border border-slate-700/50 p-5 rounded-2xl relative overflow-hidden group min-w-0">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <Activity size={60} className="text-blue-400" />
                    </div>
                    <p className="text-slate-400 font-bold text-xs uppercase mb-1 truncate">Tesorería Actual</p>
                    <h3 className="text-2xl font-black text-white truncate">{formatCurrency(treasuryCurrent)}</h3>
                    <p className="text-[10px] text-slate-500 mt-1 truncate">Disponible líquido</p>
                </div>
                
                <div className="bg-slate-800/60 border border-slate-700/50 p-5 rounded-2xl relative overflow-hidden group min-w-0">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <TrendingUp size={60} className="text-emerald-400" />
                    </div>
                    <p className="text-slate-400 font-bold text-xs uppercase mb-1 truncate">Ingreso Proyectado ({monthsToProject}M)</p>
                    <h3 className="text-2xl font-black text-emerald-400 truncate">+{formatCurrency(totalProjected)}</h3>
                    <p className="text-[10px] text-slate-500 mt-1 truncate">Ajustado por índice de riesgo</p>
                </div>
                
                <div className="bg-slate-800/60 border border-primary-500/30 bg-primary-900/10 p-5 rounded-2xl relative overflow-hidden group min-w-0">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <BarChart3 size={60} className="text-primary-400" />
                    </div>
                    <p className="text-primary-300 font-bold text-xs uppercase mb-1 truncate">Caja Estimada en {monthsToProject}M</p>
                    <h3 className="text-2xl font-black text-primary-400 truncate">{formatCurrency(futureTreasury)}</h3>
                    <p className="text-[10px] text-primary-500/70 mt-1 truncate">Al cumplir la proyección</p>
                </div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 sm:p-6 min-w-0">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-6">
                    <div className="min-w-0 w-full">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2 truncate">
                            <Clock size={18} className="text-blue-400 shrink-0" />
                            <span className="truncate">Flujo de Caja Futuro ({monthsToProject} Meses)</span>
                        </h3>
                        <p className="text-xs text-slate-400 truncate mt-1">Basado en cronogramas activos y ajustado a la morosidad actual</p>
                    </div>
                    <div className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-bold whitespace-nowrap self-start">
                        <AlertTriangle size={14} />
                        Simulación
                    </div>
                </div>

                <div className="h-72 w-full mt-4 -ml-2 sm:ml-0 overflow-hidden relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={forecastData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorCapital" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorInteres" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(val) => `$${val/1000}k`} tickLine={false} axisLine={false} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.5rem', fontSize: '12px' }}
                                itemStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
                                formatter={(value: number) => formatCurrency(value)}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                            <Area type="monotone" name="Capital Retornado" dataKey="capital" stackId="1" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCapital)" />
                            <Area type="monotone" name="Interés (Ganancia)" dataKey="interes" stackId="1" stroke="#10b981" fillOpacity={1} fill="url(#colorInteres)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-4 flex gap-3 align-top">
                <Info size={20} className="text-blue-400 shrink-0 mt-0.5" />
                <div>
                    <h4 className="text-sm font-bold text-blue-400">Sobre la Proyección de Reinversión</h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        Este modelo predictivo toma en cuenta los vencimientos futuros de todos los préstamos activos.
                        Asigna una tolerancia al riesgo basada en tu porcentaje de mora actual, descontando el capital de alto riesgo.
                        Utiliza esta tabla para planificar cuánto dinero tendrás disponible mes a mes y optimizar tus futuras aprobaciones de crédito.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CashflowForecaster;
