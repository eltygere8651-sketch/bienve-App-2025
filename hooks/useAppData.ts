import { useState, useEffect, useMemo, useCallback } from 'react';
import { Client, Loan, LoanRequest, LoanStatus, RequestStatus } from '../types';
import { db } from '../services/dbService';
import { generateWelcomeMessage } from '../services/geminiService';

export const useAppData = (
    showToast: (message: string, type: 'success' | 'error' | 'info') => void,
    showConfirmModal: (options: { title: string; message: string; onConfirm: () => void; }) => void
) => {
    const [clients, setClients] = useState<Client[]>([]);
    const [loans, setLoans] = useState<Loan[]>([]);
    const [requests, setRequests] = useState<LoanRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [clientsData, loansData, requestsData] = await Promise.all([
                    db.clients.toArray(),
                    db.loans.toArray(),
                    db.requests.toArray(),
                ]);
                setClients(clientsData);
                setLoans(loansData);
                setRequests(requestsData);
                setError(null);
            } catch (err) {
                 console.error("Error fetching data from IndexedDB:", err);
                 setError("No se pudieron cargar los datos. Es posible que la base de datos esté deshabilitada o dañada.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleLoanRequestSubmit = async (request: Omit<LoanRequest, 'id' | 'requestDate' | 'status'>) => {
        const newRequest: LoanRequest = {
            ...request,
            id: `req-${Date.now()}`,
            requestDate: new Date().toISOString(),
            status: RequestStatus.PENDING,
            isTestData: false,
        };
        try {
            await db.requests.add(newRequest);
            setRequests(prev => [...prev, newRequest]);
            // No need for a toast here, the form shows a success screen.
        } catch (err) {
            console.error("Failed to submit loan request:", err);
            showToast('Error al enviar la solicitud.', 'error');
            throw err; // Re-throw to be caught by the form
        }
    };

    const handleApproveRequest = async (requestId: string, loanAmount: number, loanTerm: number) => {
        const request = requests.find(r => r.id === requestId);
        if (!request) return;

        const newClient: Client = {
            id: `client-${Date.now()}`,
            name: request.fullName,
            joinDate: new Date().toISOString(),
            isTestData: request.isTestData,
        };

        const interestRate = 96; // 8% monthly = 96% annual
        const principal = loanAmount;
        const rate = interestRate / 100 / 12;
        const n = loanTerm;
        const monthlyPayment = rate > 0 ? (principal * rate * Math.pow(1 + rate, n)) / (Math.pow(1 + rate, n) - 1) : principal / n;
        const totalRepayment = monthlyPayment * n;

        const newLoan: Loan = {
            id: `loan-${Date.now()}`,
            clientId: newClient.id,
            clientName: newClient.name,
            amount: loanAmount,
            interestRate,
            term: loanTerm,
            startDate: new Date().toISOString(),
            status: LoanStatus.PENDING,
            monthlyPayment,
            totalRepayment,
            paymentsMade: 0,
            isTestData: request.isTestData,
            signature: request.signature,
            contractPdf: request.contractPdf,
        };
        
        try {
            await db.transaction('rw', db.clients, db.loans, db.requests, async () => {
                await db.clients.add(newClient);
                await db.loans.add(newLoan);
                await db.requests.delete(requestId);
            });
            
            setClients(prev => [...prev, newClient]);
            setLoans(prev => [...prev, newLoan]);
            setRequests(prev => prev.filter(r => r.id !== requestId));

            const welcomeMessage = await generateWelcomeMessage(newClient.name);
            showToast(`Préstamo Aprobado para ${newClient.name}`, 'success');
            showToast(welcomeMessage, 'info');
        } catch (err) {
            console.error("Failed to approve request:", err);
            showToast('Error al aprobar el préstamo.', 'error');
        }
    };

    const handleDenyRequest = async (requestId: string) => {
        try {
            await db.requests.delete(requestId);
            setRequests(prev => prev.filter(r => r.id !== requestId));
            showToast('Solicitud denegada y eliminada.', 'info');
        } catch (err) {
            console.error("Failed to deny request:", err);
            showToast('Error al denegar la solicitud.', 'error');
        }
    };

    const handleUpdateRequestStatus = async (requestId: string, status: RequestStatus) => {
        try {
            await db.requests.update(requestId, { status });
            setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status } : r));
            showToast(`Solicitud actualizada a "${status}".`, 'info');
        } catch (err) {
            console.error("Failed to update request status:", err);
            showToast('Error al actualizar el estado.', 'error');
        }
    };
    
    const handleRegisterPayment = async (loanId: string) => {
        const loan = loans.find(l => l.id === loanId);
        if (!loan || loan.status === LoanStatus.PAID) return;
        
        const newPaymentsMade = loan.paymentsMade + 1;
        const isPaidOff = newPaymentsMade >= loan.term;
        const newStatus = isPaidOff ? LoanStatus.PAID : loan.status;

        try {
            await db.loans.update(loanId, { paymentsMade: newPaymentsMade, status: newStatus });
            setLoans(prev => prev.map(l => l.id === loanId ? { ...l, paymentsMade: newPaymentsMade, status: newStatus } : l));
            showToast('Pago registrado correctamente.', 'success');
        } catch (err) {
            console.error("Failed to register payment:", err);
            showToast('Error al registrar el pago.', 'error');
        }
    };
    
    const clientLoanData = useMemo(() => {
        return clients.map(client => {
            const clientLoans = loans.filter(loan => loan.clientId === client.id);
            return { ...client, loans: clientLoans };
        });
    }, [clients, loans]);

    const generateDummyData = async () => {
        const dummyClients: Client[] = [
            { id: 'client-1', name: 'Juan Pérez (Prueba)', joinDate: '2023-01-15T10:00:00Z', isTestData: true },
            { id: 'client-2', name: 'María García (Prueba)', joinDate: '2023-03-22T11:30:00Z', isTestData: true },
        ];
        const dummyLoans: Loan[] = [
            { id: 'loan-1', clientId: 'client-1', clientName: 'Juan Pérez (Prueba)', amount: 500, interestRate: 96, term: 6, startDate: '2023-10-01T10:00:00Z', status: LoanStatus.PENDING, monthlyPayment: 99.56, totalRepayment: 597.36, paymentsMade: 3, isTestData: true },
            { id: 'loan-2', clientId: 'client-1', clientName: 'Juan Pérez (Prueba)', amount: 300, interestRate: 96, term: 3, startDate: '2023-05-01T10:00:00Z', status: LoanStatus.PAID, monthlyPayment: 112.98, totalRepayment: 338.94, paymentsMade: 3, isTestData: true },
            { id: 'loan-3', clientId: 'client-2', clientName: 'María García (Prueba)', amount: 1200, interestRate: 96, term: 12, startDate: '2023-11-05T11:30:00Z', status: LoanStatus.PENDING, monthlyPayment: 154.55, totalRepayment: 1854.6, paymentsMade: 2, isTestData: true },
        ];
        const dummyRequests: LoanRequest[] = [
            { id: 'req-1', fullName: 'Carlos Sanchez (Prueba)', idNumber: 'Z1234567X', address: 'Calle Falsa 123', phone: '600112233', email: 'carlos@example.com', loanAmount: 800, loanReason: 'Mejoras Hogar', employmentStatus: 'Empleado', contractType: 'Indefinido', frontId: new Blob(), backId: new Blob(), requestDate: new Date().toISOString(), status: RequestStatus.PENDING, isTestData: true, signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', contractPdf: new Blob() },
        ];
        
        try {
            await db.transaction('rw', db.clients, db.loans, db.requests, async () => {
                await db.clients.bulkPut(dummyClients);
                await db.loans.bulkPut(dummyLoans);
                await db.requests.bulkPut(dummyRequests);
            });
            setClients(prev => [...prev.filter(c => !c.isTestData), ...dummyClients]);
            setLoans(prev => [...prev.filter(l => !l.isTestData), ...dummyLoans]);
            setRequests(prev => [...prev.filter(r => !r.isTestData), ...dummyRequests]);
            showToast('Datos de prueba generados.', 'success');
        } catch (err) {
            console.error("Failed to generate dummy data:", err);
            showToast('Error al generar datos de prueba.', 'error');
        }
    };

    const clearAllData = async () => {
        showConfirmModal({
            title: 'Confirmar Limpieza',
            message: '¿Estás seguro de que quieres borrar TODOS los datos de prueba? Los datos de usuarios reales no se verán afectados.',
            onConfirm: async () => {
                try {
                    const clientsToDelete = await db.clients.where({ isTestData: true }).primaryKeys();
                    const loansToDelete = await db.loans.where({ isTestData: true }).primaryKeys();
                    const requestsToDelete = await db.requests.where({ isTestData: true }).primaryKeys();

                    await db.transaction('rw', db.clients, db.loans, db.requests, async () => {
                        await db.clients.bulkDelete(clientsToDelete as any);
                        await db.loans.bulkDelete(loansToDelete as any);
                        await db.requests.bulkDelete(requestsToDelete as any);
                    });
                    
                    setClients(prev => prev.filter(c => !c.isTestData));
                    setLoans(prev => prev.filter(l => !l.isTestData));
                    setRequests(prev => prev.filter(r => !r.isTestData));
                    showToast('Todos los datos de prueba han sido borrados.', 'info');
                } catch (err) {
                    console.error("Failed to clear test data:", err);
                    showToast('Error al limpiar los datos de prueba.', 'error');
                }
            }
        });
    };
    
    return {
        clients,
        loans,
        requests,
        isLoading,
        error,
        handleLoanRequestSubmit,
        handleApproveRequest,
        handleDenyRequest,
        handleUpdateRequestStatus,
        handleRegisterPayment,
        clientLoanData,
        generateDummyData,
        clearAllData,
    };
};