import React, { useMemo, useState, useEffect } from 'react';
import { useDataContext } from '../contexts/DataContext';
import { useAppContext } from '../contexts/AppContext';
import { formatCurrency } from '../services/utils';
import { LoanStatus, AccountingEntryType, AccountingEntry } from '../types';
import { Calculator, Landmark, Wallet, HandCoins, PiggyBank, PlusCircle, Loader2, Edit, Trash2, X } from 'lucide-react';

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; }> = ({ title, value, icon }) => (
    <div className="bg-white p-6 rounded-xl shadow-md flex items-center justify-between transition-transform hover:scale-105">
        <div>
            <p className="text-sm text-slate-500 font-medium">{title}</p>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
        </div>
        <div className="bg-primary-100 text-primary-600 p-3 rounded-full">
            {icon}
        </div>
    </div>
);

const EditEntryModal: React.FC<{
    entry: AccountingEntry | null;
    onClose: () => void;
    onSave: (entry: AccountingEntry, updates: { description: string; amount: number; entry_date: string }) => Promise<void>;
}> = ({ entry, onClose, onSave }) => {
    const [formData, setFormData] = useState({ description: '', amount: '', entry_date: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (entry) {
            setFormData({
                description: entry.description,
                amount: String(entry.amount),
                entry_date: new Date(entry.entry_date).toISOString().split('T')[0],
            });
        }
    }, [entry]);

    if (!entry) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        await onSave(entry, { ...formData, amount: Number(formData.amount) });
        setIsSubmitting(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-fade-in-down" onClick={e => e.stopPropagation()}>
                <div className="p-6 flex justify-between items-center border-b">
                    <h3 className="text-lg font-bold text-slate-800">Editar Movimiento</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100"><X /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label htmlFor="edit_entry_date" className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
                        <input id="edit_entry_date" type="date" value={formData.entry_date} onChange={e => setFormData({ ...formData, entry_date: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-md"/>
                    </div>
                    <div>
                        <label htmlFor="edit_description" className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                        <input id="edit_description" type="text" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-md"/>
                    </div>
                    <div>
                        <label htmlFor="edit_amount" className="block text-sm font-medium text-slate-700 mb-1">Monto (€)</label>
                        <input id="edit_amount" type="number" min="0.01" step="0.01" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-md"/>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300">Cancelar</button>
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-primary-600 text-white font-bold rounded-lg hover:bg-primary-700 flex items-center justify-center disabled:bg-primary-400">
                            {isSubmitting ? <Loader2 size={18} className="animate-spin"/> : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const Accounting: React.FC = () => {
    const { loans, accountingEntries, appMeta, handleSetCapital, handleAddAccountingEntry, handleUpdateAccountingEntry, handleDeleteAccountingEntry } = useDataContext();
    const { showConfirmModal } = useAppContext();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingEntry, setEditingEntry] = useState<AccountingEntry | null>(null);
    const [filterType, setFilterType] = useState<AccountingEntryType | 'All'>('All');

    const [initialCapitalInput, setInitialCapitalInput] = useState('');
    const [entryType, setEntryType] = useState<AccountingEntryType>('INCOME');
    const [entryDescription, setEntryDescription] = useState('');
    const [entryAmount, setEntryAmount] = useState('');
    const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);

    const financials = useMemo(() => {
        const initialCapital = parseFloat(appMeta.find(m => m.key === 'initial_capital')?.value || '0');
        const manualInjections = accountingEntries.filter(e => e.type === 'CAPITAL_INJECTION').reduce((sum, e) => sum + e.amount, 0);
        const manualWithdrawals = accountingEntries.filter(e => e.type === 'CAPITAL_WITHDRAWAL').reduce((sum, e) => sum + e.amount, 0);
        const manualIncome = accountingEntries.filter(e => e.type === 'INCOME').reduce((sum, e) => sum + e.amount, 0);
        const manualExpenses = accountingEntries.filter(e => e.type === 'EXPENSE').reduce((sum, e) => sum + e.amount, 0);
        const realizedInterestProfit = loans.filter(l => l.status === LoanStatus.PAID).reduce((sum, l) => sum + (l.totalRepayment - l.amount), 0);
        const totalNetProfit = (realizedInterestProfit + manualIncome) - manualExpenses;
        const workingCapital = initialCapital + manualInjections - manualWithdrawals + totalNetProfit;
        const activePrincipal = loans.filter(l => l.status !== LoanStatus.PAID).reduce((sum, l) => sum + l.amount, 0);

        return { initialCapital, workingCapital, totalNetProfit, activePrincipal, realizedInterestProfit };
    }, [loans, accountingEntries, appMeta]);

    const filteredEntries = useMemo(() => {
        const sorted = [...accountingEntries].sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime());
        if (filterType === 'All') return sorted;
        return sorted.filter(entry => entry.type === filterType);
    }, [accountingEntries, filterType]);

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
        await handleAddAccountingEntry({ type: entryType, description: entryDescription, amount, entry_date: entryDate });
        setEntryType('INCOME'); setEntryDescription(''); setEntryAmount(''); setEntryDate(new Date().toISOString().split('T')[0]);
        setIsSubmitting(false);
    };
    
    const handleSaveEdit = async (entry: AccountingEntry, updates: { description: string; amount: number; entry_date: string }) => {
        await handleUpdateAccountingEntry(entry.id, updates);
        setEditingEntry(null);
    };
    
    const handleDeleteClick = (entry: AccountingEntry) => {
        showConfirmModal({
            title: 'Confirmar Eliminación',
            message: `¿Estás seguro de que quieres eliminar el movimiento "${entry.description}" por ${formatCurrency(entry.amount)}? Esta acción es irreversible.`,
            onConfirm: () => handleDeleteAccountingEntry(entry.id),
        });
    };

    const EntryTypeBadge: React.FC<{type: AccountingEntryType}> = ({ type }) => {
        const styles = { INCOME: 'bg-green-100 text-green-700', EXPENSE: 'bg-red-100 text-red-700', CAPITAL_INJECTION: 'bg-primary-100 text-primary-700', CAPITAL_WITHDRAWAL: 'bg-yellow-100 text-yellow-700' };
        const labels = { INCOME: 'Ingreso', EXPENSE: 'Egreso', CAPITAL_INJECTION: 'Inyección Capital', CAPITAL_WITHDRAWAL: 'Retiro Capital' };
        return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[type]}`}>{labels[type]}</span>
    };
    
    const FilterButton: React.FC<{ type: AccountingEntryType | 'All', label: string }> = ({ type, label }) => {
        const isActive = filterType === type;
        return <button onClick={() => setFilterType(type)} className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${isActive ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>{label}</button>;
    };

    return (
        <>
            <EditEntryModal entry={editingEntry} onClose={() => setEditingEntry(null)} onSave={handleSaveEdit} />
            <div className="space-y-6">
                <div className="flex items-center"><Calculator className="h-8 w-8 mr-3 text-primary-600" /><h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Contabilidad y Finanzas</h1></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard title="Capital de Trabajo" value={formatCurrency(financials.workingCapital)} icon={<Landmark />} />
                    <StatCard title="Beneficio Neto Total" value={formatCurrency(financials.totalNetProfit)} icon={<PiggyBank />} />
                    <StatCard title="Principal Activo" value={formatCurrency(financials.activePrincipal)} icon={<Wallet />} />
                    <StatCard title="Intereses Realizados" value={formatCurrency(financials.realizedInterestProfit)} icon={<HandCoins />} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-md">
                        <h2 className="text-lg font-semibold text-slate-700 mb-4">Registro de Movimientos Manuales</h2>
                        <div className="flex flex-wrap gap-2 mb-4"><FilterButton type="All" label="Todos" /><FilterButton type="INCOME" label="Ingresos" /><FilterButton type="EXPENSE" label="Egresos" /><FilterButton type="CAPITAL_INJECTION" label="Inyecciones" /><FilterButton type="CAPITAL_WITHDRAWAL" label="Retiros" /></div>
                        {filteredEntries.length > 0 ? (
                            <div className="overflow-x-auto max-h-96">
                                <table className="w-full text-left min-w-[500px]">
                                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0"><tr><th className="p-3">Fecha</th><th className="p-3">Descripción</th><th className="p-3">Tipo</th><th className="p-3 text-right">Monto</th><th className="p-3 text-center">Acciones</th></tr></thead>
                                    <tbody>
                                        {filteredEntries.map(entry => (
                                            <tr key={entry.id} className="border-b border-slate-200 hover:bg-slate-50">
                                                <td className="p-3 text-slate-700 text-sm">{new Date(entry.entry_date).toLocaleDateString()}</td>
                                                <td className="p-3 font-medium text-slate-800 text-sm">{entry.description}</td>
                                                <td className="p-3"><EntryTypeBadge type={entry.type}/></td>
                                                <td className={`p-3 text-right font-semibold text-sm ${entry.type.includes('INCOME') || entry.type.includes('INJECTION') ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(entry.amount)}</td>
                                                <td className="p-3 text-center">
                                                    <button onClick={() => setEditingEntry(entry)} className="p-1 text-slate-500 hover:text-primary-600 hover:bg-slate-200 rounded-full"><Edit size={16} /></button>
                                                    <button onClick={() => handleDeleteClick(entry)} className="p-1 text-slate-500 hover:text-red-600 hover:bg-slate-200 rounded-full ml-1"><Trash2 size={16} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (<div className="text-center py-10"><p className="text-slate-500">No hay movimientos para el filtro seleccionado.</p></div>)}
                    </div>
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-md"><h2 className="text-lg font-semibold text-slate-700 mb-4">Gestionar Capital</h2><form onSubmit={handleSetCapitalSubmit} className="space-y-3"><div><label htmlFor="initialCapital" className="block text-sm font-medium text-slate-700 mb-1">Capital Inicial (€)</label><input id="initialCapital" type="number" min="0" step="0.01" value={initialCapitalInput} onChange={e => setInitialCapitalInput(e.target.value)} placeholder={formatCurrency(financials.initialCapital)} className="w-full px-3 py-2 border border-slate-300 rounded-md"/></div><button type="submit" disabled={isSubmitting} className="w-full bg-primary-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-700 flex items-center justify-center disabled:bg-primary-400">{isSubmitting ? <Loader2 size={18} className="animate-spin"/> : 'Guardar Capital'}</button></form></div>
                        <div className="bg-white p-6 rounded-xl shadow-md"><h2 className="text-lg font-semibold text-slate-700 mb-4">Añadir Movimiento</h2><form onSubmit={handleAddEntrySubmit} className="space-y-3"><div><label htmlFor="entryType" className="block text-sm font-medium text-slate-700 mb-1">Tipo</label><select id="entryType" value={entryType} onChange={e => setEntryType(e.target.value as AccountingEntryType)} className="w-full px-3 py-2 border border-slate-300 rounded-md"><option value="INCOME">Ingreso</option><option value="EXPENSE">Egreso</option><option value="CAPITAL_INJECTION">Inyección de Capital</option><option value="CAPITAL_WITHDRAWAL">Retiro de Capital</option></select></div><div><label htmlFor="entryDate" className="block text-sm font-medium text-slate-700 mb-1">Fecha</label><input id="entryDate" type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} required className="w-full px-3 py-2 border border-slate-300 rounded-md" /></div><div><label htmlFor="entryDescription" className="block text-sm font-medium text-slate-700 mb-1">Descripción</label><input id="entryDescription" type="text" value={entryDescription} onChange={e => setEntryDescription(e.target.value)} required placeholder="Ej: Gastos de oficina" className="w-full px-3 py-2 border border-slate-300 rounded-md"/></div><div><label htmlFor="entryAmount" className="block text-sm font-medium text-slate-700 mb-1">Monto (€)</label><input id="entryAmount" type="number" min="0.01" step="0.01" value={entryAmount} onChange={e => setEntryAmount(e.target.value)} required placeholder="Ej: 50.00" className="w-full px-3 py-2 border border-slate-300 rounded-md"/></div><button type="submit" disabled={isSubmitting} className="w-full bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 flex items-center justify-center disabled:bg-green-400">{isSubmitting ? <Loader2 size={18} className="animate-spin"/> : <PlusCircle size={18} className="mr-2"/>} {isSubmitting ? 'Registrando...' : 'Registrar'}</button></form></div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Accounting;