
import React, { useState, useMemo } from 'react';
import { useDataContext } from '../contexts/DataContext';
import { FileText, Clock, Info, Inbox, RefreshCw, Layers, LayoutList, CheckCircle, XCircle, List, CloudFog, Loader2, ArrowDown } from 'lucide-react';
import RequestCard from './RequestCard';
import { RequestStatus } from '../types';
import { useAppContext } from '../contexts/AppContext';

const RequestList: React.FC = () => {
    const { requests, reloadRequests, loadMoreRequests } = useDataContext();
    const { setCurrentView } = useAppContext();
    const [filter, setFilter] = useState<RequestStatus | 'ALL'>('ALL'); // Default to ALL to ensure visibility
    const [expandAll, setExpandAll] = useState(false);
    const [isManualLoading, setIsManualLoading] = useState(false);

    const counts = useMemo(() => {
        const c = requests.reduce((acc, req) => {
            acc[req.status] = (acc[req.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        c['ALL'] = requests.length;
        return c;
    }, [requests]);

    const filteredRequests = useMemo(() => {
        // Sort client-side here since we removed orderBy from Firestore
        const sorted = [...requests].sort((a, b) => {
             // Handle potentially missing dates safely
             const dateA = a.requestDate ? new Date(a.requestDate).getTime() : 0;
             const dateB = b.requestDate ? new Date(b.requestDate).getTime() : 0;
             return dateB - dateA;
        });

        if (filter === 'ALL') return sorted;
        return sorted.filter(req => req.status === filter);
    }, [requests, filter]);

    const FilterTab: React.FC<{ status: RequestStatus | 'ALL'; label: string }> = ({ status, label }) => {
        const isActive = filter === status;
        const count = counts[status] || 0;
        return (
            <button
                onClick={() => setFilter(status)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all rounded-full whitespace-nowrap ${
                    isActive 
                        ? 'bg-primary-600 text-white shadow-md' 
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-slate-700'
                }`}
            >
                <span>{label}</span>
                {count > 0 && (
                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-400 border border-slate-600'}`}>
                        {count}
                    </span>
                )}
            </button>
        );
    };

    const handleForceRefresh = async () => {
        setIsManualLoading(true);
        await reloadRequests();
        setIsManualLoading(false);
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-700 pb-4">
                <div className="flex items-center gap-3">
                    <div className="bg-primary-500/10 p-2 rounded-lg">
                        <Inbox className="h-6 w-6 text-primary-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                            Solicitudes
                            <button 
                                onClick={handleForceRefresh}
                                className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-primary-400 hover:bg-slate-700 transition-colors border border-slate-700"
                                title="Sincronizar ahora"
                                disabled={isManualLoading}
                            >
                                <RefreshCw size={14} className={isManualLoading ? "animate-spin" : ""} />
                            </button>
                        </h1>
                        <p className="text-slate-400 text-xs">
                            {requests.length} en total &bull; Sincronización en la nube activa
                        </p>
                    </div>
                </div>
                
                <button
                    onClick={() => setExpandAll(!expandAll)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${expandAll ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
                >
                    {expandAll ? <LayoutList size={16} /> : <Layers size={16} />}
                    <span>{expandAll ? 'Contraer' : 'Expandir'} Detalles</span>
                </button>
            </div>
            
            <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <FilterTab status="ALL" label="Todas" />
                <FilterTab status={RequestStatus.PENDING} label="Pendientes" />
                <FilterTab status={RequestStatus.UNDER_REVIEW} label="En Estudio" />
                <FilterTab status={RequestStatus.APPROVED} label="Aprobadas" />
                <FilterTab status={RequestStatus.DENIED} label="Rechazadas" />
            </div>

            {requests.length === 0 ? (
                <div className="text-center py-16 bg-slate-800/30 rounded-xl border border-dashed border-slate-700 animate-fade-in flex flex-col items-center">
                    <div className="bg-slate-800 p-4 rounded-full mb-4 ring-1 ring-slate-700">
                        <CloudFog size={40} className="text-slate-500" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-200">Buzón Vacío</h2>
                    <p className="mt-2 text-slate-400 max-w-sm text-sm">
                        No hemos recibido datos automáticos. Si crees que esto es un error, fuerza una búsqueda manual.
                    </p>
                    <button 
                        onClick={handleForceRefresh}
                        disabled={isManualLoading}
                        className="mt-6 px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-bold transition-all shadow-lg flex items-center gap-2 text-sm"
                    >
                        {isManualLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                        Buscar Manualmente
                    </button>
                    <button 
                        onClick={() => setCurrentView('dataManagement')}
                        className="mt-4 text-xs text-slate-500 hover:text-primary-400 underline"
                    >
                        Revisar permisos de base de datos
                    </button>
                </div>
            ) : filteredRequests.length === 0 ? (
                 <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-dashed border-slate-700">
                    <Inbox size={40} className="mx-auto text-slate-600" />
                    <h2 className="mt-4 text-base font-semibold text-slate-300">Sin resultados en esta categoría</h2>
                    <p className="mt-1 text-xs text-slate-500">Intenta cambiar el filtro a "Todas".</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredRequests.map(request => (
                        <RequestCard key={request.id} request={request} forceExpand={expandAll} />
                    ))}
                    
                    <button
                        onClick={loadMoreRequests}
                        className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 rounded-xl transition-all font-medium text-sm flex items-center justify-center gap-2"
                    >
                        <ArrowDown size={16} /> Cargar más antiguas
                    </button>
                </div>
            )}
        </div>
    );
};

export default RequestList;
