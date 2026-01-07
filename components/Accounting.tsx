
import React, { useMemo, useState, useEffect } from 'react';
import { useDataContext } from '../contexts/DataContext';
import { useAppContext } from '../contexts/AppContext';
import { formatCurrency } from '../services/utils';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
    PieChart, Pie, Cell 
} from 'recharts';
import { TrendingUp, PieChart as PieIcon, Wallet, BarChart3, Coins, ArrowRight, AlertTriangle, Info, Lock, ShieldCheck, Scale, Database, Plane, Palmtree, Edit2, Plus, Save, X, Umbrella, Car, Home, Laptop, Gift, Heart, Target, Trash2, ArrowLeft, Landmark, Calendar, Cloud, Loader2, CreditCard, Banknote, Edit3, ArrowDownRight, ArrowUpRight, RefreshCw } from 'lucide-react';
import { subscribeToCollection, addDocument, updateDocument, deleteDocument, setDocument } from '../services/firebaseService';
import { TABLE_NAMES } from '../constants';

// --- COMPONENTS ---

const KPICard: React.FC<{ title: string, value: string, subtext?: string, icon: any, color: string, isRisk?: boolean }> = ({ title, value, subtext, icon: Icon, color, isRisk }) => (
    <div className={`bg-slate-800/60 border ${isRisk ? 'border-red-500/30 bg-red-900/10' : 'border-slate-700'} p-6 rounded-2xl flex flex-col justify-between backdrop-blur-md relative overflow-hidden group hover:-translate-y-1 transition-transform`}>
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

// --- PERSONAL FINANCE MANAGER (ISOLATED LOGIC VIA FIRESTORE) ---

interface PersonalFund {
    id: string;
    name: string;
    icon: string; // key for icon mapping
    color: 'cyan' | 'purple' | 'emerald' | 'orange' | 'rose' | 'blue';
    currentAmount: number;
    goal: number;
    bankName: string;
    monthlyContribution: number;
    lastUpdated: string;
}

interface TreasuryConfig {
    bankName: string;
    bankBalance: number;
    cashBalance: number;
}

const DEFAULT_FUNDS: PersonalFund[] = [];

// Icon Mapping
const ICON_MAP: Record<string, any> = {
    'plane': Plane,
    'palmtree': Palmtree,
    'car': Car,
    'home': Home,
    'laptop': Laptop,
    'gift': Gift,
    'heart': Heart,
    'target': Target,
    'wallet': Wallet,
    'umbrella': Umbrella
};

const COLOR_STYLES = {
    cyan: { bg: 'from-cyan-900/40 to-blue-900/40', border: 'border-cyan-500/30', text: 'text-cyan-400', bar: 'from-cyan-500 to-blue-500', btn: 'bg-cyan-600 hover:bg-cyan-500' },
    purple: { bg: 'from-purple-900/40 to-indigo-900/40', border: 'border-purple-500/30', text: 'text-purple-400', bar: 'from-purple-500 to-indigo-500', btn: 'bg-purple-600 hover:bg-purple-500' },
    emerald: { bg: 'from-emerald-900/40 to-teal-900/40', border: 'border-emerald-500/30', text: 'text-emerald-400', bar: 'from-emerald-500 to-teal-500', btn: 'bg-emerald-600 hover:bg-emerald-500' },
    orange: { bg: 'from-orange-900/40 to-amber-900/40', border: 'border-orange-500/30', text: 'text-orange-400', bar: 'from-orange-500 to-amber-500', btn: 'bg-orange-600 hover:bg-orange-500' },
    rose: { bg: 'from-rose-900/40 to-pink-900/40', border: 'border-rose-500/30', text: 'text-rose-400', bar: 'from-rose-500 to-pink-500', btn: 'bg-rose-600 hover:bg-rose-500' },
    blue: { bg: 'from-blue-900/40 to-indigo-900/40', border: 'border-blue-500/30', text: 'text-blue-400', bar: 'from-blue-500 to-indigo-500', btn: 'bg-blue-600 hover:bg-blue-500' },
};

const PersonalFinanceManager: React.FC = () => {
    const [funds, setFunds] = useState<PersonalFund[]>(DEFAULT_FUNDS);
    const [selectedFundId, setSelectedFundId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isEditingFund, setIsEditingFund] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { showToast } = useAppContext();

    // Form State for Create/Edit
    const [formData, setFormData] = useState<PersonalFund>({
        id: '',
        name: '',
        icon: 'target',
        color: 'blue',
        currentAmount: 0,
        goal: 1000,
        bankName: 'Banco Principal',
        monthlyContribution: 100,
        lastUpdated: new Date().toISOString()
    });

    // LOAD DATA & MIGRATE FROM LOCALSTORAGE TO FIRESTORE
    useEffect(() => {
        // 1. Subscribe to Firestore (Real-time sync)
        const unsubscribe = subscribeToCollection(TABLE_NAMES.PERSONAL_FUNDS, (data) => {
            setFunds(data as PersonalFund[]);
        });

        // 2. Migration Logic: Check for old local storage data
        const checkMigration = async () => {
            // Check for new format in local storage
            const localFunds = localStorage.getItem('bm_personal_funds');
            const legacyVacation = localStorage.getItem('bm_personal_vacation');

            if (localFunds) {
                try {
                    const parsed = JSON.parse(localFunds);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        showToast('Sincronizando datos locales con la nube...', 'info');
                        // Upload each fund to firestore
                        for (const fund of parsed) {
                            const { id, ...rest } = fund; // Remove local ID, let Firestore generate new one
                            await addDocument(TABLE_NAMES.PERSONAL_FUNDS, rest);
                        }
                        showToast('Migración completada. Datos asegurados en la nube.', 'success');
                    }
                    localStorage.removeItem('bm_personal_funds'); // Clear local
                } catch (e) { console.error(e); }
            } else if (legacyVacation) {
                // Check for very old single vacation legacy
                try {
                    const oldData = JSON.parse(legacyVacation);
                    showToast('Migrando fondo de vacaciones a la nube...', 'info');
                    await addDocument(TABLE_NAMES.PERSONAL_FUNDS, {
                        name: 'Mis Vacaciones',
                        icon: 'plane',
                        color: 'cyan',
                        currentAmount: oldData.currentAmount || 0,
                        goal: oldData.goal || 3000,
                        bankName: oldData.bankName || 'Banco Principal',
                        monthlyContribution: oldData.monthlyContribution || 100,
                        lastUpdated: new Date().toISOString()
                    });
                    localStorage.removeItem('bm_personal_vacation');
                    showToast('Fondo de vacaciones migrado exitosamente.', 'success');
                } catch (e) { console.error(e); }
            }
        };

        checkMigration();

        return () => unsubscribe();
    }, []);

    const handleSaveFund = async () => {
        if (!formData.name) return;
        setIsSaving(true);
        try {
            const { id, ...dataToSave } = formData;
            if (isEditingFund && id) {
                await updateDocument(TABLE_NAMES.PERSONAL_FUNDS, id, { 
                    ...dataToSave,
                    lastUpdated: new Date().toISOString()
                });
                showToast('Apartado actualizado en la nube.', 'success');
            } else {
                await addDocument(TABLE_NAMES.PERSONAL_FUNDS, {
                    ...dataToSave,
                    lastUpdated: new Date().toISOString()
                });
                showToast('Nuevo apartado creado en la nube.', 'success');
            }
            
            setIsCreating(false);
            setIsEditingFund(false);
            setFormData({ ...formData, id: '' }); // Reset ID
        } catch (e: any) {
            showToast('Error al guardar: ' + e.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteFund = async (id: string) => {
        if (confirm('¿Estás seguro de eliminar este apartado? Se borrará permanentemente de la base de datos.')) {
            try {
                await deleteDocument(TABLE_NAMES.PERSONAL_FUNDS, id);
                setSelectedFundId(null);
                setIsEditingFund(false);
                showToast('Apartado eliminado.', 'info');
            } catch (e: any) {
                showToast('Error al eliminar: ' + e.message, 'error');
            }
        }
    };

    const handleQuickAdd = async (fundId: string) => {
        const fund = funds.find(f => f.id === fundId);
        if (!fund) return;

        try {
            await updateDocument(TABLE_NAMES.PERSONAL_FUNDS, fundId, {
                currentAmount: fund.currentAmount + fund.monthlyContribution,
                lastUpdated: new Date().toISOString()
            });
            showToast(`Añadidos ${formatCurrency(fund.monthlyContribution)} a ${fund.name}`, 'success');
        } catch (e: any) {
            showToast('Error de conexión: ' + e.message, 'error');
        }
    };

    const activeFund = funds.find(f => f.id === selectedFundId);
    const styles = activeFund ? COLOR_STYLES[activeFund.color] : COLOR_STYLES.blue;
    const ActiveIcon = activeFund ? (ICON_MAP[activeFund.icon] || Target) : Target;

    // --- VIEW: DASHBOARD (List of Funds) ---
    if (!selectedFundId && !isCreating) {
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                    <div>
                        <h2 className="text-xl font-heading font-bold text-white flex items-center gap-2">
                            <Umbrella className="text-cyan-400" /> Finanzas Personales
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-slate-400 text-sm">Tus metas y ahorros privados.</p>
                            <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded-full text-green-400 flex items-center gap-1 border border-slate-600">
                                <Cloud size={10} /> Sincronizado en Nube
                            </span>
                        </div>
                    </div>
                    <button 
                        onClick={() => {
                            setFormData({
                                id: '', name: '', icon: 'target', color: 'blue',
                                currentAmount: 0, goal: 1000, bankName: 'Banco Principal',
                                monthlyContribution: 100, lastUpdated: new Date().toISOString()
                            });
                            setIsCreating(true);
                        }}
                        className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-lg shadow-primary-900/20"
                    >
                        <Plus size={18} /> Crear Apartado
                    </button>
                </div>

                {funds.length === 0 ? (
                    <div className="text-center py-16 bg-slate-800/30 rounded-2xl border border-dashed border-slate-700">
                        <div className="bg-slate-800 p-4 rounded-full inline-block mb-4">
                            <Target size={32} className="text-slate-500" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-300">No tienes apartados creados</h3>
                        <p className="text-slate-500 text-sm mb-4">Crea tu primer fondo para vacaciones, emergencias o compras. Se guardará de forma segura en la nube.</p>
                        <button onClick={() => setIsCreating(true)} className="text-primary-400 font-bold text-sm hover:underline">Crear ahora</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {funds.map(fund => {
                            const FundIcon = ICON_MAP[fund.icon] || Target;
                            const fStyle = COLOR_STYLES[fund.color] || COLOR_STYLES.blue;
                            const percent = Math.min(100, (fund.currentAmount / fund.goal) * 100);
                            
                            return (
                                <div 
                                    key={fund.id}
                                    onClick={() => setSelectedFundId(fund.id)}
                                    className={`bg-slate-800 rounded-xl p-5 border border-slate-700 hover:border-${fund.color}-500/50 cursor-pointer transition-all hover:-translate-y-1 group relative overflow-hidden`}
                                >
                                    <div className={`absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-500 ${fStyle.text}`}>
                                        <FundIcon size={80} />
                                    </div>
                                    
                                    <div className="flex justify-between items-start mb-4 relative z-10">
                                        <div className={`p-3 rounded-lg bg-slate-900 ${fStyle.text}`}>
                                            <FundIcon size={24} />
                                        </div>
                                        {percent >= 100 && <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-1 rounded-full border border-emerald-500/30">COMPLETADO</span>}
                                    </div>
                                    
                                    <div className="relative z-10">
                                        <h3 className="font-bold text-slate-200 text-lg mb-0.5 truncate">{fund.name}</h3>
                                        <p className="text-slate-500 text-xs mb-3">{fund.bankName}</p>
                                        
                                        <div className="flex items-baseline gap-1 mb-2">
                                            <span className="text-2xl font-bold text-white">{formatCurrency(fund.currentAmount)}</span>
                                            <span className="text-xs text-slate-500">/ {formatCurrency(fund.goal)}</span>
                                        </div>

                                        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                            <div className={`h-full bg-gradient-to-r ${fStyle.bar}`} style={{ width: `${percent}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    // --- VIEW: CREATE / EDIT FORM ---
    if (isCreating || isEditingFund) {
        return (
            <div className="max-w-2xl mx-auto bg-slate-800 rounded-2xl border border-slate-700 p-6 sm:p-8 animate-fade-in">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        {isEditingFund ? <Edit2 size={20} className="text-primary-400"/> : <Plus size={20} className="text-primary-400"/>}
                        {isEditingFund ? 'Editar Apartado' : 'Nuevo Apartado'}
                    </h2>
                    <button onClick={() => { setIsCreating(false); setIsEditingFund(false); }} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400"><X size={20}/></button>
                </div>

                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nombre del Objetivo</label>
                            <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-primary-500 outline-none" placeholder="Ej: Coche Nuevo" />
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Monto Actual (€)</label>
                            <input type="number" value={formData.currentAmount} onChange={e => setFormData({...formData, currentAmount: parseFloat(e.target.value) || 0})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-primary-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Meta Final (€)</label>
                            <input type="number" value={formData.goal} onChange={e => setFormData({...formData, goal: parseFloat(e.target.value) || 0})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-primary-500 outline-none" />
                        </div>
                        
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Banco / Ubicación</label>
                            <input type="text" value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-primary-500 outline-none" placeholder="Ej: Cuenta Naranja, Efectivo..." />
                        </div>
                        
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Aporte Mensual Planeado (€)</label>
                            <input type="number" value={formData.monthlyContribution} onChange={e => setFormData({...formData, monthlyContribution: parseFloat(e.target.value) || 0})} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-primary-500 outline-none" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Icono y Tema</label>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {Object.keys(ICON_MAP).map(iconKey => {
                                const Ico = ICON_MAP[iconKey];
                                return (
                                    <button 
                                        key={iconKey}
                                        onClick={() => setFormData({...formData, icon: iconKey})}
                                        className={`p-2 rounded-lg border ${formData.icon === iconKey ? 'bg-primary-600 text-white border-primary-500' : 'bg-slate-700 text-slate-400 border-slate-600 hover:bg-slate-600'}`}
                                    >
                                        <Ico size={18} />
                                    </button>
                                )
                            })}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {Object.keys(COLOR_STYLES).map(colorKey => (
                                <button 
                                    key={colorKey}
                                    onClick={() => setFormData({...formData, color: colorKey as any})}
                                    className={`w-8 h-8 rounded-full border-2 ${formData.color === colorKey ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                    style={{ backgroundColor: colorKey === 'cyan' ? '#06b6d4' : colorKey === 'purple' ? '#a855f7' : colorKey === 'emerald' ? '#10b981' : colorKey === 'orange' ? '#f97316' : colorKey === 'rose' ? '#f43f5e' : '#3b82f6' }}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-between pt-4 border-t border-slate-700">
                        {isEditingFund && (
                            <button onClick={() => handleDeleteFund(formData.id)} className="text-red-400 hover:text-red-300 text-sm font-bold flex items-center gap-2">
                                <Trash2 size={16} /> Eliminar
                            </button>
                        )}
                        <div className="flex gap-2 ml-auto">
                            <button onClick={() => { setIsCreating(false); setIsEditingFund(false); }} className="px-4 py-2 text-slate-400 hover:text-white font-bold text-sm">Cancelar</button>
                            <button onClick={handleSaveFund} disabled={isSaving} className="px-6 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-bold text-sm shadow-lg flex items-center gap-2">
                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- VIEW: DETAIL (Active Fund) ---
    if (activeFund) {
        const percent = Math.min(100, (activeFund.currentAmount / activeFund.goal) * 100);
        
        return (
            <div className={`bg-gradient-to-br ${styles.bg} border ${styles.border} rounded-3xl p-1 relative overflow-hidden shadow-2xl animate-fade-in`}>
                <div className={`absolute top-0 right-0 p-8 opacity-10 pointer-events-none ${styles.text}`}>
                    <ActiveIcon size={180} />
                </div>

                <div className="bg-slate-900/60 backdrop-blur-sm rounded-[20px] p-6 sm:p-8 h-full relative z-10">
                    <button onClick={() => setSelectedFundId(null)} className="absolute top-6 left-6 text-slate-400 hover:text-white flex items-center gap-1 text-sm font-bold transition-colors">
                        <ArrowLeft size={16} /> Volver
                    </button>

                    <div className="mt-8 flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 bg-slate-800 rounded-xl ${styles.text} border border-white/5`}>
                                <ActiveIcon size={32} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-heading font-bold text-white">{activeFund.name}</h2>
                                <p className="text-sm text-slate-400 flex items-center gap-1">
                                    <Landmark size={12} />
                                    {activeFund.bankName}
                                </p>
                            </div>
                        </div>
                        
                        <button 
                            onClick={() => {
                                setFormData(activeFund);
                                setIsEditingFund(true);
                            }}
                            className="p-2 hover:bg-white/10 rounded-lg text-slate-300 transition-colors self-end sm:self-start"
                            title="Editar configuración"
                        >
                            <Edit2 size={18} />
                        </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-end gap-3 mb-4">
                        <span className="text-5xl sm:text-6xl font-heading font-bold text-white tracking-tight">
                            {formatCurrency(activeFund.currentAmount)}
                        </span>
                        <span className={`text-base mb-2 font-medium opacity-80 ${styles.text}`}>
                            de {formatCurrency(activeFund.goal)}
                        </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative h-6 bg-slate-900/50 rounded-full overflow-hidden mb-8 border border-white/5 shadow-inner">
                        <div 
                            className={`absolute top-0 left-0 h-full bg-gradient-to-r ${styles.bar} transition-all duration-1000 ease-out flex items-center justify-end px-2`}
                            style={{ width: `${percent}%` }}
                        >
                            {percent > 10 && <span className="text-[10px] font-bold text-white drop-shadow-md">{percent.toFixed(0)}%</span>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 flex flex-col justify-center">
                            <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Aporte Mensual Configurado</p>
                            <p className={`text-2xl font-bold ${styles.text}`}>+{formatCurrency(activeFund.monthlyContribution)}</p>
                            <p className="text-xs text-slate-500 mt-1">Sugerido para alcanzar la meta</p>
                        </div>
                        
                        <button 
                            onClick={() => handleQuickAdd(activeFund.id)}
                            className={`${styles.btn} text-white p-4 rounded-xl border-t border-white/10 transition-all active:scale-95 flex flex-col items-center justify-center group shadow-lg`}
                        >
                            <div className="flex items-center gap-2 font-bold text-lg mb-1">
                                <Plus size={20} className="group-hover:rotate-90 transition-transform" /> 
                                Ingresar Mes
                            </div>
                            <span className="text-xs opacity-90 font-medium bg-black/20 px-2 py-0.5 rounded">
                                Sumar {formatCurrency(activeFund.monthlyContribution)} ahora
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

// --- PROFITS CALCULATOR (Existing) ---

interface ProfitsProps {
    totalInvested: number;
    totalRecoveredCapital: number;
    totalInterestEarned: number;
    overdueAmount: number;
}

const ProfitsCalculator: React.FC<ProfitsProps> = ({ totalInvested, totalRecoveredCapital, totalInterestEarned, overdueAmount }) => {
    // REGLA DE ORO: Total Dinero Entrado (Capital + Interés) vs Total Dinero Salido (Capital Prestado)
    const totalCashIn = totalRecoveredCapital + totalInterestEarned;
    const netPosition = totalCashIn - totalInvested;
    const isBreakEvenReached = netPosition > 0;
    
    // Cálculo de "Ganancia Real Segura"
    const safeDistributableProfit = Math.max(0, netPosition - overdueAmount);
    
    const [withdrawalPercentage, setWithdrawalPercentage] = useState(0); 
    const withdrawAmount = safeDistributableProfit * (withdrawalPercentage / 100);

    const progressPercent = totalInvested > 0 ? Math.min(100, (totalCashIn / totalInvested) * 100) : 0;

    return (
        <div className="space-y-6 animate-fade-in">
            
            {/* Header Section */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-6 rounded-2xl shadow-xl">
                <div className="flex flex-col md:flex-row gap-6 justify-between items-start">
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl ${isBreakEvenReached ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                            {isBreakEvenReached ? <Scale size={32} /> : <Lock size={32} />}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Análisis de Retorno de Inversión (ROI)</h2>
                            <p className="text-slate-400 text-sm mt-1 max-w-lg">
                                Aplicando la <strong>Regla de Oro</strong>: No retires ganancias hasta que tu flujo de caja haya cubierto tu inversión inicial.
                            </p>
                        </div>
                    </div>
                    
                    <div className="text-right bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                        <p className="text-xs text-slate-500 uppercase font-bold">Posición Neta Actual</p>
                        <p className={`text-2xl font-mono font-bold ${netPosition >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {netPosition >= 0 ? '+' : ''}{formatCurrency(netPosition)}
                        </p>
                    </div>
                </div>

                {/* Progress Bar To Break Even */}
                <div className="mt-8">
                    <div className="flex justify-between text-sm mb-2 font-medium">
                        <span className="text-slate-400">Progreso Recuperación Capital</span>
                        <span className={isBreakEvenReached ? "text-emerald-400" : "text-amber-400"}>{progressPercent.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-4 bg-slate-700 rounded-full overflow-hidden border border-slate-600 relative">
                        {/* Marker for Break Even */}
                        <div className="absolute top-0 bottom-0 w-0.5 bg-white/30 z-10 left-[100%]" style={{ left: '100%' }}></div>
                        <div 
                            className={`h-full transition-all duration-1000 ${isBreakEvenReached ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-600 to-amber-400'}`} 
                            style={{ width: `${progressPercent}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>$0</span>
                        <span>Meta: {formatCurrency(totalInvested)} (Invertido)</span>
                    </div>
                </div>
            </div>

            {/* Decision Engine */}
            {!isBreakEvenReached ? (
                // SCENARIO 1: STILL RECOVERING (LOCKED)
                <div className="bg-red-900/10 border border-red-500/20 p-6 rounded-2xl flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                    <div className="p-4 bg-red-500/10 rounded-full text-red-400 animate-pulse">
                        <AlertTriangle size={40} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-red-200 mb-2">Fase de Acumulación: NO RETIRAR</h3>
                        <p className="text-slate-300 text-sm mb-4">
                            Aún no has recuperado tu capital inicial. Todo el dinero que entra (capital + intereses) debe reinvertirse para cubrir el dinero que salió de tu bolsillo.
                        </p>
                        <div className="bg-slate-900/50 p-4 rounded-xl inline-block border border-red-500/20">
                            <p className="text-xs text-slate-400 uppercase">Te falta recuperar</p>
                            <p className="text-xl font-bold text-white">{formatCurrency(Math.abs(netPosition))}</p>
                        </div>
                    </div>
                </div>
            ) : (
                // SCENARIO 2: PROFITABLE (UNLOCKED)
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-slate-800 border border-slate-700 p-6 rounded-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <ShieldCheck className="text-emerald-400" size={24} />
                            <h3 className="text-lg font-bold text-white">Calculadora de Dividendos Seguros</h3>
                        </div>

                        {safeDistributableProfit <= 0 ? (
                             <div className="p-4 bg-amber-900/20 border border-amber-500/30 rounded-xl text-amber-200 text-sm flex items-start gap-3">
                                <AlertTriangle className="shrink-0 mt-0.5" />
                                <div>
                                    <strong>Precaución:</strong> Aunque has recuperado tu capital, tienes deudas vencidas ({formatCurrency(overdueAmount)}) que superan tu ganancia libre. Se recomienda usar el excedente para cubrir estas posibles pérdidas antes de retirar.
                                </div>
                             </div>
                        ) : (
                            <>
                                <div className="mb-6">
                                    <label className="block text-sm font-bold text-slate-300 mb-2">
                                        ¿Cuánto quieres pagarte? ({withdrawalPercentage}%)
                                    </label>
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="100" 
                                        step="10"
                                        value={withdrawalPercentage}
                                        onChange={(e) => setWithdrawalPercentage(parseInt(e.target.value))}
                                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                    />
                                    <div className="flex justify-between mt-2 text-xs text-slate-500">
                                        <span>Reinvertir Todo</span>
                                        <span>Retirar Máximo Seguro</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-emerald-900/20 border border-emerald-500/30 p-4 rounded-xl">
                                        <p className="text-xs text-emerald-400 font-bold uppercase mb-1">A tu Bolsillo</p>
                                        <p className="text-2xl font-bold text-white">{formatCurrency(withdrawAmount)}</p>
                                    </div>
                                    <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl">
                                        <p className="text-xs text-blue-400 font-bold uppercase mb-1">Reinvertir en Negocio</p>
                                        <p className="text-2xl font-bold text-white">{formatCurrency(safeDistributableProfit - withdrawAmount)}</p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl flex flex-col justify-center space-y-4 text-sm">
                        <h4 className="font-bold text-white border-b border-slate-700 pb-2">Desglose de Lógica</h4>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Capital Invertido:</span>
                            <span className="text-slate-200">{formatCurrency(totalInvested)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Total Recuperado:</span>
                            <span className="text-emerald-400">+{formatCurrency(totalCashIn)}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-700 pt-2">
                            <span className="text-slate-300">Posición Neta:</span>
                            <span className="text-white font-bold">{formatCurrency(netPosition)}</span>
                        </div>
                        <div className="flex justify-between text-red-300">
                            <span className="flex items-center gap-1"><AlertTriangle size={12}/> Reserva Riesgo (Vencido):</span>
                            <span>-{formatCurrency(overdueAmount)}</span>
                        </div>
                        <div className="bg-slate-900 p-3 rounded-lg flex justify-between items-center mt-2">
                            <span className="text-emerald-400 font-bold uppercase text-xs">Disponible Real:</span>
                            <span className="text-xl font-bold text-white">{formatCurrency(Math.max(0, netPosition - overdueAmount))}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const Accounting: React.FC = () => {
    const { loans, archivedLoans, hasMoreArchivedLoans, loadAllHistory, allHistoryLoaded, recalculateTreasury } = useDataContext(); // Added recalculateTreasury
    const { showToast } = useAppContext();
    const [activeTab, setActiveTab] = useState<'global' | 'profits' | 'personal'>('global');
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    
    // Treasury Config State
    const [treasurySettings, setTreasurySettings] = useState<TreasuryConfig>({
        bankName: 'Banco',
        bankBalance: 0,
        cashBalance: 0
    });
    const [isEditingTreasury, setIsEditingTreasury] = useState(false);
    
    // Time Filtering
    const [timeRange, setTimeRange] = useState<'all' | 'year' | 'month'>('all');

    // Real-time subscription to Treasury
    useEffect(() => {
        const unsubscribe = subscribeToCollection(TABLE_NAMES.TREASURY, (data) => {
            const mainDoc = data.find(d => d.id === 'main');
            if (mainDoc) {
                // Ensure values are numbers to prevent NaN in UI
                setTreasurySettings({
                    bankName: mainDoc.bankName || 'Banco',
                    bankBalance: Number(mainDoc.bankBalance) || 0,
                    cashBalance: Number(mainDoc.cashBalance) || 0
                });
            }
        });
        return () => unsubscribe();
    }, []);

    const handleUpdateTreasury = async () => {
        try {
            await setDocument(TABLE_NAMES.TREASURY, 'main', treasurySettings);
            setIsEditingTreasury(false);
            showToast('Tesorería actualizada correctamente.', 'success');
        } catch (e: any) {
            showToast('Error al actualizar tesorería: ' + e.message, 'error');
        }
    };

    const handleRecalculate = async () => {
        if(confirm("Esta acción escaneará todo el historial de préstamos (excluyendo clientes de prueba) y reescribirá el saldo actual con la suma exacta. ¿Continuar?")) {
            await recalculateTreasury();
            setIsEditingTreasury(false);
        }
    };

    // Filter ALL LOANS to EXCLUDE test clients from accounting stats
    const allLoans = useMemo(() => {
        const raw = [...loans, ...archivedLoans];
        return raw.filter(l => {
            const name = l.clientName.toLowerCase();
            return !name.includes('prueba') && !name.includes('test');
        });
    }, [loans, archivedLoans]);

    const stats = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        let totalInvested = 0; // Cumulative (Snapshot)
        let currentOutstanding = 0; // Snapshot
        let overdueAmount = 0; // Snapshot
        
        let periodRecoveredCapital = 0; // Flow (Filtered)
        let periodInterestEarned = 0; // Flow (Filtered)
        let forecastedMonthlyIncome = 0;

        // Cumulative Historical Totals (For Ratio Calculation)
        let historicalTotalCapitalRecovered = 0;
        let historicalTotalInterestEarned = 0;

        // 1. Snapshot Metrics (Always Total Active)
        allLoans.forEach(loan => {
            if (!loan.archived) {
                // If active or overdue, it contributes to current portfolio risk/value
                if (loan.status !== 'Pagado') {
                    currentOutstanding += loan.remainingCapital;
                    forecastedMonthlyIncome += loan.remainingCapital * 0.08;
                    if (loan.status === 'Vencido') {
                        overdueAmount += loan.remainingCapital;
                    }
                }
            }
            // Invested is always total historical for context
            totalInvested += (loan.initialCapital || loan.amount);
            
            // Calculate Historical Totals for Ratio
            if (loan.paymentHistory) {
                loan.paymentHistory.forEach(payment => {
                    historicalTotalCapitalRecovered += payment.capitalPaid;
                    historicalTotalInterestEarned += payment.interestPaid;
                });
            }
        });

        // 2. Flow Metrics (Filtered by Date)
        allLoans.forEach(loan => {
            if (loan.paymentHistory) {
                loan.paymentHistory.forEach(payment => {
                    const payDate = new Date(payment.date);
                    let include = false;

                    if (timeRange === 'all') include = true;
                    else if (timeRange === 'year') include = payDate.getFullYear() === currentYear;
                    else if (timeRange === 'month') include = payDate.getMonth() === currentMonth && payDate.getFullYear() === currentYear;

                    if (include) {
                        periodRecoveredCapital += payment.capitalPaid;
                        periodInterestEarned += payment.interestPaid;
                    }
                });
            }
        });

        const defaultRate = currentOutstanding > 0 ? (overdueAmount / currentOutstanding) * 100 : 0;

        // Calculate Ratio based on filtered (or historical if filter is all)
        // Using historical totals gives a better "average behavior" of the portfolio
        const totalInflow = historicalTotalCapitalRecovered + historicalTotalInterestEarned;
        const profitRatio = totalInflow > 0 ? (historicalTotalInterestEarned / totalInflow) : 0;
        const capitalRatio = totalInflow > 0 ? (historicalTotalCapitalRecovered / totalInflow) : 1;

        return {
            totalInvested,
            periodRecoveredCapital,
            periodInterestEarned,
            currentOutstanding,
            forecastedMonthlyIncome,
            overdueAmount,
            defaultRate,
            profitRatio,
            capitalRatio
        };
    }, [allLoans, timeRange]);

    // Data for Monthly Cash Flow Chart
    const monthlyData = useMemo(() => {
        const data: Record<string, { name: string, capital: number, interes: number, total: number }> = {};

        allLoans.forEach(loan => {
            if (loan.paymentHistory) {
                loan.paymentHistory.forEach(payment => {
                    const date = new Date(payment.date);
                    // Filter logic for chart
                    
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

        return Object.entries(data)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([_, val]) => val)
            .slice(-12); 
    }, [allLoans]);

    // Data for Pie Chart
    const distributionData = [
        { name: 'Capital Retornado', value: stats.periodRecoveredCapital, color: '#3b82f6' }, 
        { name: 'Interés Ganado', value: stats.periodInterestEarned, color: '#10b981' }, 
        { name: 'Pendiente (Deuda)', value: stats.currentOutstanding, color: '#ef4444' }, 
    ];

    const handleLoadFullHistory = async () => {
        setIsLoadingHistory(true);
        await loadAllHistory();
        setIsLoadingHistory(false);
    };

    const getFilterLabel = () => {
        if (timeRange === 'month') return 'Este Mes';
        if (timeRange === 'year') return 'Este Año';
        return 'Histórico Total';
    }

    const currentTotalTreasury = treasurySettings.bankBalance + treasurySettings.cashBalance;
    const estimatedProfitInTreasury = currentTotalTreasury * stats.profitRatio;
    const estimatedCapitalInTreasury = currentTotalTreasury * stats.capitalRatio;

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-heading font-bold text-white flex items-center gap-3">
                        <PieIcon className="text-primary-400" size={32} />
                        Contabilidad
                    </h1>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
                        <p className="text-slate-400">Análisis financiero y gestión de utilidades.</p>
                        <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20 font-bold self-start sm:self-auto">
                            Excluye Clientes de Prueba
                        </span>
                    </div>
                </div>
                
                <div className="flex gap-2">
                    {!allHistoryLoaded && hasMoreArchivedLoans && (
                        <button 
                            onClick={handleLoadFullHistory}
                            disabled={isLoadingHistory}
                            className="flex items-center gap-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
                        >
                            {isLoadingHistory ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <Database size={16} />}
                            <span className="hidden sm:inline">Cargar Historial</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-col sm:flex-row border-b border-slate-700 mb-6 gap-4 sm:gap-0 justify-between items-end sm:items-center">
                <div className="flex space-x-4 w-full sm:w-auto overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('global')}
                        className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'global' ? 'border-primary-500 text-primary-400' : 'border-transparent text-slate-400 hover:text-white'}`}
                    >
                        <BarChart3 size={16} /> Visión Global
                    </button>
                    <button
                        onClick={() => setActiveTab('profits')}
                        className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'profits' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-white'}`}
                    >
                        <Coins size={16} /> Mis Ganancias
                    </button>
                    <button
                        onClick={() => setActiveTab('personal')}
                        className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'personal' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-slate-400 hover:text-white'}`}
                    >
                        <Umbrella size={16} /> Finanzas Personales
                    </button>
                </div>

                {activeTab === 'global' && (
                    <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700 w-full sm:w-auto">
                        <button onClick={() => setTimeRange('month')} className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${timeRange === 'month' ? 'bg-primary-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Mes</button>
                        <button onClick={() => setTimeRange('year')} className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${timeRange === 'year' ? 'bg-primary-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Año</button>
                        <button onClick={() => setTimeRange('all')} className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${timeRange === 'all' ? 'bg-primary-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Total</button>
                    </div>
                )}
            </div>

            {activeTab === 'personal' && (
                <div className="max-w-6xl mx-auto">
                    <PersonalFinanceManager />
                </div>
            )}

            {activeTab === 'profits' && (
                <ProfitsCalculator 
                    totalInvested={stats.totalInvested} // Always Total for ROI calc
                    totalRecoveredCapital={allLoans.reduce((acc, l) => acc + (l.totalCapitalPaid || 0), 0)} // Total
                    totalInterestEarned={allLoans.reduce((acc, l) => acc + (l.totalInterestPaid || 0), 0)} // Total
                    overdueAmount={stats.overdueAmount} // Current Snapshot
                />
            )}

            {activeTab === 'global' && (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        <KPICard 
                            title={`Interés Ganado (${getFilterLabel()})`}
                            value={formatCurrency(stats.periodInterestEarned)} 
                            subtext="Beneficio Bruto (Real)"
                            icon={TrendingUp} 
                            color="emerald" 
                        />
                        <KPICard 
                            title={`Capital Retornado (${getFilterLabel()})`}
                            value={formatCurrency(stats.periodRecoveredCapital)} 
                            subtext="Dinero Recuperado (No Gastar)"
                            icon={Wallet} 
                            color="blue" 
                        />
                        <KPICard 
                            title="Tasa de Morosidad" 
                            value={`${stats.defaultRate.toFixed(1)}%`}
                            subtext={`Vencido: ${formatCurrency(stats.overdueAmount)}`}
                            icon={AlertTriangle} 
                            color={stats.defaultRate > 15 ? 'red' : 'amber'} 
                            isRisk={stats.defaultRate > 15}
                        />
                        <KPICard 
                            title="Proyección Mes" 
                            value={formatCurrency(stats.forecastedMonthlyIncome)} 
                            subtext="Si todos pagan (8% s/ deuda)"
                            icon={BarChart3} 
                            color="indigo" 
                        />
                    </div>

                    {/* Treasury Breakdown */}
                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Wallet size={20} className="text-primary-400" />
                                Tesorería y Flujo de Caja
                            </h3>
                            <button 
                                onClick={() => setIsEditingTreasury(!isEditingTreasury)}
                                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-600 transition-colors"
                            >
                                <Edit3 size={14} /> Configurar
                            </button>
                        </div>

                        {isEditingTreasury && (
                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-600 mb-6 animate-fade-in-down">
                                <h4 className="text-sm font-bold text-slate-300 mb-3 uppercase">Arqueo de Caja / Ajuste Manual</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Nombre Banco</label>
                                        <input type="text" value={treasurySettings.bankName} onChange={e => setTreasurySettings({...treasurySettings, bankName: e.target.value})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Saldo en Banco (€)</label>
                                        <input type="number" value={treasurySettings.bankBalance} onChange={e => setTreasurySettings({...treasurySettings, bankBalance: parseFloat(e.target.value) || 0})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Saldo en Efectivo (€)</label>
                                        <input type="number" value={treasurySettings.cashBalance} onChange={e => setTreasurySettings({...treasurySettings, cashBalance: parseFloat(e.target.value) || 0})} className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm" />
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row justify-between gap-4 border-t border-slate-700 pt-3">
                                    <button 
                                        onClick={handleRecalculate}
                                        className="px-4 py-1.5 bg-blue-600/20 text-blue-300 border border-blue-500/30 text-xs font-bold rounded-lg hover:bg-blue-600/30 flex items-center gap-2"
                                    >
                                        <RefreshCw size={14} /> Auditar y Recalcular Saldos
                                    </button>
                                    <div className="flex gap-2 justify-end">
                                        <button onClick={() => setIsEditingTreasury(false)} className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white">Cancelar</button>
                                        <button onClick={handleUpdateTreasury} className="px-4 py-1.5 bg-primary-600 text-white text-xs font-bold rounded-lg hover:bg-primary-500">Guardar Cambios</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                            <div className="bg-slate-900/30 border border-slate-700 p-4 rounded-xl flex items-center gap-4">
                                <div className="p-3 bg-slate-800 rounded-full text-slate-400">
                                    <Banknote size={24} />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase font-bold">Disponible en Efectivo</p>
                                    <p className="text-xl font-bold text-white">{formatCurrency(treasurySettings.cashBalance)}</p>
                                </div>
                            </div>
                            <div className="bg-slate-900/30 border border-slate-700 p-4 rounded-xl flex items-center gap-4">
                                <div className="p-3 bg-slate-800 rounded-full text-slate-400">
                                    <CreditCard size={24} />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase font-bold">Disponible en {treasurySettings.bankName || 'Banco'}</p>
                                    <p className="text-xl font-bold text-white">{formatCurrency(treasurySettings.bankBalance)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Treasury Breakdown Logic */}
                        <div className="bg-black/20 rounded-xl p-4 border border-slate-700/50">
                            <div className="flex justify-between items-end mb-2">
                                <h4 className="text-sm font-bold text-slate-300">Composición Estimada del Flujo de Caja</h4>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-500 uppercase">Liquidez Total</p>
                                    <p className="text-lg font-bold text-white">{formatCurrency(currentTotalTreasury)}</p>
                                </div>
                            </div>
                            
                            <div className="flex h-3 w-full rounded-full overflow-hidden mb-3">
                                <div style={{ width: `${stats.capitalRatio * 100}%` }} className="bg-blue-500" title="Capital"></div>
                                <div style={{ width: `${stats.profitRatio * 100}%` }} className="bg-emerald-500" title="Ganancia"></div>
                            </div>

                            <div className="flex justify-between gap-4">
                                <div className="flex-1 bg-blue-900/20 p-3 rounded-lg border border-blue-500/20">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                        <p className="text-xs text-blue-300 font-bold uppercase">Capital Operativo</p>
                                    </div>
                                    <p className="text-lg font-bold text-white">{formatCurrency(estimatedCapitalInTreasury)}</p>
                                    <p className="text-[10px] text-slate-400 mt-1">Dinero para prestar (No gastar)</p>
                                </div>
                                
                                <div className="flex-1 bg-emerald-900/20 p-3 rounded-lg border border-emerald-500/20">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                        <p className="text-xs text-emerald-300 font-bold uppercase">Beneficio Neto</p>
                                    </div>
                                    <p className="text-lg font-bold text-white">{formatCurrency(estimatedProfitInTreasury)}</p>
                                    <p className="text-[10px] text-slate-400 mt-1">Disponible para retiro</p>
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-3 text-center italic">
                                * Estimación basada en el ratio histórico de tu cartera ({stats.capitalRatio.toFixed(2) * 100}% capital / {stats.profitRatio.toFixed(2) * 100}% interés).
                            </p>
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        
                        {/* Monthly Cash Flow */}
                        <div className="xl:col-span-2 bg-slate-800 p-4 sm:p-6 rounded-2xl border border-slate-700 shadow-lg overflow-hidden">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <TrendingUp size={20} className="text-primary-400" />
                                Flujo de Caja (Histórico 12 Meses)
                            </h3>
                            <div className="h-[250px] sm:h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `€${val}`} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                                            formatter={(value: number) => formatCurrency(value)}
                                        />
                                        <Legend wrapperStyle={{fontSize: '12px', paddingTop: '10px'}}/>
                                        <Bar dataKey="capital" name="Capital Retornado" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
                                        <Bar dataKey="interes" name="Interés (Ganancia)" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Distribution Pie */}
                        <div className="bg-slate-800 p-4 sm:p-6 rounded-2xl border border-slate-700 shadow-lg flex flex-col overflow-hidden">
                            <div className="flex justify-between items-start mb-6">
                                <h3 className="text-lg font-bold text-white">Estado Actual</h3>
                                <span className="text-[10px] bg-slate-700 px-2 py-1 rounded text-slate-300">Según Filtro</span>
                            </div>
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
                                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{fontSize: '12px'}}/>
                                    </PieChart>
                                </ResponsiveContainer>
                                {/* Center Text */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                                    <div className="text-center">
                                        <p className="text-xs text-slate-400 font-bold uppercase">Entrada Neta</p>
                                        <p className="text-lg sm:text-xl font-bold text-white">{formatCurrency(stats.periodRecoveredCapital + stats.periodInterestEarned)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Breakdown */}
                    <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-lg overflow-hidden">
                        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-white">Desglose de Cartera Activa</h3>
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <Info size={14} />
                                <span>Datos en tiempo real (Filtrados)</span>
                            </div>
                        </div>
                        
                        {/* Mobile View: Cards */}
                        <div className="md:hidden">
                            <div className="divide-y divide-slate-700">
                                {allLoans.filter(l => !l.archived).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()).map(loan => (
                                    <div key={loan.id} className="p-4 flex flex-col gap-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-white text-base truncate max-w-[180px]">{loan.clientName}</p>
                                                <div className="flex items-center text-xs text-slate-500 mt-0.5 gap-1">
                                                    <Calendar size={12} />
                                                    {new Date(loan.startDate).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${
                                                loan.status === 'Pagado' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                                                loan.status === 'Vencido' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                                'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                            }`}>
                                                {loan.status}
                                            </span>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div className="bg-slate-900/50 p-2 rounded border border-slate-700/50">
                                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Capital Inicial</p>
                                                <p className="font-mono text-slate-300 font-medium">{formatCurrency(loan.initialCapital || loan.amount)}</p>
                                            </div>
                                            <div className="bg-slate-900/50 p-2 rounded border border-red-500/20 bg-red-900/10">
                                                <p className="text-[10px] text-red-400 uppercase tracking-wider font-bold">Pendiente</p>
                                                <p className="font-mono text-red-300 font-bold">{formatCurrency(loan.remainingCapital)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Desktop View: Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-slate-900/50 text-slate-400 uppercase font-bold text-xs">
                                    <tr>
                                        <th className="px-6 py-4">Cliente</th>
                                        <th className="px-6 py-4">Fecha Inicio</th>
                                        <th className="px-6 py-4">Capital Inicial</th>
                                        <th className="px-6 py-4 text-emerald-400">Interés Ganado (Total)</th>
                                        <th className="px-6 py-4 text-blue-400">Capital Amortizado (Total)</th>
                                        <th className="px-6 py-4 text-red-400">Deuda Pendiente</th>
                                        <th className="px-6 py-4 text-right">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {allLoans.filter(l => !l.archived).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()).map(loan => (
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
                </>
            )}
        </div>
    );
};

export default Accounting;
