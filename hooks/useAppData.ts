import { useState, useEffect, useMemo, useCallback } from 'react';
import { Client, Loan, LoanRequest, LoanStatus, RequestStatus } from '../types';
import { db } from '../services/dbService';
import { generateWelcomeMessage } from '../services/geminiService';
import { INTEREST_RATE_CONFIG } from '../config';
import { LOCAL_STORAGE_KEYS } from '../constants';

export const useAppData = (
    showToast: (message: string, type: 'success' | 'error' | 'info') => void,
    showConfirmModal: (options: { title: string; message: string; onConfirm: () => void; }) => void
) => {
    const [clients, setClients] = useState<Client[]>([]);
    const [loans, setLoans] = useState<Loan[]>([]);
    const [requests, setRequests] = useState<LoanRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const updateOverdueLoans = useCallback(async (allLoans: Loan[]): Promise<Loan[]> => {
        const today = new Date();
        const loansToUpdate: { key: string, changes: { status: LoanStatus } }[] = [];
        const pendingLoans = allLoans.filter(loan => loan.status === LoanStatus.PENDING);
        
        pendingLoans.forEach(loan => {
            const dueDate = new Date(loan.startDate);
            dueDate.setMonth(dueDate.getMonth() + loan.paymentsMade + 1);
            
            if (today > dueDate) {
                loansToUpdate.push({ key: loan.id, changes: { status: LoanStatus.OVERDUE } });
            }
        });

        if (loansToUpdate.length > 0) {
            try {
                await db.loans.bulkUpdate(loansToUpdate);
                console.log(`${loansToUpdate.length} loan(s) updated to Overdue.`);
                return allLoans.map(loan => {
                    const update = loansToUpdate.find(u => u.key === loan.id);
                    return update ? { ...loan, ...update.changes } : loan;
                });
            } catch (err) {
                console.error("Failed to bulk update overdue loans:", err);
            }
        }
        return allLoans;
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [clientsData, loansData, requestsData] = await Promise.all([
                    db.clients.toArray(),
                    db.loans.toArray(),
                    db.requests.toArray(),
                ]);

                const updatedLoans = await updateOverdueLoans(loansData);
                
                setClients(clientsData);
                setLoans(updatedLoans);
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
    }, [updateOverdueLoans]);

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
        } catch (err) {
            console.error("Failed to submit loan request:", err);
            showToast('Error al enviar la solicitud.', 'error');
            throw err;
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

        const interestRate = INTEREST_RATE_CONFIG.ANNUAL;
        const principal = loanAmount;
        const rate = INTEREST_RATE_CONFIG.MONTHLY / 100;
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
        const newStatus = isPaidOff ? LoanStatus.PAID : LoanStatus.PENDING;

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
        // Optimization: Create a map of loans by clientId for efficient lookup.
        // This avoids iterating through the entire loans array for each client.
        const loansByClientId = new Map<string, Loan[]>();
        for (const loan of loans) {
            if (!loansByClientId.has(loan.clientId)) {
                loansByClientId.set(loan.clientId, []);
            }
            loansByClientId.get(loan.clientId)!.push(loan);
        }

        return clients.map(client => ({
            ...client,
            loans: loansByClientId.get(client.id) || [],
        }));
    }, [clients, loans]);

    const generateDummyData = async () => {
        const today = new Date();
        const oneMonthAgo = new Date(new Date().setMonth(today.getMonth() - 1));
        const fourMonthsAgo = new Date(new Date().setMonth(today.getMonth() - 4));

        const dummyClients: Client[] = [
            { id: 'client-1', name: 'Juan Pérez (Prueba)', joinDate: '2023-01-15T10:00:00Z', isTestData: true },
            { id: 'client-2', name: 'María García (Prueba)', joinDate: '2023-03-22T11:30:00Z', isTestData: true },
        ];
        const dummyLoans: Loan[] = [
            { id: 'loan-1', clientId: 'client-1', clientName: 'Juan Pérez (Prueba)', amount: 500, interestRate: 96, term: 6, startDate: oneMonthAgo.toISOString(), status: LoanStatus.PENDING, monthlyPayment: 99.56, totalRepayment: 597.36, paymentsMade: 0, isTestData: true },
            { id: 'loan-2', clientId: 'client-1', clientName: 'Juan Pérez (Prueba)', amount: 300, interestRate: 96, term: 3, startDate: '2023-05-01T10:00:00Z', status: LoanStatus.PAID, monthlyPayment: 112.98, totalRepayment: 338.94, paymentsMade: 3, isTestData: true },
            { id: 'loan-3', clientId: 'client-2', clientName: 'María García (Prueba)', amount: 1200, interestRate: 96, term: 12, startDate: fourMonthsAgo.toISOString(), status: LoanStatus.PENDING, monthlyPayment: 154.55, totalRepayment: 1854.6, paymentsMade: 2, isTestData: true },
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
            const [clientsData, loansData, requestsData] = await Promise.all([
                db.clients.toArray(),
                db.loans.toArray(),
                db.requests.toArray(),
            ]);

            const updatedLoans = await updateOverdueLoans(loansData);
                
            setClients(clientsData);
            setLoans(updatedLoans);
            setRequests(requestsData);
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
                    await db.transaction('rw', db.clients, db.loans, db.requests, async () => {
                        await db.clients.where('isTestData').equals(1).delete();
                        await db.loans.where('isTestData').equals(1).delete();
                        await db.requests.where('isTestData').equals(1).delete();
                    });
                    
                    setClients(prev => prev.filter(c => !c.isTestData));
                    setLoans(prev => prev.filter(l => !l.isTestData));
                    setRequests(prev => prev.filter(r => !r.isTestData));
                    showToast('Todos los datos de prueba han sido borrados.', 'info');
                } catch (err) {
                    console.error("Failed to clear test data:", err);
                    const errorMessage = err instanceof Error ? err.message : String(err);
                    showToast(`Error al limpiar los datos de prueba: ${errorMessage}`, 'error');
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
