import React, { useState, useEffect } from 'react';
import { useDataContext } from '../contexts/DataContext';
import { LoanRequest, Client, Loan } from '../types';
import { ChevronDown, ChevronUp, Download, Pen } from 'lucide-react';
import { downloadPdf } from '../services/pdfService';

type Tab = 'requests' | 'clients' | 'loans';

const DataExplorer: React.FC = () => {
    const { requests, clients, loans } = useDataContext();
    const [activeTab, setActiveTab] = useState<Tab>('requests');

    const renderContent = () => {
        switch (activeTab) {
            case 'requests':
                return <RequestExplorer items={requests} />;
            case 'clients':
                return <ClientExplorer items={clients} />;
            case 'loans':
                return <LoanExplorer items={loans} />;
            default:
                return null;
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-6">Explorador de Datos</h1>
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
                <TabButton name="Solicitudes" count={requests.length} active={activeTab === 'requests'} onClick={() => setActiveTab('requests')} />
                <TabButton name="Clientes" count={clients.length} active={activeTab === 'clients'} onClick={() => setActiveTab('clients')} />
                <TabButton name="Préstamos" count={loans.length} active={activeTab === 'loans'} onClick={() => setActiveTab('loans')} />
            </div>
            {renderContent()}
        </div>
    );
};

const TabButton: React.FC<{ name: string, count: number, active: boolean, onClick: () => void }> = ({ name, count, active, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            active 
                ? 'border-blue-600 text-blue-600 dark:text-blue-400' 
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
        }`}
    >
        {name}
        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${active ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-gray-100 dark:bg-gray-700'}`}>{count}</span>
    </button>
);


const Card: React.FC<{ title: string, subtitle: string, children: React.ReactNode }> = ({ title, subtitle, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="p-4 flex justify-between items-center cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
                <div>
                    <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">{title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
                </div>
                {isOpen ? <ChevronUp /> : <ChevronDown />}
            </div>
            {isOpen && <div className="p-4 border-t border-gray-200 dark:border-gray-700">{children}</div>}
        </div>
    );
};

const ImageViewer: React.FC<{ imageBlob: File | Blob | undefined, alt: string }> = ({ imageBlob, alt }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    useEffect(() => {
        if (imageBlob instanceof Blob && imageBlob.size > 0) {
            const url = URL.createObjectURL(imageBlob);
            setImageUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [imageBlob]);
    if (!imageUrl) return <div className="rounded-lg w-full h-32 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-500">Sin Imagen</div>;
    return <img src={imageUrl} alt={alt} className="rounded-lg w-full h-auto object-cover" />;
};

const DataGrid: React.FC<{ data: Record<string, any> }> = ({ data }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {Object.entries(data).map(([key, value]) => (
            <div key={key}>
                <span className="font-semibold text-gray-600 dark:text-gray-300 capitalize">{key.replace(/([A-Z])/g, ' $1')}: </span>
                <span className="text-gray-800 dark:text-gray-100">{String(value)}</span>
            </div>
        ))}
    </div>
);

const RequestExplorer: React.FC<{ items: LoanRequest[] }> = ({ items }) => (
    <div className="space-y-4">
        {items.map(item => (
            <Card key={item.id} title={item.fullName} subtitle={`Solicitud: ${item.id}`}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        <DataGrid data={{ "Monto Solicitado": `${item.loanAmount} €`, "Motivo": item.loanReason, "DNI": item.idNumber, "Teléfono": item.phone, "Email": item.email, "Dirección": item.address, "Estado Solicitud": item.status }} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                            <div><h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Anverso DNI</h4><ImageViewer imageBlob={item.frontId} alt="Front ID" /></div>
                            <div><h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Reverso DNI</h4><ImageViewer imageBlob={item.backId} alt="Back ID" /></div>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Firma</h4>
                        {item.signature ? <div className="bg-gray-100 dark:bg-gray-700/50 p-2 rounded-lg border border-gray-200 dark:border-gray-600"><img src={item.signature} alt="Signature" /></div> : <p>N/A</p>}
                        {item.contractPdf && <button onClick={() => downloadPdf(item.contractPdf!, `Contrato-${item.fullName}.pdf`)} className="w-full mt-4 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold py-2 px-4 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 flex items-center justify-center text-sm"><Download size={16} className="mr-2" /> Descargar Contrato</button>}
                    </div>
                </div>
            </Card>
        ))}
    </div>
);
const ClientExplorer: React.FC<{ items: Client[] }> = ({ items }) => (
    <div className="space-y-4">
        {items.map(item => (
            <Card key={item.id} title={item.name} subtitle={`Cliente ID: ${item.id}`}>
                <DataGrid data={{ "Fecha de Ingreso": new Date(item.joinDate).toLocaleDateString(), "Es dato de prueba": item.isTestData ? 'Sí' : 'No' }} />
            </Card>
        ))}
    </div>
);
const LoanExplorer: React.FC<{ items: Loan[] }> = ({ items }) => (
    <div className="space-y-4">
        {items.map(item => (
            <Card key={item.id} title={`Préstamo a ${item.clientName}`} subtitle={`Préstamo ID: ${item.id}`}>
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <DataGrid data={{
                            "Monto": `${item.amount} €`, "Tasa Interés": `${item.interestRate}%`, "Plazo": `${item.term} meses`,
                            "Fecha Inicio": new Date(item.startDate).toLocaleDateString(), "Estado": item.status, "Pago Mensual": `${item.monthlyPayment.toFixed(2)} €`,
                            "Pagos Realizados": item.paymentsMade, "Cliente ID": item.clientId
                        }} />
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Firma</h4>
                        {item.signature ? <div className="bg-gray-100 dark:bg-gray-700/50 p-2 rounded-lg border border-gray-200 dark:border-gray-600"><img src={item.signature} alt="Signature" /></div> : <p>N/A</p>}
                        {item.contractPdf && <button onClick={() => downloadPdf(item.contractPdf!, `Contrato-${item.clientName}.pdf`)} className="w-full mt-4 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold py-2 px-4 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 flex items-center justify-center text-sm"><Download size={16} className="mr-2" /> Descargar Contrato</button>}
                    </div>
                </div>
            </Card>
        ))}
    </div>
);

export default DataExplorer;
