
import React, { useMemo, useState, useEffect } from 'react';
import { Loan, LoanStatus, FilterStatus, Client } from '../types';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Banknote, Clock, ThumbsUp, AlertTriangle, FileWarning, CloudCheck, CloudOff } from 'lucide-react';
import { useDataContext } from '../contexts/DataContext';
import { useAppContext } from '../contexts/AppContext';
import { formatCurrency } from '../services/utils';
import LoanDetailsModal from './LoanDetailsModal';
import { DashboardStats } from '../services/geminiService';

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; change?: string; changeType?: 'increase' | 'decrease' }> = ({ title, value, icon, change, changeType }) => (
    <div className="bg-slate-800 p-6 rounded-xl shadow-lg flex items-center justify-between transition-transform hover:scale-105 border border-slate-700">
        <div>
            <p className="text-sm text-slate-400 font-medium">{title}</p>
            <p className="text-2xl font-bold text-slate-100">{value}</p>
            {change && (
                <div className={`text-xs flex items-center mt-1 ${changeType === 'increase' ? 'text-green-400' : 'text-red-400'}`}>
                    {changeType === 'increase' ? <ArrowUpRight size={14} className="mr-1"/> : <ArrowDownRight size={14} className="mr-1"/>}
                    {change}
                </div>
            )}
        </div>
        <div className="bg-primary-500/10 text-primary-400 p-3 rounded-full">
            {icon}
        </div>
    </div>
);

const Dashboard: React.FC = () => {
    const { loans, clients } = useDataContext();
    const { showToast, isOnline } = useAppContext();
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('Todos');
    const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
    const [showPermissionBanner, setShowPermissionBanner] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            if ('Notification' in window && Notification.permission === 'default') {
                setShowPermissionBanner(true);
            }
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    const handleRequestPermission = () => {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                showToast('¡Notificaciones activadas!', 'success');
            }
            setShowPermissionBanner(false);
        });
    };

    const detailedStats = useMemo((): DashboardStats => {
        const totalLoaned = loans.reduce((acc, loan) => acc + (loan.initialCapital || loan.amount), 0);
        const totalOutstanding = loans.reduce((acc, loan) => acc + loan.remainingCapital, 0);
        const activeLoans = loans.filter(l => l.status === LoanStatus.PENDING || l.status === LoanStatus.OVERDUE).length;
        
        const counts = loans.reduce((acc, loan) => {
            acc[loan.status] = (acc[loan.status] || 0) + 1;
            return acc;
        }, {} as Record<LoanStatus, number>);

        return {
            totalLoaned,
            totalOutstanding,
            activeLoans,
            counts: {
                [LoanStatus.PAID]: counts[LoanStatus.PAID] || 0,
                [LoanStatus.PENDING]: counts[LoanStatus.PENDING] || 0,
                [LoanStatus.OVERDUE]: counts[LoanStatus.OVERDUE] || 0,
            }
        };
    }, [loans]);
    
    const pieChartData = useMemo(() => {
        if (loans.length === 0) {
            return [{ name: 'Sin datos', value: 1 }];
        }
        return Object.entries(detailedStats.counts).map(([name, value]) => ({ name, value }));
    }, [loans, detailedStats]);

    const COLORS: { [key: string]: string } = {
        [LoanStatus.PENDING]: '#3b82f6', // primary-500
        [LoanStatus.PAID]: '#22c55e',     // green-500
        [LoanStatus.OVERDUE]: '#ef4444',  // red-500
        'Sin datos': '#64748b' // slate-500
    };

    const StatusBadge: React.FC<{ status: LoanStatus }> = ({ status }) => {
        const baseClasses = "px-3 py-1 text-xs font-semibold rounded-full inline-flex items-center";
        switch (status) {
            case LoanStatus.PAID:
                return <span className={`${baseClasses} bg-green-500/10 text-green-400`}><ThumbsUp size={12} className="mr-1"/> {status}</span>;
            case LoanStatus.PENDING:
                return <span className={`${baseClasses} bg-primary-500/10 text-primary-400`}><Clock size={12} className="mr-1"/> {status}</span>;
            case LoanStatus.OVERDUE:
                return <span className={`${baseClasses} bg-red-500/10 text-red-400`}><AlertTriangle size={12} className="mr-1"/> {status}</span>;
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
        if (e.payload.name === 'Sin datos') return;
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
                 {showPermissionBanner && (
                    <div className="bg-primary-900/50 border border-primary-500/30 text-primary-200 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4 animate-fade-in-down">
                        <p className="text-sm text-center sm:text-left">
                            <span className="font-bold">Activa las notificaciones</span> para recibir alertas instantáneas de nuevas solicitudes de préstamo.
                        </p>
                        <div className="flex gap-2 flex-shrink-0">
                            <button onClick={() => setShowPermissionBanner(false)} className="px-4 py-1.5 text-xs font-semibold rounded-md hover:bg-slate-700">Ahora no</button>
                            <button onClick={handleRequestPermission} className="px-4 py-1.5 bg-primary-600 text-white text-xs font-semibold rounded-md hover:bg-primary-700">Activar</button>
                        </div>
                    </div>
                )}
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">Panel Contable</h1>
                    {isOnline ? (
                        <div className="flex items-center text-emerald-400 bg-emerald-900/20 px-3 py-1 rounded-full text-xs font-medium border border-emerald-500/20 animate-fade-in">
                            <CloudCheck size={16} className="mr-2" />
                            Conectado a la Nube
                        </div>
                    ) : (
                        <div className="flex items-center text-amber-400 bg-amber-900/20 px-3 py-1 rounded-full text-xs font-medium border border-amber-500/20 animate-pulse">
                            <CloudOff size={16} className="mr-2" />
                            Modo Offline
                        </div>
                    )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <StatCard title="Total Prestado (Capital)" value={formatCurrency(detailedStats.totalLoaned)} icon={<Banknote />} />
                    <StatCard title="Total Pendiente (Capital)" value={formatCurrency(detailedStats.totalOutstanding)} icon={<Clock />} />
                    <StatCard title="Préstamos Activos" value={detailedStats.activeLoans.toString()} icon={<FileWarning />} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700">
                        <h2 className="text-lg font-semibold text-slate-200 mb-4">
                            Préstamos Recientes
                        </h2>
                        {filteredLoans.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left min-w-[400px]">
                                    <thead className="text-xs text-slate-400 uppercase bg-slate-700/50">
                                        <tr>
                                            <th className="p-3">Cliente</th>
                                            <th className="p-3">Pendiente</th>
                                            <th className="p-3">Estado</th>
                                            <th className="p-3 text-right">Detalle</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredLoans.map(loan => (
                                            <tr 
                                                key={loan.id} 
                                                onClick={() => handleLoanClick(loan)}
                                                className={`border-b border-slate-700 hover:bg-slate-700/50 cursor-pointer ${loan.status === LoanStatus.OVERDUE ? 'bg-red-500/10' : ''}`}
                                            >
                                                <td className="p-3 font-medium text-slate-100">{loan.clientName}</td>
                                                <td className="p-3 text-slate-300 font-mono">{formatCurrency(loan.remainingCapital)}</td>
                                                <td className="p-3"><StatusBadge status={loan.status} /></td>
                                                <td className="p-3 text-right">
                                                    <button className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300 hover:bg-primary-600 hover:text-white transition-colors">
                                                        Ver / Pagar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-10">
                                <FileWarning size={40} className="mx-auto text-slate-500" />
                                <h3 className="mt-4 font-semibold text-slate-300">
                                    No hay préstamos
                                </h3>
                            </div>
                        )}
                    </div>
                    <div className="space-y-6">
                        <div className="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700">
                            <h2 className="text-lg font-semibold text-slate-200 mb-4">Estado de Cartera</h2>
                            {loans.length > 0 ? (
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie data={pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} fill="#8884d8" label>
                                            {pieChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[entry.name]} cursor="pointer"/>
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem' }} itemStyle={{ color: '#e2e8f0' }} formatter={(value) => `${value} Préstamo(s)`}/>
                                        <Legend wrapperStyle={{fontSize: '12px', cursor: 'pointer', color: '#94a3b8'}} onClick={handleLegendClick}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-[200px] flex flex-col justify-center items-center text-center">
                                    <FileWarning size={40} className="text-slate-500" />
                                    <p className="mt-1 text-sm text-slate-400">No hay datos</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </>
    );
};

export default Dashboard;
