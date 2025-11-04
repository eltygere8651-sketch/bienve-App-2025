import React, { useMemo, useState } from 'react';
import { useDataContext } from '../contexts/DataContext';
import { formatCurrency } from '../services/utils';
import { LoanStatus, AccountingEntryType, AccountingEntry } from '../types';
import { Calculator, Landmark, TrendingUp, TrendingDown, Wallet, HandCoins, PiggyBank, PlusCircle, Loader2 } from 'lucide-react';

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; }> = ({ title, value, icon }) => (
    <div className="bg-white p-6 rounded-2xl shadow-md flex items-center justify-between transition-transform hover:scale-105">
        <div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
        <div className="bg-blue-100 text-blue-600 p-3 rounded-full">
            {icon}
        </div>
    </div>
);

const Accounting: React.FC = () => {
    const { loans, accountingEntries, appMeta, handleSetCapital, handleAddAccountingEntry } = useDataContext();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- State for Forms ---
    const [initialCapitalInput, setInitialCapitalInput] = useState('');
    const [entryType, setEntryType] = useState<AccountingEntryType>('INCOME');
    const [entryDescription, setEntryDescription] = useState('');
    const [entryAmount, setEntryAmount] = useState('');
    const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);

    // --- Memoized Calculations ---
    const financials = useMemo(() => {
        const initialCapital = parseFloat(appMeta.find(m => m.key === 'initial_capital')?.value || '0');

        const manualInjections = accountingEntries.filter(e => e.type === 'CAPITAL_INJECTION').reduce((sum, e) => sum + e.amount, 0);
        const manualWithdrawals = accountingEntries.filter(e => e.type === 'CAPITAL_WITHDRAWAL').reduce((sum, e) => sum + e.amount, 0);
        
        const manualIncome = accountingEntries.filter(e => e.type === 'INCOME').reduce((sum, e) => sum + e.amount, 0);
        const manualExpenses = accountingEntries.filter(e => e.type === 'EXPENSE').reduce((sum, e) => sum + e.amount, 0);

        const realizedInterestProfit = loans
            .filter(l => l.status === LoanStatus.PAID)
            .reduce((sum, l) => sum + (l.totalRepayment - l.amount), 0);
        
        const totalNetProfit = (realizedInterestProfit + manualIncome) - manualExpenses;
        const workingCapital = initialCapital + manualInjections - manualWithdrawals + totalNetProfit;

        const activePrincipal = loans
            .filter(l => l.status !== LoanStatus.PAID)
            .reduce((sum, l) => sum + l.amount, 0);

        return {
            initialCapital,
            workingCapital,
            totalNetProfit,
            activePrincipal,
            realizedInterestProfit,
            manualIncome,
            manualExpenses,
        };
    }, [loans, accountingEntries, appMeta]);

    const sortedEntries = useMemo(() => {
        return [...accountingEntries].sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime());
    }, [accountingEntries]);


    const handleSetCapitalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(initialCapitalInput);
        if (isNaN(amount) || amount < 0) return;
        setIsSubmitting(true);
        await handleSetCapital(amount);
        setInitialCapitalInput('');
        setIsSubmitting(false);
    };

    const handleAddEntrySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(entryAmount);
        if (!entryDescription.trim() || isNaN(amount) || amount <= 0) return;
        
        setIsSubmitting(true);
        await handleAddAccountingEntry({
            type: entryType,
            description: entryDescription,
            amount,
            entry_date: entryDate,
        });

        // Reset form
        setEntryType('INCOME');
        setEntryDescription('');
        setEntryAmount('');
        setEntryDate(new Date().toISOString().split('T')[0]);
        setIsSubmitting(false);
    };

    const EntryTypeBadge: React.FC<{type: AccountingEntryType}> = ({ type }) => {
        const styles = {
            INCOME: 'bg-green-100 text-green-700',
            EXPENSE: 'bg-red-100 text-red-700',
            CAPITAL_INJECTION: 'bg-blue-100 text-blue-700',
            CAPITAL_WITHDRAWAL: 'bg-yellow-100 text-yellow-700',
        };
        const labels = {
            INCOME: 'Ingreso',
            EXPENSE: 'Egreso',
            CAPITAL_INJECTION: 'Inyección Capital',
            CAPITAL_WITHDRAWAL: 'Retiro Capital',
        };
        return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[type]}`}>{labels[type]}</span>
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center">
                <Calculator className="h-8 w-8 mr-3 text-blue-600" />
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Contabilidad y Finanzas</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Capital de Trabajo" value={formatCurrency(financials.workingCapital)} icon={<Landmark />} />
                <StatCard title="Beneficio Neto Total" value={formatCurrency(financials.totalNetProfit)} icon={<PiggyBank />} />
                <StatCard title="Principal Activo" value={formatCurrency(financials.activePrincipal)} icon={<Wallet />} />
                <StatCard title="Intereses Realizados" value={formatCurrency(financials.realizedInterestProfit)} icon={<HandCoins />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-md">
                     <h2 className="text-lg font-semibold text-gray-700 mb-4">Registro de Movimientos Manuales</h2>
                     {sortedEntries.length > 0 ? (
                        <div className="overflow-x-auto max-h-96">
                            <table className="w-full text-left min-w-[400px]">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="p-3">Fecha</th>
                                        <th className="p-3">Descripción</th>
                                        <th className="p-3">Tipo</th>
                                        <th className="p-3 text-right">Monto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedEntries.map(entry => (
                                        <tr key={entry.id} className="border-b border-gray-200 hover:bg-gray-50">
                                            <td className="p-3 text-gray-700 text-sm">{new Date(entry.entry_date).toLocaleDateString()}</td>
                                            <td className="p-3 font-medium text-gray-800 text-sm">{entry.description}</td>
                                            <td className="p-3"><EntryTypeBadge type={entry.type}/></td>
                                            <td className={`p-3 text-right font-semibold text-sm ${entry.type.includes('INCOME') || entry.type.includes('INJECTION') ? 'text-green-600' : 'text-red-600'}`}>
                                                {formatCurrency(entry.amount)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                     ) : (
                        <div className="text-center py-10">
                            <p className="text-gray-500">No hay movimientos manuales registrados.</p>
                        </div>
                     )}
                </div>
                <div className="space-y-6">
                     <div className="bg-white p-6 rounded-2xl shadow-md">
                        <h2 className="text-lg font-semibold text-gray-700 mb-4">Gestionar Capital</h2>
                        <form onSubmit={handleSetCapitalSubmit} className="space-y-3">
                            <div>
                                <label htmlFor="initialCapital" className="block text-sm font-medium text-gray-700 mb-1">Capital Inicial (€)</label>
                                <input id="initialCapital" type="number" min="0" step="0.01" value={initialCapitalInput} onChange={e => setInitialCapitalInput(e.target.value)} placeholder={formatCurrency(financials.initialCapital)} className="w-full px-3 py-2 border border-gray-300 rounded-md"/>
                            </div>
                            <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center justify-center disabled:bg-blue-400">
                                {isSubmitting ? <Loader2 size={18} className="animate-spin"/> : 'Guardar Capital'}
                            </button>
                        </form>
                    </div>
                     <div className="bg-white p-6 rounded-2xl shadow-md">
                        <h2 className="text-lg font-semibold text-gray-700 mb-4">Añadir Movimiento</h2>
                        <form onSubmit={handleAddEntrySubmit} className="space-y-3">
                             <div>
                                <label htmlFor="entryType" className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                                <select id="entryType" value={entryType} onChange={e => setEntryType(e.target.value as AccountingEntryType)} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                                    <option value="INCOME">Ingreso</option>
                                    <option value="EXPENSE">Egreso</option>
                                    <option value="CAPITAL_INJECTION">Inyección de Capital</option>
                                    <option value="CAPITAL_WITHDRAWAL">Retiro de Capital</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="entryDate" className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                                <input id="entryDate" type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                            </div>
                             <div>
                                <label htmlFor="entryDescription" className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                                <input id="entryDescription" type="text" value={entryDescription} onChange={e => setEntryDescription(e.target.value)} required placeholder="Ej: Gastos de oficina" className="w-full px-3 py-2 border border-gray-300 rounded-md"/>
                            </div>
                             <div>
                                <label htmlFor="entryAmount" className="block text-sm font-medium text-gray-700 mb-1">Monto (€)</label>
                                <input id="entryAmount" type="number" min="0.01" step="0.01" value={entryAmount} onChange={e => setEntryAmount(e.target.value)} required placeholder="Ej: 50.00" className="w-full px-3 py-2 border border-gray-300 rounded-md"/>
                            </div>
                            <button type="submit" disabled={isSubmitting} className="w-full bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 flex items-center justify-center disabled:bg-green-400">
                                {isSubmitting ? <Loader2 size={18} className="animate-spin"/> : <PlusCircle size={18} className="mr-2"/>} 
                                {isSubmitting ? 'Registrando...' : 'Registrar'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Accounting;
