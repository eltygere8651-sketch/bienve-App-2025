
import React, { useMemo, useState } from 'react';
import { Loan, LoanStatus, Client } from '../types';
import { useDataContext } from '../contexts/DataContext';
import { useAppContext } from '../contexts/AppContext';
import { Users, Download, Search, PlusCircle } from 'lucide-react';
import { generateClientReport } from '../services/pdfService';
import { formatCurrency } from '../services/utils';
import LoanDetailsModal from './LoanDetailsModal';

interface ClientWithData extends Client {
    loans: Loan[];
}

const ClientCard: React.FC<{ client: ClientWithData & { loans: Loan[] } }> = ({ client }) => {
    const totalLoaned = client.loans.reduce((acc, loan) => acc + loan.amount, 0);
    const outstandingBalance = client.loans
        .filter(loan => loan.status === LoanStatus.PENDING || loan.status === LoanStatus.OVERDUE)
        .reduce((acc, loan) => acc + (loan.totalRepayment - (loan.monthlyPayment * loan.paymentsMade)), 0);

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
            <div className="bg-white p-6 rounded-xl shadow-md transition-all hover:shadow-lg hover:scale-[1.02] flex flex-col animate-fade-in">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">{client.name}</h3>
                        <p className="text-sm text-slate-500">Cliente desde: {new Date(client.joinDate).toLocaleDateString()}</p>
                        {client.idNumber && <p className="text-sm text-slate-500 font-mono">DNI/NIE: {client.idNumber}</p>}
                    </div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4 text-center">
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold">Total Prestado</p>
                        <p className="text-lg font-bold text-slate-700">{formatCurrency(totalLoaned)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold">Saldo Pendiente</p>
                        <p className="text-lg font-bold text-slate-700">{formatCurrency(outstandingBalance)}</p>
                    </div>
                </div>
                <div className="mt-6 flex-grow">
                    <h4 className="text-sm font-semibold text-slate-600 mb-2">Historial de Préstamos ({client.loans.length})</h4>
                    {client.loans.length > 0 ? (
                        <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                            {client.loans.map(loan => (
                                <div 
                                    key={loan.id} 
                                    className="flex justify-between items-center bg-slate-50 p-2 rounded-md text-sm cursor-pointer hover:bg-slate-100"
                                    onClick={() => handleLoanClick(loan)}
                                >
                                    <span className="text-slate-700">{new Date(loan.startDate).toLocaleDateString()} - {formatCurrency(loan.amount)}</span>
                                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                                        loan.status === LoanStatus.PAID ? 'bg-green-100 text-green-800' : 
                                        loan.status === LoanStatus.PENDING ? 'bg-primary-100 text-primary-800' : 'bg-red-100 text-red-800'
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
                        className="inline-flex items-center px-4 py-2 bg-primary-100 text-primary-700 text-sm font-medium rounded-md hover:bg-primary-200"
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
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                 <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Lista de Clientes</h1>
                 <button
                    onClick={() => setCurrentView('newClient')}
                    className="inline-flex items-center justify-center px-4 py-2 bg-primary-600 text-white font-bold rounded-lg shadow-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-transform hover:scale-105"
                >
                    <PlusCircle size={18} className="mr-2" />
                    Registrar Cliente y Préstamo
                </button>
            </div>

            {clientLoanData.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow-md">
                     <Users size={48} className="mx-auto text-slate-400" />
                     <h2 className="mt-4 text-xl font-semibold text-slate-700">No hay clientes registrados</h2>
                     <p className="mt-1 text-slate-500">Cuando apruebes una solicitud de préstamo o registres un nuevo cliente, aparecerá aquí.</p>
                </div>
            ) : (
                <>
                    <div className="relative">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                         <input
                            type="text"
                            placeholder="Buscar cliente por nombre o DNI..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>
                    {filteredClients.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredClients.map(client => (
                                <ClientCard key={client.id} client={client} />
                            ))}
                        </div>
                    ) : (
                         <div className="text-center py-12 bg-white rounded-lg shadow-md">
                             <Search size={48} className="mx-auto text-slate-400" />
                             <h2 className="mt-4 text-xl font-semibold text-slate-700">No se encontraron clientes</h2>
                             <p className="mt-1 text-slate-500">Prueba con otro término de búsqueda.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ClientList;