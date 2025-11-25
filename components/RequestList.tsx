
import React, { useState, useMemo } from 'react';
import { useDataContext } from '../contexts/DataContext';
import { FileText, Clock, Info, Inbox, RefreshCw, Layers, LayoutList } from 'lucide-react';
import RequestCard from './RequestCard';
import { RequestStatus } from '../types';
import { useAppContext } from '../contexts/AppContext';

const RequestList: React.FC = () => {
    const { requests } = useDataContext();
    const { setCurrentView } = useAppContext();
    const [filter, setFilter] = useState<RequestStatus>(RequestStatus.PENDING);
    const [expandAll, setExpandAll] = useState(false);

    const counts = useMemo(() => {
        return requests.reduce((acc, req) => {
            acc[req.status] = (acc[req.status] || 0) + 1;
            return acc;
        }, {} as Record<RequestStatus, number>);
    }, [requests]);

    const filteredRequests = useMemo(() => {
        const sorted = [...requests].sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
        return sorted.filter(req => req.status === filter);
    }, [requests, filter]);

    const FilterButton: React.FC<{ status: RequestStatus; icon: React.ReactNode; label: string }> = ({ status, icon, label }) => {
        const isActive = filter === status;
        const count = counts[status] || 0;
        return (
            <button
                onClick={() => setFilter(status)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all border ${
                    isActive 
                        ? 'bg-primary-600 text-white border-primary-500 shadow-lg shadow-primary-900/30' 
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                }`}
            >
                {icon}
                <span>{label}</span>
                {count > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-slate-900 text-slate-500'}`}>{count}</span>
                )}
            </button>
        );
    };

    const handleForceRefresh = () => {
        window.location.reload();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">Buzón de Solicitudes</h1>
                    <p className="text-slate-400 text-sm mt-1">Gestiona las peticiones de préstamo entrantes.</p>
                </div>
                <div className="flex gap-2">
                     <button
                        onClick={() => setExpandAll(!expandAll)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors border ${expandAll ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
                        title={expandAll ? "Contraer todas" : "Expandir todas"}
                    >
                        {expandAll ? <LayoutList size={18} /> : <Layers size={18} />}
                        <span className="hidden sm:inline">{expandAll ? 'Contraer Todo' : 'Expandir Todo'}</span>
                    </button>
                    <button 
                        onClick={handleForceRefresh}
                        className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                        title="Forzar actualización de datos"
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>
            
            <div className="flex flex-wrap gap-2 pb-2 border-b border-slate-700/50">
                <FilterButton status={RequestStatus.PENDING} icon={<Clock size={16} />} label="Pendientes" />
                <FilterButton status={RequestStatus.UNDER_REVIEW} icon={<Info size={16} />} label="En Estudio" />
            </div>

            {requests.length === 0 ? (
                <div className="text-center py-16 bg-slate-800/50 rounded-xl border border-dashed border-slate-700 animate-fade-in">
                    <div className="bg-slate-800 inline-flex p-4 rounded-full mb-4">
                        <FileText size={40} className="text-slate-500" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-200">No se ven solicitudes</h2>
                    <p className="mt-2 text-slate-400 max-w-md mx-auto mb-6">
                        Si tus clientes han enviado datos y no los ves aquí, es probable que necesites configurar los permisos de lectura en la consola.
                    </p>
                    <button 
                        onClick={() => setCurrentView('dataManagement')}
                        className="px-6 py-2 bg-amber-600/20 text-amber-400 border border-amber-600/50 rounded-lg hover:bg-amber-600/30 font-semibold transition-colors"
                    >
                        Ir a Configuración de Permisos
                    </button>
                </div>
            ) : filteredRequests.length === 0 ? (
                 <div className="text-center py-16 bg-slate-800/50 rounded-xl border border-dashed border-slate-700">
                    <Inbox size={48} className="mx-auto text-slate-600" />
                    <h2 className="mt-4 text-lg font-semibold text-slate-300">Bandeja Vacía</h2>
                    <p className="mt-1 text-slate-400">No hay solicitudes con el estado seleccionado.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredRequests.map(request => (
                        <RequestCard key={request.id} request={request} forceExpand={expandAll} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default RequestList;
