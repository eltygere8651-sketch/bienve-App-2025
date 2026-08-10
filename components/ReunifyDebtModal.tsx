import React, { useState, useMemo, useEffect } from 'react';
import { X, Layers, CheckCircle2, ArrowRight, Loader2, AlertCircle, Search, UserCheck, Infinity as InfinityIcon } from 'lucide-react';
import { useDataContext } from '../contexts/DataContext';
import { InputField, SelectField } from './FormFields';
import { formatCurrency } from '../services/utils';
import { calculateLoanParameters } from '../config';

interface ReunifyDebtModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ReunifyDebtModal: React.FC<ReunifyDebtModalProps> = ({ isOpen, onClose }) => {
    const { clients, loans, handleReunifyLoans } = useDataContext();

    const [selectedLoanIds, setSelectedLoanIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [targetClientId, setTargetClientId] = useState<string>('');
    const [unifiedAmount, setUnifiedAmount] = useState<string>('0');
    const [monthlyInterestRate, setMonthlyInterestRate] = useState<string>('8');
    const [term, setTerm] = useState<string>('12');
    const [isIndefinite, setIsIndefinite] = useState(true);
    const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Active loans eligible for consolidation
    const activeLoans = useMemo(() => {
        return loans.filter(l => l.remainingCapital > 0 && !l.archived);
    }, [loans]);

    // Filtered loans by search
    const filteredLoans = useMemo(() => {
        if (!searchQuery.trim()) return activeLoans;
        const q = searchQuery.toLowerCase();
        return activeLoans.filter(l => 
            l.clientName.toLowerCase().includes(q) ||
            l.id.toLowerCase().includes(q)
        );
    }, [activeLoans, searchQuery]);

    // Selected loans data
    const selectedLoans = useMemo(() => {
        return activeLoans.filter(l => selectedLoanIds.includes(l.id));
    }, [activeLoans, selectedLoanIds]);

    // Sum of original pending debts
    const totalOriginalDebt = useMemo(() => {
        return selectedLoans.reduce((sum, l) => sum + l.remainingCapital, 0);
    }, [selectedLoans]);

    // Update unified amount automatically when selection changes if user hasn't modified it manually
    useEffect(() => {
        setUnifiedAmount(totalOriginalDebt.toString());
        
        // Auto select target client from first selected loan if not set
        if (selectedLoans.length > 0 && !targetClientId) {
            setTargetClientId(selectedLoans[0].clientId);
        }
    }, [totalOriginalDebt, selectedLoans]);

    // Calculate preview parameters for new unified loan
    const calculations = useMemo(() => {
        const amount = parseFloat(unifiedAmount) || 0;
        const loanTerm = isIndefinite ? 0 : (parseInt(term, 10) || 0);
        const mRate = parseFloat(monthlyInterestRate) || 0;
        const annualRate = mRate * 12;

        return calculateLoanParameters(amount, loanTerm, annualRate);
    }, [unifiedAmount, term, isIndefinite, monthlyInterestRate]);

    if (!isOpen) return null;

    const toggleLoanSelection = (loanId: string) => {
        setErrorMsg(null);
        setSelectedLoanIds(prev => 
            prev.includes(loanId) 
                ? prev.filter(id => id !== loanId)
                : [...prev, loanId]
        );
    };

    const handleSelectAllClientLoans = (clientId: string) => {
        const clientLoanIds = activeLoans.filter(l => l.clientId === clientId).map(l => l.id);
        const allSelected = clientLoanIds.every(id => selectedLoanIds.includes(id));
        
        if (allSelected) {
            setSelectedLoanIds(prev => prev.filter(id => !clientLoanIds.includes(id)));
        } else {
            setSelectedLoanIds(prev => Array.from(new Set([...prev, ...clientLoanIds])));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (selectedLoanIds.length === 0) {
            setErrorMsg("Debes seleccionar al menos 1 préstamo para reunificar.");
            return;
        }

        if (!targetClientId) {
            setErrorMsg("Selecciona el cliente titular del nuevo préstamo reunificado.");
            return;
        }

        const numAmount = parseFloat(unifiedAmount);
        if (isNaN(numAmount) || numAmount <= 0) {
            setErrorMsg("El monto total reunificado debe ser mayor a 0.");
            return;
        }

        const targetClient = clients.find(c => c.id === targetClientId);
        if (!targetClient) {
            setErrorMsg("Cliente de destino no encontrado.");
            return;
        }

        setIsSubmitting(true);

        try {
            const finalNotes = notes.trim() 
                ? notes 
                : `Reunificación de deudas (${selectedLoans.length} préstamos anteriores por total de ${formatCurrency(totalOriginalDebt)} unificados en ${formatCurrency(numAmount)}).`;

            await handleReunifyLoans(
                selectedLoanIds,
                targetClientId,
                targetClient.name,
                numAmount,
                parseFloat(monthlyInterestRate) || 0,
                isIndefinite ? 0 : (parseInt(term, 10) || 0),
                finalNotes,
                startDate
            );

            // Reset & Close
            setSelectedLoanIds([]);
            onClose();
        } catch (err: any) {
            console.error(err);
            setErrorMsg(err.message || "Error al reunificar deudas.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-modal-backdrop" onClick={onClose}>
            <div className="bg-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col border border-slate-700 overflow-hidden animate-modal-content max-h-[90vh]" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="p-5 bg-slate-900 border-b border-slate-700 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
                            <Layers size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Reunificación de Deuda</h2>
                            <p className="text-xs text-slate-400">Consolida múltiples préstamos activos en una sola cuota unificada</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {errorMsg && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3 text-red-200 text-sm">
                            <AlertCircle size={18} className="flex-shrink-0 text-red-400" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {/* Step 1: Select Loans */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full">Paso 1</span>
                                Seleccionar Préstamos a Reunificar ({selectedLoanIds.length})
                            </h3>

                            {/* Search */}
                            <div className="relative w-64">
                                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar cliente..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                                />
                            </div>
                        </div>

                        {activeLoans.length === 0 ? (
                            <div className="p-6 text-center text-slate-500 border border-dashed border-slate-700 rounded-xl text-sm">
                                No hay préstamos activos disponibles para reunificar.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-52 overflow-y-auto pr-1">
                                {filteredLoans.map((loan) => {
                                    const isSelected = selectedLoanIds.includes(loan.id);
                                    return (
                                        <div
                                            key={loan.id}
                                            onClick={() => toggleLoanSelection(loan.id)}
                                            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                                                isSelected 
                                                    ? 'bg-amber-500/10 border-amber-500/50 shadow-md ring-1 ring-amber-500/30' 
                                                    : 'bg-slate-900/60 border-slate-700/80 hover:bg-slate-700/40'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                                                    isSelected ? 'bg-amber-500 border-amber-500 text-slate-900' : 'border-slate-600 bg-slate-800'
                                                }`}>
                                                    {isSelected && <CheckCircle2 size={14} className="stroke-[3]" />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-200">{loan.clientName}</p>
                                                    <p className="text-[11px] text-slate-400">
                                                        Pendiente: <span className="font-bold text-amber-300">{formatCurrency(loan.remainingCapital)}</span>
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="text-right text-[10px] text-slate-400">
                                                <p>Tasa: {(loan.interestRate / 12).toFixed(1)}%/mes</p>
                                                <p className="font-mono text-slate-500">ID: {loan.id.slice(-6)}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Step 2: Total Sum & Unified Target Parameters */}
                    {selectedLoans.length > 0 && (
                        <div className="space-y-5 animate-fade-in border-t border-slate-700 pt-5">
                            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full">Paso 2</span>
                                Configuración de la Nueva Deuda Reunificada
                            </h3>

                            {/* Summary bar */}
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div>
                                    <p className="text-xs text-amber-300/80 uppercase font-bold tracking-wider">Deuda Original Acumulada</p>
                                    <p className="text-2xl font-bold text-amber-300">{formatCurrency(totalOriginalDebt)}</p>
                                    <p className="text-[11px] text-slate-400">{selectedLoans.length} préstamos seleccionados</p>
                                </div>
                                <ArrowRight className="text-amber-500 hidden sm:block" size={24} />
                                <div className="w-full sm:w-auto">
                                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Monto Reunificado (€)</p>
                                    <input
                                        type="number"
                                        value={unifiedAmount}
                                        onChange={(e) => setUnifiedAmount(e.target.value)}
                                        step="0.01"
                                        min="0.01"
                                        required
                                        className="w-full sm:w-44 px-3 py-1.5 bg-slate-900 border border-amber-500/50 rounded-lg text-lg font-bold text-white text-right focus:ring-2 focus:ring-amber-500"
                                    />
                                    <p className="text-[10px] text-slate-400 text-right mt-0.5">Puedes ajustar o acordar un monto final</p>
                                </div>
                            </div>

                            {/* Configuration inputs */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <SelectField
                                    label="Cliente Titular del Préstamo Reunificado"
                                    name="targetClientId"
                                    value={targetClientId}
                                    onChange={(e) => setTargetClientId(e.target.value)}
                                    required
                                >
                                    <option value="">-- Seleccionar Cliente --</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.idNumber})</option>
                                    ))}
                                </SelectField>

                                <div className="grid grid-cols-2 gap-2">
                                    <InputField
                                        label="Interés Mensual (%)"
                                        name="monthlyInterestRate"
                                        type="number"
                                        value={monthlyInterestRate}
                                        onChange={(e) => setMonthlyInterestRate(e.target.value)}
                                        required
                                        step="0.1"
                                        min="0"
                                    />

                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between bg-slate-900/60 p-2 rounded-lg border border-slate-700">
                                            <span className="text-xs font-medium text-slate-300 flex items-center gap-1">
                                                <InfinityIcon size={14} className="text-amber-400" />
                                                Indefinido
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setIsIndefinite(!isIndefinite)}
                                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${isIndefinite ? 'bg-amber-600' : 'bg-slate-600'}`}
                                            >
                                                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isIndefinite ? 'translate-x-5' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                        {!isIndefinite ? (
                                            <InputField
                                                label="Plazo (Meses)"
                                                name="term"
                                                type="number"
                                                value={term}
                                                onChange={(e) => setTerm(e.target.value)}
                                                required={!isIndefinite}
                                                min="1"
                                            />
                                        ) : (
                                            <div className="h-[42px] flex items-center justify-center text-xs text-slate-400 border border-slate-700 border-dashed rounded-lg bg-slate-900/40">
                                                Sin plazo fijo
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <InputField
                                    label="Fecha de Inicio"
                                    name="startDate"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    required
                                />

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Notas / Observaciones</label>
                                    <input
                                        type="text"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Ej: Acuerdos especiales de reunificación..."
                                        className="w-full px-3 py-2 border border-slate-600 rounded-lg bg-slate-700 text-slate-100 text-sm focus:ring-primary-500 focus:border-primary-500"
                                    />
                                </div>
                            </div>

                            {/* Preview Card */}
                            <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-700 space-y-2">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Simulación del Nuevo Préstamo Reunificado</h4>
                                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                                    <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700">
                                        <p className="text-[10px] text-slate-400">Cuota Mensual</p>
                                        <p className="text-sm font-bold text-emerald-400">{formatCurrency(calculations.monthlyPayment)}</p>
                                    </div>
                                    <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700">
                                        <p className="text-[10px] text-slate-400">Tasa Aplicada</p>
                                        <p className="text-sm font-bold text-primary-300">{monthlyInterestRate}% / mes</p>
                                    </div>
                                    <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700">
                                        <p className="text-[10px] text-slate-400">Total a Devolver</p>
                                        <p className="text-sm font-bold text-amber-300">{formatCurrency(calculations.totalRepayment)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 bg-slate-700 text-slate-200 font-bold rounded-xl hover:bg-slate-600 transition-colors text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || selectedLoanIds.length === 0}
                            className="inline-flex items-center justify-center px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-900 font-bold rounded-xl transition-all shadow-lg shadow-amber-900/30 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={16} className="animate-spin mr-2" />
                                    Procesando Reunificación...
                                </>
                            ) : (
                                <>
                                    <Layers size={16} className="mr-2" />
                                    Confirmar Reunificación ({selectedLoanIds.length})
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReunifyDebtModal;
