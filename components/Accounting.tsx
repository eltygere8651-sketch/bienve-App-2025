
import React, { useMemo, useState, useEffect } from 'react';
import { useDataContext } from '../contexts/DataContext';
import { useAppContext } from '../contexts/AppContext';
import { formatCurrency } from '../services/utils';
import { 
    BarChart3, Coins, Umbrella, RefreshCw, Sparkles, BrainCircuit, Landmark, CreditCard,
    TrendingUp, TrendingDown, Target, Info, LayoutDashboard, Database, Download, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { subscribeToCollection } from '../services/firebaseService';
import { TABLE_NAMES } from '../constants';

// Modular Components
import KPICard from '@/components/accounting/KPICard';
import TreasuryManager from '@/components/accounting/TreasuryManager';
import WithdrawalManager from '@/components/accounting/WithdrawalManager';
import ReinvestmentManager from '@/components/accounting/ReinvestmentManager';
import BusinessIntelligence from '@/components/accounting/BusinessIntelligence';
import ProfitsCalculator from '@/components/accounting/ProfitsCalculator';
import PersonalFinanceManager from '@/components/accounting/PersonalFinanceManager';
import PaymentHistory from '@/components/accounting/PaymentHistory';

interface TreasuryConfig {
    bankName: string;
    bankBalance: number;
    cashBalance: number;
}

const Accounting: React.FC = () => {
    const { loans, archivedLoans, hasMoreArchivedLoans, loadAllHistory, allHistoryLoaded, recalculateTreasury, reinvestments } = useDataContext();
    const { showToast } = useAppContext();
    const [activeTab, setActiveTab] = useState<'global' | 'profits' | 'personal' | 'reinvestments' | 'intelligence' | 'payments'>('global');
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [timeRange, setTimeRange] = useState<'all' | 'year' | 'month'>('month');

    // Treasury State
    const [treasurySettings, setTreasurySettings] = useState<TreasuryConfig>({
        bankName: 'Banco',
        bankBalance: 0,
        cashBalance: 0
    });

    useEffect(() => {
        const unsubscribe = subscribeToCollection(TABLE_NAMES.TREASURY, (data) => {
            if (!data) return;
            const mainDoc = data.find(d => d.id === 'main');
            if (mainDoc) {
                setTreasurySettings({
                    bankName: mainDoc.bankName || 'Banco',
                    bankBalance: Number(mainDoc.bankBalance) || 0,
                    cashBalance: Number(mainDoc.cashBalance) || 0
                });
            }
        });
        return () => unsubscribe();
    }, []);

    // Logic
    const allLoans = useMemo(() => {
        const raw = [...(loans || []), ...(archivedLoans || [])];
        return raw.filter(l => {
            const name = l.clientName.toLowerCase();
            return !name.includes('prueba') && !name.includes('test');
        });
    }, [loans, archivedLoans]);

    const stats = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        let totalInvested = 0;
        let currentOutstanding = 0;
        let overdueAmount = 0;
        let periodRecoveredCapital = 0;
        let periodInterestEarned = 0;
        let forecastedMonthlyIncome = 0;
        let historicalTotalCapitalRecovered = 0;
        let historicalTotalInterestEarned = 0;

        allLoans.forEach(loan => {
            if (!loan.archived && loan.status !== 'Pagado') {
                currentOutstanding += loan.remainingCapital;
                forecastedMonthlyIncome += loan.remainingCapital * 0.08;
                if (loan.status === 'Vencido') overdueAmount += loan.remainingCapital;
            }
            totalInvested += (loan.initialCapital || loan.amount);
            if (loan.paymentHistory) {
                loan.paymentHistory.forEach(payment => {
                    const payDate = new Date(payment.date);
                    historicalTotalCapitalRecovered += Number(payment.capitalPaid || 0);
                    historicalTotalInterestEarned += Number(payment.interestPaid || 0);

                    let include = false;
                    if (timeRange === 'all') include = true;
                    else if (timeRange === 'year') include = payDate.getFullYear() === currentYear;
                    else if (timeRange === 'month') include = payDate.getMonth() === currentMonth && payDate.getFullYear() === currentYear;

                    if (include) {
                        periodRecoveredCapital += Number(payment.capitalPaid || 0);
                        periodInterestEarned += Number(payment.interestPaid || 0);
                    }
                });
            }
        });

        const totalReinvested = reinvestments.reduce((acc, r) => acc + r.amount, 0);
        const defaultRate = currentOutstanding > 0 ? (overdueAmount / currentOutstanding) * 100 : 0;

        return {
            totalInvested,
            currentOutstanding,
            overdueAmount,
            periodRecoveredCapital,
            periodInterestEarned,
            forecastedMonthlyIncome,
            defaultRate,
            totalReinvested,
            historicalTotalCapitalRecovered,
            historicalTotalInterestEarned
        };
    }, [allLoans, timeRange, reinvestments]);

    const handleLoadMore = async () => {
        setIsLoadingHistory(true);
        await loadAllHistory();
        setIsLoadingHistory(false);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200">
            {/* Header / Sub-nav */}
            <div className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 py-4 px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-6">
                 <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 shadow-inner w-full md:w-auto">
                    {(['global', 'profits', 'payments', 'intelligence', 'reinvestments', 'personal'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-black shadow-xl scale-105' : 'text-slate-500 hover:text-slate-200'}`}
                        >
                            {tab === 'global' && 'Resumen'}
                            {tab === 'profits' && 'ROI'}
                            {tab === 'payments' && 'Cierre'}
                            {tab === 'intelligence' && 'Predictivo'}
                            {tab === 'reinvestments' && 'Ciclos'}
                            {tab === 'personal' && 'Ahorro'}
                        </button>
                    ))}
                </div>

                {activeTab === 'global' && (
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
                            {(['month', 'year', 'all'] as const).map(range => (
                                <button 
                                    key={range}
                                    onClick={() => setTimeRange(range)} 
                                    className={`flex-1 sm:flex-none px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors ${timeRange === range ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    {range === 'month' ? 'Mes' : range === 'year' ? 'Año' : 'Total'}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <main className="p-6 md:p-12 space-y-12">
                <AnimatePresence mode="wait">
                    {activeTab === 'global' && (
                        <motion.div 
                            key="global"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="space-y-12"
                        >
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <KPICard 
                                    title="Intereses Cobrados" 
                                    value={formatCurrency(stats.periodInterestEarned)} 
                                    subtext={timeRange === 'all' ? 'Historial Completo' : timeRange === 'year' ? 'Total Año Actual' : 'Ganancia Neta Mensual'}
                                    icon={Coins} 
                                    color="emerald"
                                    index={0}
                                />
                                <KPICard 
                                    title="Capital en Calle" 
                                    value={formatCurrency(stats.currentOutstanding)} 
                                    subtext="Suma de Capitales Activos"
                                    icon={BarChart3} 
                                    color="blue"
                                    index={1}
                                />
                                <KPICard 
                                    title="Tasa de Mora" 
                                    value={`${stats.defaultRate.toFixed(1)}%`} 
                                    subtext={`Cartera Vencida: ${formatCurrency(stats.overdueAmount)}`}
                                    icon={stats.defaultRate > 5 ? TrendingDown : Sparkles} 
                                    color={stats.defaultRate > 5 ? "rose" : "emerald"}
                                    isRisk={stats.defaultRate > 10}
                                    index={2}
                                />
                                <KPICard 
                                    title="Meta Recaudación" 
                                    value={formatCurrency(stats.forecastedMonthlyIncome)} 
                                    subtext="Próximo Retorno de Intereses"
                                    icon={TrendingUp} 
                                    color="indigo"
                                    index={3}
                                />
                            </div>

                            {/* Treasury Section */}
                            <TreasuryManager 
                                settings={treasurySettings} 
                                onRecalculate={recalculateTreasury} 
                            />

                            {/* Withdrawal Management */}
                            <WithdrawalManager />
                        </motion.div>
                    )}

                    {activeTab === 'profits' && (
                        <motion.div 
                            key="profits"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <ProfitsCalculator 
                                totalInvested={stats.totalInvested}
                                totalRecoveredCapital={stats.historicalTotalCapitalRecovered}
                                totalInterestEarned={stats.historicalTotalInterestEarned}
                                overdueAmount={stats.overdueAmount}
                                totalReinvested={stats.totalReinvested}
                            />
                        </motion.div>
                    )}

                    {activeTab === 'intelligence' && (
                        <motion.div 
                            key="intelligence"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <BusinessIntelligence allLoans={allLoans} />
                        </motion.div>
                    )}

                    {activeTab === 'reinvestments' && (
                        <motion.div 
                            key="reinvestments"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <ReinvestmentManager />
                        </motion.div>
                    )}

                    {activeTab === 'personal' && (
                        <motion.div 
                            key="personal"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                        >
                            <PersonalFinanceManager />
                        </motion.div>
                    )}

                    {activeTab === 'payments' && (
                        <motion.div 
                            key="payments"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <PaymentHistory 
                                loans={archivedLoans}
                                isLoading={isLoadingHistory}
                                hasMore={!allHistoryLoaded && hasMoreArchivedLoans}
                                onLoadMore={handleLoadMore}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
};

export default Accounting;
