
import React, { useMemo, useState, useEffect } from 'react';
import { Loan, LoanStatus, FilterStatus, Client, DashboardStats } from '../types';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Banknote, Clock, ThumbsUp, AlertTriangle, FileWarning, CloudCheck, CloudOff, Wallet } from 'lucide-react';
import { useDataContext } from '../contexts/DataContext';
import { useAppContext } from '../contexts/AppContext';
import { formatCurrency } from '../services/utils';
import LoanDetailsModal from './LoanDetailsModal';

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; change?: string; changeType?: 'increase' | 'decrease' }> = ({ title, value, icon, change, changeType }) => (
    <div className="glass-card p-6 rounded-2xl relative overflow-hidden group transition-all hover:-translate-y-1 bg-slate-800/60 border border-white/5">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity scale-150 transform translate-x-2 -translate-y-2">
            {icon}
        </div>
        <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-white/5 rounded-xl text-primary-400 ring-1 ring-white/10">
                    {icon}
                </div>
            </div>
            <p className="text-3xl font-heading font-bold text-white tracking-tight">{value}</p>
            <p className="text-sm text-slate-400 font-medium mt-1">{title}</p>
            
            {change && (
                <div className={`text-xs flex items-center mt-3 font-medium ${changeType === 'increase' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {changeType === 'increase' ? <ArrowUpRight size={14} className="mr-1"/> : <ArrowDownRight size={14} className="mr-1"/>}
                    {change}
                </div>
            )}
        </div>
    </div>
);

const Dashboard: React.FC = () => {
    const { loans, clients } = useDataContext();
    const { showToast, isOnline } = useAppContext();
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('Todos');
    const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
    const [initialTab, setInitialTab] = useState<'details' | 'payment'>('details');
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
        [LoanStatus.PENDING]: '#6366f1', // primary-500
        [LoanStatus.PAID]: '#10b981',     // emerald-500
        [LoanStatus.OVERDUE]: '#ef4444',  // red-500
        'Sin datos': '#475569'
    };

    const StatusBadge: React.FC<{ status: LoanStatus }> = ({ status }) => {
        const baseClasses = "px-2.5 py-0.5 text-xs font-bold rounded-full inline-flex items-center ring-1 ring-inset whitespace-nowrap";
        switch (status) {
            case LoanStatus.PAID:
                return <span className={`${baseClasses} bg-emerald-500/10 text-emerald-400 ring-emerald-500/20`}><ThumbsUp size={12} className="mr-1"/> {status}</span>;
            case LoanStatus.PENDING:
                return <span className={`${baseClasses} bg-primary-500/10 text-primary-400 ring-primary-500/20`}><Clock size={12} className="mr-1"/> {status}</span>;
            case LoanStatus.OVERDUE:
                return <span className={`${baseClasses} bg-red-500/10 text-red-400 ring-red-500/20`}><AlertTriangle size={12} className="mr-1"/> {status}</span>;
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
        setInitialTab('details');
        setSelectedLoan(loan);
    };

    const handleQuickPay = (e: React.MouseEvent, loan: Loan) => {
        e.stopPropagation();
        setInitialTab('payment');
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
                initialTab={initialTab}
            />
            <div className="space-y-8 animate-fade-in">
                 {showPermissionBanner && (
                    <div className="bg-primary-900/30 border border-primary-500/30 text-primary-100 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4 animate-fade-in-down backdrop-blur-sm">
                        <p className="text-sm text-center sm:text-left">
                            <span className="font-bold">Activa las notificaciones</span> para recibir alertas instantáneas de nuevas solicitudes.
                        </p>
                        <div className="flex gap-2 flex-shrink-0">
                            <button onClick={() => setShowPermissionBanner(false)} className="px-3 py-1.5 text-xs font-semibold rounded-lg hover:bg-white/5 text-slate-300">Ahora no</button>
                            <button onClick={handleRequestPermission} className="px-4 py-1.5 bg-primary-600 text-white text-xs font-semibold rounded-lg hover:bg-primary-500 shadow-lg shadow-primary-900/20">Activar</button>
                        </div>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h1 className="text-3xl font-heading font-bold text-white">Panel Contable</h1>
                    {isOnline ? (
                        <div className="flex items-center text-emerald-400 bg-emerald-900/10 px-3 py-1 rounded-full text-xs font-medium border border-emerald-500/10">
                            <CloudCheck size={14} className="mr-2" />
                            Sincronizado
                        </div>
                    ) : (
                        <div className="flex items-center text-amber-400 bg-amber-900/10 px-3 py-1 rounded-full text-xs font-medium border border-amber-500/10 animate-pulse">
                            <CloudOff size={14} className="mr-2" />
                            Offline
                        </div>
                    )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <StatCard title="Total Prestado (Capital)" value={formatCurrency(detailedStats.totalLoaned)} icon={<Banknote />} />
                    <StatCard title="Capital Pendiente" value={formatCurrency(detailedStats.totalOutstanding)} icon={<Clock />} />
                    <StatCard title="Préstamos Activos" value={detailedStats.activeLoans.toString()} icon={<FileWarning />} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Lista Reciente Optimizada para Móvil y Desktop */}
                    <div className="lg:col-span-2 glass-panel rounded-2xl overflow-hidden flex flex-col bg-slate-800/60 border border-white/5">
                        <div className="p-6 border-b border-white/5">
                            <h2 className="text-lg font-heading font-semibold text-white">
                                Actividad Reciente
                            </h2>
                        </div>
                        
                        {filteredLoans.length > 0 ? (
                            <div className="flex-1">
                                {/* Desktop Headers - Hidden on Mobile */}
                                <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 text-xs text-slate-400 uppercase bg-black/20 font-medium">
                                    <div className="col-span-4">Cliente</div>
                                    <div className="col-span-3 text-right">Deuda Pendiente</div>
                                    <div className="col-span-3 text-center">Estado</div>
                                    <div className="col-span-2 text-right">Acción</div>
                                </div>

                                {/* Content Grid/List */}
                                <div className="divide-y divide-white/5">
                                    {filteredLoans.map(loan => (
                                        <div 
                                            key={loan.id} 
                                            onClick={() => handleLoanClick(loan)}
                                            className="group hover:bg-white/5 transition-colors cursor-pointer"
                                        >
                                            {/* Mobile View (Stacked) */}
                                            <div className="md:hidden p-4 flex flex-col gap-3">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-200 text-sm truncate max-w-[150px]">{loan.clientName}</span>
                                                        <span className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                                            <Clock size={10} />
                                                            {new Date(loan.startDate).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <span className="text-slate-300 font-mono font-bold text-sm tracking-wide bg-slate-900/50 px-2 py-1 rounded border border-slate-700">
                                                        {formatCurrency(loan.remainingCapital)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center pt-1">
                                                    <StatusBadge status={loan.status} />
                                                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                         {loan.status !== LoanStatus.PAID && (
                                                            <button 
                                                                onClick={(e) => handleQuickPay(e, loan)}
                                                                className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all border border-emerald-500/20 active:scale-95"
                                                                title="Cobro Rápido"
                                                            >
                                                                <Wallet size={16} />
                                                            </button>
                                                        )}
                                                        <button 
                                                            onClick={() => handleLoanClick(loan)}
                                                            className="text-xs font-medium text-primary-400 bg-primary-500/10 px-3 py-2 rounded-lg border border-primary-500/20 active:scale-95"
                                                        >
                                                            Ver Detalles
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Desktop View (Grid Row) */}
                                            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 items-center">
                                                <div className="col-span-4 font-medium text-slate-200 group-hover:text-white truncate pr-2">
                                                    {loan.clientName}
                                                </div>
                                                <div className="col-span-3 text-right text-slate-300 font-mono tracking-wide">
                                                    {formatCurrency(loan.remainingCapital)}
                                                </div>
                                                <div className="col-span-3 flex justify-center">
                                                    <StatusBadge status={loan.status} />
                                                </div>
                                                <div className="col-span-2 text-right">
                                                    <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                        {loan.status !== LoanStatus.PAID && (
                                                            <button 
                                                                onClick={(e) => handleQuickPay(e, loan)}
                                                                className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all border border-emerald-500/20"
                                                                title="Cobro Rápido"
                                                            >
                                                                <Wallet size={16} />
                                                            </button>
                                                        )}
                                                        <span 
                                                            className="text-xs font-medium text-primary-400 group-hover:text-primary-300 transition-colors flex items-center px-2 cursor-pointer hover:underline"
                                                            onClick={() => handleLoanClick(loan)}
                                                        >
                                                            Ver →
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col justify-center items-center py-16 text-center">
                                <div className="bg-slate-800/50 p-4 rounded-full mb-3">
                                    <FileWarning size={32} className="text-slate-500" />
                                </div>
                                <h3 className="font-medium text-slate-300">
                                    No hay préstamos registrados
                                </h3>
                            </div>
                        )}
                    </div>

                    {/* Gráfico */}
                    <div className="glass-panel rounded-2xl p-6 flex flex-col bg-slate-800/60 border border-white/5">
                        <h2 className="text-lg font-heading font-semibold text-white mb-6">Estado de Cartera</h2>
                        {loans.length > 0 ? (
                            <div className="flex-1 flex items-center justify-center min-h-[250px]">
                                <ResponsiveContainer width="100%" height={250}>
                                    <PieChart>
                                        <Pie 
                                            data={pieChartData} 
                                            dataKey="value" 
                                            nameKey="name" 
                                            cx="50%" 
                                            cy="50%" 
                                            innerRadius={60}
                                            outerRadius={80} 
                                            paddingAngle={5}
                                            stroke="none"
                                        >
                                            {pieChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[entry.name]}/>
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{ 
                                                backgroundColor: 'rgba(30, 41, 59, 0.9)', 
                                                border: '1px solid rgba(255,255,255,0.1)', 
                                                borderRadius: '12px',
                                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                            }} 
                                            itemStyle={{ color: '#f1f5f9', fontSize: '12px' }} 
                                            formatter={(value) => `${value} Préstamo(s)`}
                                        />
                                        <Legend 
                                            verticalAlign="bottom" 
                                            height={36} 
                                            iconType="circle"
                                            formatter={(value) => <span className="text-slate-400 text-xs ml-1">{value}</span>}
                                            onClick={handleLegendClick}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col justify-center items-center text-center opacity-50">
                                <div className="w-32 h-32 rounded-full border-4 border-slate-700/50 border-dashed mb-2"></div>
                                <p className="text-sm text-slate-400">Sin datos para mostrar</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default Dashboard;
