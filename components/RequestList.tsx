import React from 'react';
import { useDataContext } from '../contexts/DataContext';
import { FileText } from 'lucide-react';
import RequestCard from './RequestCard';

const RequestList: React.FC = () => {
    const { requests } = useDataContext();

    if (requests.length === 0) {
        return (
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-6">Solicitudes</h1>
                <div className="text-center py-12 bg-slate-800 rounded-lg shadow-lg border border-slate-700">
                     <FileText size={48} className="mx-auto text-slate-500" />
                     <h2 className="mt-4 text-xl font-semibold text-slate-300">No hay solicitudes pendientes</h2>
                     <p className="mt-1 text-slate-400">Cuando un nuevo cliente complete el formulario, su solicitud aparecerá aquí.</p>
                </div>
            </div>
        )
    }

    return (
        <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-6">Solicitudes ({requests.length})</h1>
            <div className="space-y-4">
                {requests.map(request => (
                    <RequestCard key={request.id} request={request} />
                ))}
            </div>
        </div>
    );
};

export default RequestList;