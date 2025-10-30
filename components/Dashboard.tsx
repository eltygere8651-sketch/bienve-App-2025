import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Loan, LoanStatus, FilterStatus, Client } from '../types';
import { getFinancialTip } from '../services/geminiService';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Banknote, Clock, ThumbsUp, AlertTriangle, Lightbulb, RefreshCw, FileWarning } from 'lucide-react';
import { useDataContext } from '../contexts/DataContext';
import { formatCurrency } from '../services/utils';
import { LOCAL_STORAGE_KEYS } from '../constants';
import LoanDetailsModal from './LoanDetailsModal';

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; change?: string; changeType?: 'increase' | 'decrease' }> = ({ title, value, icon, change, changeType }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md flex items-center justify-between transition-transform hover:scale-105">
        <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
            {change && (
                <div className={`text-xs flex items-center mt-1 ${changeType === 'increase' ? 'text-green-500' : 'text-red-500'}`}>
                    {changeType === 'increase' ? <ArrowUpRight size={14} className="mr-1"/> : <ArrowDownRight size={14} className="mr-1"/>}
                    {change}
                </div>
            )}
        </div>
        <div className="bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 p-3 rounded-full">
            {icon}
        </div>
    </div>
);


const Dashboard: React.FC = () => {
    const { loans, clients, handleRegisterPayment } = useDataContext();
    const [tip, setTip] = useState<string>('');
    const [isLoadingTip, setIsLoadingTip] = useState<boolean>(true);
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('Todos');
    const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
    
    const fetchTip = useCallback(async (forceRefresh = false) => {
        setIsLoadingTip(true);
        const today = new Date().toISOString().split('T')[0];
        const storedTipData = localStorage.getItem(LOCAL_STORAGE_KEYS.FINANCIAL_TIP);

        if (storedTipData && !forceRefresh) {
            try {
                const { date, tip: storedTip } = JSON.parse(storedTipData);
                if (date === today && storedTip) {
                    setTip(storedTip);
                    setIsLoadingTip(false);
                    return;
                }
            } catch (error) {
                console.error("Failed to parse stored financial tip", error);
                localStorage.removeItem(LOCAL_STORAGE_KEYS.FINANCIAL_TIP);
            }
        }

        const newTip = await getFinancialTip();
        setTip(newTip);
        localStorage.setItem(LOCAL_STORAGE_KEYS.FINANCIAL_TIP, JSON.stringify({ date: today, tip: newTip }));
        setIsLoadingTip(false);
    }, []);

    useEffect(() => {
        fetchTip();
    }, [fetchTip]);

    const stats = useMemo(() => {
        const totalLoaned = loans.reduce((acc, loan) => acc + loan.amount, 0);
        const totalOutstanding = loans
            .filter(loan => loan.status === LoanStatus.PENDING || loan.status === LoanStatus.OVERDUE)
            .reduce((acc, loan) => acc + (loan.totalRepayment - (loan.monthlyPayment * loan.paymentsMade)), 0);
        const activeLoans = loans.filter(l => l.status === LoanStatus.PENDING || l.status === LoanStatus.OVERDUE).length;
        return { totalLoaned, totalOutstanding, activeLoans };
    }, [loans]);
    
    const pieChartData = useMemo(() => {
        if (loans.length === 0) {
            return [{ name: 'Sin datos', value: 1 }];
        }
        const statusCounts = loans.reduce((acc, loan) => {
            acc[loan.status] = (acc[loan.status] || 0) + 1;
            return acc;
        }, {} as Record<LoanStatus, number>);

        return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
    }, [loans]);
    
    const COLORS: { [key: string]: string } = {
        [LoanStatus.PENDING]: '#3b82f6', // blue-500
        [LoanStatus.PAID]: '#22c55e',     // green-500
        [LoanStatus.OVERDUE]: '#ef4444',  // red-500
        'Sin datos': '#9ca3af' // gray-400
    };

    const StatusBadge: React.FC<{ status: LoanStatus }> = ({ status }) => {
        const baseClasses = "px-3 py-1 text-xs font-semibold rounded-full inline-flex items-center";
        switch (status) {
            case LoanStatus.PAID:
                return <span className={`${baseClasses} bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300`}><ThumbsUp size={12} className="mr-1"/> {status}</span>;
            case LoanStatus.PENDING:
                return <span className={`${baseClasses} bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300`}><Clock size={12} className="mr-1"/> {status}</span>;
            case LoanStatus.OVERDUE:
                return <span className={`${baseClasses} bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300`}><AlertTriangle size={12} className="mr-1"/> {status}</span>;
            default:
                return null;
        }
    };
    
    const filteredLoans = useMemo(() => {
        const recentLoans = [...loans].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
        if (filterStatus === 'Todos') {
            return recentLoans.slice(0, 10);
        }
        return recentLoans.filter(l => l.status === filterStatus);
    }, [loans, filterStatus]);
    
    const handleLegendClick = (e: any) => {
        const clickedStatus = e.payload.name as LoanStatus;
        setFilterStatus(prev => prev === clickedStatus ? 'Todos' : clickedStatus);
    };

    const handleLoanClick = (loan: Loan) => {
        setSelectedLoan(loan);
    };
    
    const closeModal = () => {
        setSelectedLoan(null);
    };

    const selectedClient = useMemo(() => {
        if (!selectedLoan || !clients) return null;
        return clients.find(c => c.id === selectedLoan.clientId) || null;
    }, [selectedLoan, clients]);

    return (
        <>
            <LoanDetailsModal
                isOpen={!!selectedLoan}
                onClose={closeModal}
                loan={selectedLoan}
                client={selectedClient}
            />
            <div className="space-y-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Dashboard</h1>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <StatCard title="Total Prestado" value={formatCurrency(stats.totalLoaned)} icon={<Banknote />} />
                    <StatCard title="Saldo Pendiente" value={formatCurrency(stats.totalOutstanding)} icon={<Banknote />} />
                    <StatCard title="Préstamos Activos" value={stats.activeLoans.toString()} icon={<Clock />} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md">
                        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">
                            Préstamos Recientes {filterStatus !== 'Todos' && <span className="text-sm font-normal text-gray-500 dark:text-gray-400">- Filtrado por: {filterStatus}</span>}
                        </h2>
                        {filteredLoans.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th className="p-3">Cliente</th>
                                            <th className="p-3">Monto</th>
                                            <th className="p-3">Estado</th>
                                            <th className="p-3 text-right">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredLoans.map(loan => (
                                            <tr 
                                                key={loan.id} 
                                                onClick={() => handleLoanClick(loan)}
                                                className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer ${loan.status === LoanStatus.OVERDUE ? 'bg-red-50 dark:bg-red-900/20' : ''}`}
                                            >
                                                <td className="p-3 font-medium text-gray-800 dark:text-gray-100">{loan.clientName}</td>
                                                <td className="p-3 text-gray-700 dark:text-gray-300">{formatCurrency(loan.amount)}</td>
                                                <td className="p-3"><StatusBadge status={loan.status} /></td>
                                                <td className="p-3 text-right">
                                                    {loan.status !== LoanStatus.PAID &&
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleRegisterPayment(loan.id); }}
                                                        className="bg-green-500 text-white px-3 py-1 rounded-md text-xs font-semibold hover:bg-green-600 transition-colors"
                                                    >
                                                        Registrar Pago
                                                    </button>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-10">
                                <FileWarning size={40} className="mx-auto text-gray-400" />
                                <h3 className="mt-4 font-semibold text-gray-700 dark:text-gray-200">No hay préstamos que coincidan</h3>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Prueba con otro filtro o aprueba una solicitud.</p>
                            </div>
                        )}
                    </div>
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md">
                            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Estado de Préstamos</h2>
                            {loans.length > 0 ? (
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie data={pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} fill="#8884d8" label>
                                            {pieChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[entry.name]} cursor="pointer"/>
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: '#334155', border: 'none', borderRadius: '0.5rem' }} itemStyle={{ color: '#e2e8f0' }} formatter={(value) => `${value} Préstamo(s)`}/>
                                        <Legend wrapperStyle={{fontSize: '12px', cursor: 'pointer'}} onClick={handleLegendClick}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-[200px] flex flex-col justify-center items-center text-center">
                                    <FileWarning size={40} className="text-gray-400" />
                                    <h3 className="mt-4 font-semibold text-gray-700 dark:text-gray-200">Sin Datos de Préstamos</h3>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">No hay préstamos para mostrar en el gráfico.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 rounded-2xl shadow-lg text-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-lg font-semibold flex items-center"><Lightbulb className="mr-2"/> Consejo Financiero del Día</h2>
                            {isLoadingTip ? (
                                <div className="h-12 flex items-center mt-2">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                </div>
                            ) : (
                                <p className="mt-2 text-blue-100 max-w-prose">{tip}</p>
                            )}
                        </div>
                        <button onClick={() => fetchTip(true)} disabled={isLoadingTip} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors disabled:opacity-50" aria-label="Refrescar consejo">
                        <RefreshCw size={18}/>
                        </button>
                    </div>
                </div>

            </div>
        </>
    );
};

export default Dashboard;