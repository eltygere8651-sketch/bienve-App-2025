import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Loan, LoanStatus, FilterStatus, Client } from '../types';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Banknote, Clock, ThumbsUp, AlertTriangle, Lightbulb, RefreshCw, FileWarning, Sparkles, Loader2 } from 'lucide-react';
import { useDataContext } from '../contexts/DataContext';
import { formatCurrency } from '../services/utils';
import LoanDetailsModal from './LoanDetailsModal';
import { generateDashboardInsights, DashboardStats } from '../services/geminiService';

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; change?: string; changeType?: 'increase' | 'decrease' }> = ({ title, value, icon, change, changeType }) => (
    <div className="bg-white p-6 rounded-2xl shadow-md flex items-center justify-between transition-transform hover:scale-105">
        <div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
            {change && (
                <div className={`text-xs flex items-center mt-1 ${changeType === 'increase' ? 'text-green-500' : 'text-red-500'}`}>
                    {changeType === 'increase' ? <ArrowUpRight size={14} className="mr-1"/> : <ArrowDownRight size={14} className="mr-1"/>}
                    {change}
                </div>
            )}
        </div>
        <div className="bg-blue-100 text-blue-600 p-3 rounded-full">
            {icon}
        </div>
    </div>
);

const SimpleMarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let listItems: string[] = [];

    const renderLine = (line: string): React.ReactNode => {
        const parts = line.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index}>{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    const flushList = () => {
        if (listItems.length > 0) {
            elements.push(
                <ul key={`ul-${elements.length}`} className="list-disc pl-5 mt-2 space-y-1">
                    {listItems.map((item, index) => <li key={index}>{renderLine(item)}</li>)}
                </ul>
            );
            listItems = [];
        }
    };

    lines.forEach((line, lineIndex) => {
        const listItemMatch = line.match(/^[\s-]*\*\s(.*)/) || line.match(/^[\s-]*-\s(.*)/);
        if (listItemMatch) {
            listItems.push(listItemMatch[1]);
        } else {
            flushList();
            elements.push(<p key={`p-${lineIndex}`} className={line.trim() === '' ? 'h-2' : ''}>{renderLine(line)}</p>);
        }
    });

    flushList();

    return <>{elements}</>;
};

const Dashboard: React.FC = () => {
    const { loans, clients, handleRegisterPayment } = useDataContext();
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('Todos');
    const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
    const [insight, setInsight] = useState<string | null>(null);
    const [isInsightLoading, setIsInsightLoading] = useState(false);
    

    const detailedStats = useMemo((): DashboardStats => {
        const totalLoaned = loans.reduce((acc, loan) => acc + loan.amount, 0);
        const totalOutstanding = loans
            .filter(loan => loan.status === LoanStatus.PENDING || loan.status === LoanStatus.OVERDUE)
            .reduce((acc, loan) => acc + (loan.totalRepayment - (loan.monthlyPayment * loan.paymentsMade)), 0);
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

    const handleGenerateInsight = useCallback(async () => {
        setIsInsightLoading(true);
        setInsight(null);
        try {
            const result = await generateDashboardInsights(detailedStats);
            setInsight(result);
        } catch (error) {
            console.error(error);
            setInsight("Ocurrió un error al generar el análisis. Por favor, intenta de nuevo.");
        } finally {
            setIsInsightLoading(false);
        }
    }, [detailedStats]);
    
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
                return <span className={`${baseClasses} bg-green-100 text-green-700`}><ThumbsUp size={12} className="mr-1"/> {status}</span>;
            case LoanStatus.PENDING:
                return <span className={`${baseClasses} bg-blue-100 text-blue-700`}><Clock size={12} className="mr-1"/> {status}</span>;
            case LoanStatus.OVERDUE:
                return <span className={`${baseClasses} bg-red-100 text-red-700`}><AlertTriangle size={12} className="mr-1"/> {status}</span>;
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
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Panel</h1>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <StatCard title="Total Prestado" value={formatCurrency(detailedStats.totalLoaned)} icon={<Banknote />} />
                    <StatCard title="Saldo Pendiente" value={formatCurrency(detailedStats.totalOutstanding)} icon={<Banknote />} />
                    <StatCard title="Préstamos Activos" value={detailedStats.activeLoans.toString()} icon={<Clock />} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-md">
                        <h2 className="text-lg font-semibold text-gray-700 mb-4">
                            Préstamos Recientes {filterStatus !== 'Todos' && <span className="text-sm font-normal text-gray-500">- Filtrado por: {filterStatus}</span>}
                        </h2>
                        {filteredLoans.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left min-w-[400px]">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50">
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
                                                className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${loan.status === LoanStatus.OVERDUE ? 'bg-red-50' : ''}`}
                                            >
                                                <td className="p-3 font-medium text-gray-800">{loan.clientName}</td>
                                                <td className="p-3 text-gray-700">{formatCurrency(loan.amount)}</td>
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
                                <h3 className="mt-4 font-semibold text-gray-700">
                                    {filterStatus === 'Todos' ? 'No hay préstamos recientes' : `No hay préstamos con estado "${filterStatus}"`}
                                </h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    {filterStatus === 'Todos' 
                                        ? 'Cuando se apruebe una nueva solicitud, aparecerá aquí.' 
                                        : 'Prueba seleccionando otro estado en el gráfico.'}
                                </p>
                            </div>
                        )}
                    </div>
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-md">
                            <h2 className="text-lg font-semibold text-gray-700 mb-4">Estado de Préstamos</h2>
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
                                    <h3 className="mt-4 font-semibold text-gray-700">Sin Datos de Préstamos</h3>
                                    <p className="mt-1 text-sm text-gray-500">No hay préstamos para mostrar en el gráfico.</p>
                                </div>
                            )}
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-md flex flex-col">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-gray-700 flex items-center">
                                    <Lightbulb size={20} className="mr-2 text-yellow-500" />
                                    Análisis Financiero con IA
                                </h2>
                                {insight && !isInsightLoading && (
                                     <button 
                                        onClick={handleGenerateInsight} 
                                        className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100"
                                        title="Generar nuevo análisis"
                                    >
                                        <RefreshCw size={16} />
                                    </button>
                                )}
                            </div>
                            {isInsightLoading ? (
                                <div className="flex-grow flex flex-col items-center justify-center min-h-[150px]">
                                    <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                                    <p className="mt-4 text-gray-600">Analizando cartera...</p>
                                </div>
                            ) : insight ? (
                                <div className="text-sm text-gray-800 font-sans leading-relaxed flex-grow">
                                    <SimpleMarkdownRenderer text={insight} />
                                </div>
                            ) : (
                                <div className="flex-grow flex flex-col items-center justify-center text-center min-h-[150px]">
                                     <p className="text-gray-600 mb-4">
                                        Obtén un resumen de la salud de tu cartera y sugerencias para mejorarla.
                                    </p>
                                    <button
                                        onClick={handleGenerateInsight}
                                        className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform hover:scale-105"
                                    >
                                        <Sparkles size={18} className="mr-2" />
                                        Generar Análisis
                                    </button>
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