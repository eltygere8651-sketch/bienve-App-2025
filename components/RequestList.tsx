import React, { useState, useMemo } from 'react';
import { useDataContext } from '../contexts/DataContext';
import { FileText, Clock, Info, CheckCircle, XCircle, Inbox } from 'lucide-react';
import RequestCard from './RequestCard';
import { RequestStatus, LoanRequest } from '../types';

const RequestList: React.FC = () => {
    const { requests } = useDataContext();
    const [filter, setFilter] = useState<RequestStatus>(RequestStatus.PENDING);

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
                className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                    isActive ? 'bg-primary-600 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                }`}
            >
                {icon}
                <span>{label}</span>
                {count > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-xs ${isActive ? 'bg-white/20' : 'bg-slate-600'}`}>{count}</span>
                )}
            </button>
        );
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">Nuevas Solicitudes</h1>
            </div>
            
            <div className="mb-6 bg-slate-800/50 p-2 rounded-xl border border-slate-700 flex flex-wrap gap-2">
                <FilterButton status={RequestStatus.PENDING} icon={<Clock size={16} />} label="Pendientes" />
                <FilterButton status={RequestStatus.UNDER_REVIEW} icon={<Info size={16} />} label="En Estudio" />
            </div>

            {requests.length === 0 ? (
                <div className="text-center py-12 bg-slate-800 rounded-lg shadow-lg border border-slate-700">
                    <FileText size={48} className="mx-auto text-slate-500" />
                    <h2 className="mt-4 text-xl font-semibold text-slate-300">No hay solicitudes</h2>
                    <p className="mt-1 text-slate-400">Cuando un nuevo cliente complete el formulario, su solicitud aparecerá aquí.</p>
                </div>
            ) : filteredRequests.length === 0 ? (
                 <div className="text-center py-12 bg-slate-800 rounded-lg shadow-lg border border-slate-700">
                    <Inbox size={48} className="mx-auto text-slate-500" />
                    <h2 className="mt-4 text-xl font-semibold text-slate-300">No hay solicitudes en esta categoría</h2>
                    <p className="mt-1 text-slate-400">Prueba seleccionando otro filtro para ver las solicitudes correspondientes.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredRequests.map(request => (
                        <RequestCard key={request.id} request={request} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default RequestList;
