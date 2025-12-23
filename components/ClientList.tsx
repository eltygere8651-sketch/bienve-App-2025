
import React, { useMemo, useState } from 'react';
import { Loan, LoanStatus, Client } from '../types';
import { useDataContext } from '../contexts/DataContext';
import { useAppContext } from '../contexts/AppContext';
import { Users, Download, Search, PlusCircle, Plus } from 'lucide-react';
import { generateClientReport } from '../services/pdfService';
import { formatCurrency } from '../services/utils';
import LoanDetailsModal from './LoanDetailsModal';
import NewLoanModal from './NewLoanModal';

interface ClientWithData extends Client {
    loans: Loan[];
}

interface ClientCardProps {
    client: ClientWithData;
    onAddLoan: (client: Client) => void;
}

const ClientCard: React.FC<ClientCardProps> = ({ client, onAddLoan }) => {
    const totalLoaned = client.loans.reduce((acc, loan) => acc + (loan.initialCapital || loan.amount), 0);
    const outstandingBalance = client.loans
        .filter(loan => loan.status === LoanStatus.PENDING || loan.status === LoanStatus.OVERDUE)
        .reduce((acc, loan) => acc + loan.remainingCapital, 0);

    const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

    const handleDownloadReport = () => {
        generateClientReport(client, client.loans);
    };

    const handleLoanClick = (loan: Loan) => {
        setSelectedLoan(loan);
    };
    
    const closeModal = () => {
        setSelectedLoan(null);
    };

    return (
        <>
            <LoanDetailsModal
                isOpen={!!selectedLoan}
                onClose={closeModal}
                loan={selectedLoan}
                client={client}
            />
            <div className="bg-slate-800 p-6 rounded-xl shadow-lg transition-all hover:shadow-2xl hover:scale-[1.02] flex flex-col animate-fade-in border border-slate-700">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold text-slate-100">{client.name}</h3>
                        <p className="text-sm text-slate-400">Cliente desde: {new Date(client.joinDate).toLocaleDateString()}</p>
                        {client.idNumber && <p className="text-sm text-slate-400 font-mono">DNI/NIE: {client.idNumber}</p>}
                    </div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4 text-center">
                    <div>
                        <p className="text-xs text-slate-400 uppercase font-semibold">Total Prestado</p>
                        <p className="text-lg font-bold text-slate-200">{formatCurrency(totalLoaned)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 uppercase font-semibold">Saldo Pendiente</p>
                        <p className="text-lg font-bold text-slate-200">{formatCurrency(outstandingBalance)}</p>
                    </div>
                </div>
                <div className="mt-6 flex-grow">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-semibold text-slate-300">Historial de Préstamos ({client.loans.length})</h4>
                        <button 
                            onClick={() => onAddLoan(client)}
                            className="text-xs flex items-center gap-1 bg-primary-600/20 text-primary-400 px-2 py-1 rounded hover:bg-primary-600/30 transition-colors"
                        >
                            <Plus size={12} /> Nuevo
                        </button>
                    </div>
                    {client.loans.length > 0 ? (
                        <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                            {client.loans.map(loan => (
                                <div 
                                    key={loan.id} 
                                    className="flex justify-between items-center bg-slate-700/50 p-2 rounded-md text-sm cursor-pointer hover:bg-slate-700"
                                    onClick={() => handleLoanClick(loan)}
                                >
                                    <span className="text-slate-300">{new Date(loan.startDate).toLocaleDateString()} - {formatCurrency(loan.amount)}</span>
                                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                                        loan.status === LoanStatus.PAID ? 'bg-green-500/10 text-green-400' : 
                                        loan.status === LoanStatus.PENDING ? 'bg-primary-500/10 text-primary-400' : 'bg-red-500/10 text-red-400'
                                    }`}>{loan.status}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-xs text-slate-500 py-4">Sin préstamos.</div>
                    )}
                </div>
                <div className="mt-6 text-right">
                    <button
                        onClick={handleDownloadReport}
                        className="inline-flex items-center px-4 py-2 bg-primary-500/10 text-primary-300 text-sm font-medium rounded-md hover:bg-primary-500/20"
                    >
                        <Download size={16} className="mr-2" />
                        Descargar Informe PDF
                    </button>
                </div>
            </div>
        </>
    );
};

const ClientList: React.FC = () => {
    const { clientLoanData } = useDataContext();
    const { setCurrentView } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClientForLoan, setSelectedClientForLoan] = useState<Client | null>(null);

    const filteredClients = useMemo(() => {
        if (!searchTerm) {
            return clientLoanData;
        }
        return clientLoanData.filter(client =>
            client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (client.idNumber && client.idNumber.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [clientLoanData, searchTerm]);
    
    return (
        <>
            <NewLoanModal 
                isOpen={!!selectedClientForLoan} 
                onClose={() => setSelectedClientForLoan(null)} 
                client={selectedClientForLoan} 
            />
            
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                     <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">Lista de Clientes</h1>
                     <button
                        onClick={() => setCurrentView('newClient')}
                        className="inline-flex items-center justify-center px-4 py-2 bg-primary-600 text-white font-bold rounded-lg shadow-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-transform hover:scale-105"
                    >
                        <PlusCircle size={18} className="mr-2" />
                        Registrar Cliente y Préstamo
                    </button>
                </div>

                {clientLoanData.length === 0 ? (
                    <div className="text-center py-12 bg-slate-800 rounded-lg shadow-lg border border-slate-700">
                         <Users size={48} className="mx-auto text-slate-500" />
                         <h2 className="mt-4 text-xl font-semibold text-slate-300">No hay clientes registrados</h2>
                         <p className="mt-1 text-slate-400">Cuando apruebes una solicitud de préstamo o registres un nuevo cliente, aparecerá aquí.</p>
                    </div>
                ) : (
                    <>
                        <div className="relative">
                             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                             <input
                                type="text"
                                placeholder="Buscar cliente por nombre o DNI..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-slate-100 focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>
                        {filteredClients.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredClients.map(client => (
                                    <ClientCard 
                                        key={client.id} 
                                        client={client as ClientWithData} 
                                        onAddLoan={(c) => setSelectedClientForLoan(c)}
                                    />
                                ))}
                            </div>
                        ) : (
                             <div className="text-center py-12 bg-slate-800 rounded-lg shadow-lg border border-slate-700">
                                 <Search size={48} className="mx-auto text-slate-500" />
                                 <h2 className="mt-4 text-xl font-semibold text-slate-300">No se encontraron clientes</h2>
                                 <p className="mt-1 text-slate-400">Prueba con otro término de búsqueda.</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
};

export default ClientList;
