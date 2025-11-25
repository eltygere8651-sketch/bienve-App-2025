
import React, { useState } from 'react';
import { findRequestsById } from '../services/firebaseService';
import { Search, Loader2, Info, CheckCircle, XCircle } from 'lucide-react';
import { RequestStatus } from '../types';

interface StatusResult {
    status: RequestStatus;
    requestDate: string;
}

const RequestStatusChecker: React.FC = () => {
    const [idNumber, setIdNumber] = useState('');
    const [result, setResult] = useState<StatusResult | 'not_found' | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCheckStatus = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!idNumber.trim()) return;

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            // Simular retardo de red para UX consistente
            await new Promise(resolve => setTimeout(resolve, 600));

            const results = await findRequestsById(idNumber.trim());
            
            if (results && results.length > 0) {
                // Sort by date desc (latest first)
                results.sort((a: any, b: any) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
                setResult(results[0] as StatusResult);
            } else {
                setResult('not_found');
            }

        } catch (err: any) {
            console.error("Error checking request status:", err);
            setError("No se pudo realizar la consulta. Inténtalo de nuevo.");
        } finally {
            setIsLoading(false);
        }
    };

    const ResultDisplay: React.FC = () => {
        if (isLoading) {
            return (
                <div className="text-center p-4">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary-500" />
                    <p className="mt-2 text-slate-400">Buscando en la nube...</p>
                </div>
            );
        }
        if (error) {
            return (
                <div className="mt-6 p-4 bg-red-900/30 rounded-lg text-red-300 flex items-center border border-red-500/30">
                    <XCircle className="h-5 w-5 mr-3 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            );
        }
        if (!result) return null;

        if (result === 'not_found') {
            return (
                 <div className="mt-6 p-4 bg-yellow-900/30 rounded-lg text-yellow-300 flex items-center border border-yellow-500/30">
                    <Info className="h-5 w-5 mr-3 flex-shrink-0" />
                    <span>No se encontró ninguna solicitud con el DNI/NIE proporcionado.</span>
                </div>
            );
        }

        return (
            <div className="mt-6 p-4 bg-green-900/30 rounded-lg text-green-300 border border-green-500/30">
                <h3 className="font-bold text-lg flex items-center mb-2 text-green-200">
                    <CheckCircle className="h-6 w-6 mr-3"/>
                    Solicitud Encontrada
                </h3>
                <div className="space-y-1">
                    <p><strong>Fecha de Solicitud:</strong> {new Date(result.requestDate).toLocaleDateString('es-ES')}</p>
                    <p><strong>Estado Actual:</strong> <span className="font-bold px-2 py-1 bg-slate-700 text-slate-100 rounded-md">{result.status}</span></p>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-2xl mx-auto">
             <div className="bg-slate-800 p-6 sm:p-8 rounded-xl shadow-lg border border-slate-700">
                <div className="text-center">
                    <Search className="mx-auto h-12 w-12 text-primary-400" />
                    <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-slate-100">Consultar Estado de Solicitud</h1>
                    <p className="mt-2 text-slate-400">Introduce el DNI o NIE que usaste en tu solicitud para ver su estado actual.</p>
                </div>

                <form onSubmit={handleCheckStatus} className="mt-8 space-y-4">
                     <div>
                        <label htmlFor="idNumber" className="block text-sm font-medium text-slate-300 mb-1">
                            DNI / NIE
                        </label>
                        <input
                            id="idNumber"
                            type="text"
                            value={idNumber}
                            onChange={(e) => setIdNumber(e.target.value)}
                            required
                            placeholder="Ej: 12345678A"
                            className="w-full px-3 py-2 border border-slate-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-slate-700 text-slate-100"
                        />
                    </div>
                     <button
                        type="submit"
                        disabled={isLoading || !idNumber.trim()}
                        className="w-full inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white font-bold rounded-lg shadow-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-transform hover:scale-105 disabled:bg-primary-400 disabled:cursor-not-allowed"
                    >
                         {isLoading ? (<Loader2 className="mr-2 h-5 w-5 animate-spin" />) : (<Search className="mr-2 h-5 w-5" />)}
                         {isLoading ? 'Consultando...' : 'Consultar'}
                    </button>
                </form>

                <ResultDisplay />
            </div>
        </div>
    );
};

export default RequestStatusChecker;
