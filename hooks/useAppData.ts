
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Client, Loan, LoanRequest, LoanStatus, RequestStatus, PaymentRecord } from '../types';
import { User } from 'firebase/auth';
import { 
    subscribeToCollection, 
    addDocument, 
    updateDocument, 
    deleteDocument,
    getCollection,
    checkClientExists
} from '../services/firebaseService';
import { DNI_FRONT_PLACEHOLDER, DNI_BACK_PLACEHOLDER } from '../constants';
import { DEFAULT_ANNUAL_INTEREST_RATE, calculateLoanParameters, calculateMonthlyInterest } from '../config';

export const useAppData = (
    showToast: (message: string, type: 'success' | 'error' | 'info') => void,
    user: User | null,
    isConfigReady: boolean // New dependency to ensure DB is ready
) => {
    const [clients, setClients] = useState<Client[]>([]);
    const [loans, setLoans] = useState<Loan[]>([]);
    const [requests, setRequests] = useState<LoanRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isInitialLoadRef = useRef(true);
    const prevRequestsCountRef = useRef(0);

    // Cargar datos en tiempo real con Firebase
    useEffect(() => {
        // CRITICAL FIX: Ensure both Config AND User are ready before subscribing.
        // Firebase rules usually require an authenticated user (even anonymous).
        // If we subscribe before 'user' is populated, we get "Missing Permissions" and the listener dies.
        if (!isConfigReady || !user) return;

        setIsLoading(true);
        let clientsLoaded = false;
        let loansLoaded = false;
        let requestsLoaded = false;

        const checkAllLoaded = () => {
            if (clientsLoaded && loansLoaded && requestsLoaded) {
                setIsLoading(false);
            }
        };

        const safetyTimeout = setTimeout(() => {
            if (isLoading) {
                console.warn("Firebase loading timed out - Forcing app render");
                setIsLoading(false);
            }
        }, 5000); 

        // 1. Clients Subscription
        const unsubClients = subscribeToCollection('clients', (data) => {
            const mappedClients = (data as any[]).map(c => ({
                ...c,
                archived: c.archived ?? false // Default to false
            }));
            setClients(mappedClients as Client[]);
            clientsLoaded = true;
            checkAllLoaded();
        }, [], (err) => {
            console.error("Error loading clients", err);
            // Do not block UI on error, but log it
            clientsLoaded = true; 
            checkAllLoaded();
        });

        // 2. Loans Subscription
        const unsubLoans = subscribeToCollection('loans', (data) => {
            const mappedLoans = (data as any[]).map(l => ({
                ...l,
                initialCapital: l.initialCapital ?? l.amount,
                remainingCapital: l.remainingCapital ?? (l.status === 'Pagado' ? 0 : l.amount),
                lastPaymentDate: l.lastPaymentDate ?? l.startDate, 
                paymentHistory: l.paymentHistory ?? [],
                totalInterestPaid: l.totalInterestPaid ?? 0,
                totalCapitalPaid: l.totalCapitalPaid ?? 0,
                archived: l.archived ?? false
            }));
            setLoans(mappedLoans as Loan[]);
            loansLoaded = true;
            checkAllLoaded();
        }, [], (err) => {
             console.error("Error loading loans", err);
             loansLoaded = true;
             checkAllLoaded();
        });

        // 3. Requests Subscription
        const unsubRequests = subscribeToCollection(
            'requests', 
            (data) => {
                const reqs = (data || []) as LoanRequest[];
                setRequests(reqs);
                requestsLoaded = true;
                checkAllLoaded();
                setError(null);
            },
            [], 
            (err) => {
                console.error("Error loading requests:", err);
                requestsLoaded = true;
                checkAllLoaded();
            }
        );

        return () => {
            clearTimeout(safetyTimeout);
            unsubClients();
            unsubLoans();
            unsubRequests();
        };
    }, [isConfigReady, user]); // Added 'user' to dependency array to trigger re-sync on auth change

    // Derived State
    const activeLoans = useMemo(() => loans.filter(l => !l.archived), [loans]);
    const archivedLoans = useMemo(() => loans.filter(l => l.archived), [loans]);
    
    const activeClients = useMemo(() => clients.filter(c => !c.archived), [clients]);
    const archivedClients = useMemo(() => clients.filter(c => c.archived), [clients]);

    useEffect(() => {
        if (isLoading) return;

        if (isInitialLoadRef.current) {
            isInitialLoadRef.current = false;
            prevRequestsCountRef.current = requests.length;
            return;
        }
    
        if (requests.length > prevRequestsCountRef.current) {
            showToast('¡Nueva solicitud de préstamo recibida!', 'success');
            const audio = document.getElementById('notification-sound') as HTMLAudioElement;
            if (audio) audio.play().catch(e => console.warn("Audio error", e));
        }
    
        prevRequestsCountRef.current = requests.length;
    }, [requests.length, isLoading, showToast]);

    const refreshAllData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [clientsData, loansData, requestsData] = await Promise.all([
                getCollection('clients'),
                getCollection('loans'),
                getCollection('requests')
            ]);

            const mappedClients = (clientsData as any[]).map(c => ({
                ...c,
                archived: c.archived ?? false
            }));
            setClients(mappedClients as Client[]);
            
            const mappedLoans = (loansData as any[]).map(l => ({
                ...l,
                initialCapital: l.initialCapital ?? l.amount,
                remainingCapital: l.remainingCapital ?? (l.status === 'Pagado' ? 0 : l.amount),
                lastPaymentDate: l.lastPaymentDate ?? l.startDate, 
                paymentHistory: l.paymentHistory ?? [],
                totalInterestPaid: l.totalInterestPaid ?? 0,
                totalCapitalPaid: l.totalCapitalPaid ?? 0,
                archived: l.archived ?? false
            }));
            setLoans(mappedLoans as Loan[]);
            setRequests(requestsData as LoanRequest[]);
            showToast('Datos sincronizados manualmente.', 'success');
        } catch (err: any) {
            console.error("Error en recarga manual completa:", err);
            setError(`Error de sincronización: ${err.message}`);
            showToast("Error al sincronizar datos.", "error");
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    const reloadRequests = useCallback(async () => {
        await refreshAllData();
    }, [refreshAllData]);

    const handleLoanRequestSubmit = useCallback(async (requestData: Omit<LoanRequest, 'id' | 'requestDate' | 'status' | 'frontIdUrl' | 'backIdUrl'>, files: { frontId: string, backId: string }) => {
        try {
            const newRequest = {
                ...requestData,
                frontIdUrl: files.frontId, 
                backIdUrl: files.backId,
                status: RequestStatus.PENDING,
                requestDate: new Date().toISOString()
            };

            await addDocument('requests', newRequest);

        } catch (err: any) {
            console.error("Failed to submit loan request:", err);
            showToast(`Error al enviar la solicitud: ${err.message}`, 'error');
            throw err;
        }
    }, [showToast]);

    const handleApproveRequest = useCallback(async (request: LoanRequest, loanAmount: number, loanTerm: number) => {
        try {
            const exists = await checkClientExists(request.idNumber);
            if (exists) {
                throw new Error(`Ya existe un cliente registrado con el DNI/NIE ${request.idNumber}`);
            }

            const newClient = {
                name: request.fullName,
                idNumber: request.idNumber,
                phone: request.phone,
                address: request.address,
                email: request.email,
                joinDate: new Date().toISOString(),
                archived: false
            };
            const clientDoc = await addDocument('clients', newClient);

            const { monthlyPayment, totalRepayment } = calculateLoanParameters(loanAmount, loanTerm);
            const startDate = new Date().toISOString();

            const newLoan: Omit<Loan, 'id'> = {
                clientId: clientDoc.id,
                clientName: request.fullName,
                amount: loanAmount,
                initialCapital: loanAmount,
                remainingCapital: loanAmount,
                interestRate: DEFAULT_ANNUAL_INTEREST_RATE,
                term: loanTerm,
                startDate: startDate,
                lastPaymentDate: startDate,
                status: LoanStatus.PENDING,
                monthlyPayment,
                totalRepayment,
                paymentsMade: 0,
                totalInterestPaid: 0,
                totalCapitalPaid: 0,
                paymentHistory: [],
                signature: request.signature,
                contractPdfUrl: '',
                notes: request.loanReason,
                archived: false
            };
            await addDocument('loans', newLoan);

            await deleteDocument('requests', request.id);
            
            showToast(`Préstamo Aprobado para ${request.fullName}`, 'success');
            
        } catch (err: any) {
            console.error("Failed to approve request:", err);
            showToast(`Error al aprobar: ${err.message}`, 'error');
            throw err;
        }
    }, [showToast]);
    
    const handleRejectRequest = useCallback(async (request: LoanRequest) => {
        try {
            await deleteDocument('requests', request.id);
            showToast('Solicitud rechazada y eliminada.', 'success');
        } catch (err: any) {
            showToast(`Error al rechazar: ${err.message}`, 'error');
            throw err;
        }
    }, [showToast]);

    const handleUpdateRequestStatus = useCallback(async (requestId: string, status: RequestStatus) => {
        try {
            await updateDocument('requests', requestId, { status });
            showToast(`Solicitud actualizada a "${status}".`, 'info');
        } catch (err: any) {
            showToast(`Error: ${err.message}`, 'error');
            throw err;
        }
    }, [showToast]);
    
    const handleRegisterPayment = useCallback(async (loanId: string, amount: number, date: string, notes: string) => {
        const loan = loans.find(l => l.id === loanId);
        if (!loan || loan.status === LoanStatus.PAID) return;
        
        const { interest } = calculateMonthlyInterest(loan.remainingCapital, loan.interestRate);

        let interestPaid = 0;
        let capitalPaid = 0;

        if (amount <= interest) {
            interestPaid = amount;
            capitalPaid = 0;
        } else {
            interestPaid = interest;
            capitalPaid = amount - interest;
        }

        const newRemainingCapital = Math.max(0, loan.remainingCapital - capitalPaid);
        const isPaidOff = newRemainingCapital <= 0.1;

        const newPaymentRecord: PaymentRecord = {
            id: Date.now().toString(),
            date: date,
            amount: amount,
            interestPaid: interestPaid,
            capitalPaid: capitalPaid,
            remainingCapitalAfter: newRemainingCapital,
            notes: notes
        };

        const updatedHistory = [...(loan.paymentHistory || []), newPaymentRecord];

        try {
            await updateDocument('loans', loanId, { 
                paymentsMade: loan.paymentsMade + 1, 
                status: isPaidOff ? LoanStatus.PAID : LoanStatus.PENDING,
                remainingCapital: newRemainingCapital,
                totalInterestPaid: (loan.totalInterestPaid || 0) + interestPaid,
                totalCapitalPaid: (loan.totalCapitalPaid || 0) + capitalPaid,
                paymentHistory: updatedHistory,
                lastPaymentDate: date
            });
            showToast(`Pago registrado. Cobrado 8% interés sobre saldo actual.`, 'success');
        } catch (err: any) {
            console.error("Error updating loan payment:", err);
            showToast(`Error: ${err.message}`, 'error');
            throw err; 
        }
    }, [loans, showToast]);

    const handleUpdatePayment = useCallback(async (loanId: string, paymentId: string, newInterest: number, newAmount: number, newDate: string, newNotes: string) => {
        try {
            const loan = loans.find(l => l.id === loanId);
            if (!loan) throw new Error("Préstamo no encontrado");
        
            const paymentIndex = loan.paymentHistory.findIndex(p => p.id === paymentId);
            if (paymentIndex === -1) throw new Error("Pago no encontrado");
        
            const oldPayment = loan.paymentHistory[paymentIndex];
        
            const newCapital = Math.max(0, newAmount - newInterest);
        
            if (newInterest > newAmount) throw new Error("El interés no puede ser mayor al monto total.");
        
            const interestDiff = newInterest - oldPayment.interestPaid;
            const capitalDiff = newCapital - oldPayment.capitalPaid;
        
            const newLoanRemaining = Math.max(0, loan.remainingCapital - capitalDiff);
            const newTotalInterest = Math.max(0, (loan.totalInterestPaid || 0) + interestDiff);
            const newTotalCapital = Math.max(0, (loan.totalCapitalPaid || 0) + capitalDiff);
        
            const updatedPayment: PaymentRecord = {
                ...oldPayment,
                date: newDate,
                amount: newAmount,
                interestPaid: newInterest,
                capitalPaid: newCapital,
                notes: newNotes,
                remainingCapitalAfter: Math.max(0, oldPayment.remainingCapitalAfter - capitalDiff)
            };
        
            const newHistory = [...loan.paymentHistory];
            newHistory[paymentIndex] = updatedPayment;
        
            await updateDocument('loans', loanId, {
                paymentHistory: newHistory,
                remainingCapital: newLoanRemaining,
                totalInterestPaid: newTotalInterest,
                totalCapitalPaid: newTotalCapital,
                status: newLoanRemaining < 0.1 ? LoanStatus.PAID : LoanStatus.PENDING
            });
        
            showToast("Pago corregido exitosamente.", "success");
        } catch (err: any) {
            console.error("Error updating payment:", err);
            showToast(`Error al corregir pago: ${err.message}`, 'error');
            throw err;
        }
    }, [loans, showToast]);

    const handleAddClientAndLoan = useCallback(async (clientData: any, loanData: { amount: number; term: number }) => {
        try {
            if (isNaN(loanData.amount) || loanData.amount <= 0) throw new Error("El monto del préstamo debe ser válido.");
            if (isNaN(loanData.term) || loanData.term < 0) throw new Error("El plazo del préstamo debe ser válido.");
            
            if (!clientData.name || clientData.name.trim() === '') throw new Error("El nombre del cliente es obligatorio.");
            if (!clientData.idNumber || clientData.idNumber.trim() === '') throw new Error("El DNI es obligatorio.");

            const exists = await checkClientExists(clientData.idNumber);
            if (exists) {
                throw new Error(`El cliente con DNI ${clientData.idNumber} ya está registrado.`);
            }

            const clientDoc = await addDocument('clients', {
                ...clientData,
                joinDate: new Date().toISOString(),
                archived: false
            });

             const { monthlyPayment, totalRepayment } = calculateLoanParameters(loanData.amount, loanData.term);
             const startDate = new Date().toISOString();
 
             await addDocument('loans', {
                 clientId: clientDoc.id,
                 clientName: clientData.name,
                 amount: loanData.amount,
                 initialCapital: loanData.amount,
                 remainingCapital: loanData.amount,
                 interestRate: DEFAULT_ANNUAL_INTEREST_RATE,
                 term: loanData.term,
                 startDate: startDate,
                 lastPaymentDate: startDate, 
                 status: LoanStatus.PENDING,
                 monthlyPayment,
                 totalRepayment,
                 paymentsMade: 0,
                 totalInterestPaid: 0,
                 totalCapitalPaid: 0,
                 paymentHistory: [],
                 notes: 'Préstamo inicial',
                 archived: false
             });

            showToast(`Cliente registrado correctamente.`, 'success');

        } catch (err: any) {
            console.error(err);
            showToast(err.message, 'error');
            throw err; 
        }
    }, [showToast]);

    const handleAddLoan = useCallback(async (clientId: string, clientName: string, loanData: { amount: number; term: number; interestRate: number; startDate: string; notes: string }) => {
        try {
            const { monthlyPayment, totalRepayment } = calculateLoanParameters(loanData.amount, loanData.term, loanData.interestRate);

            await addDocument('loans', {
                clientId,
                clientName,
                amount: loanData.amount,
                initialCapital: loanData.amount,
                remainingCapital: loanData.amount,
                interestRate: loanData.interestRate,
                term: loanData.term,
                startDate: loanData.startDate,
                lastPaymentDate: loanData.startDate,
                status: LoanStatus.PENDING,
                monthlyPayment,
                totalRepayment,
                paymentsMade: 0,
                totalInterestPaid: 0,
                totalCapitalPaid: 0,
                paymentHistory: [],
                notes: loanData.notes,
                archived: false
            });
            showToast('Préstamo añadido correctamente.', 'success');
        } catch (err: any) {
            showToast(`Error: ${err.message}`, 'error');
            throw err;
        }
    }, [showToast]);

    const handleUpdateLoan = useCallback(async (loanId: string, updatedData: Partial<Loan>) => {
        try {
            await updateDocument('loans', loanId, updatedData);
            showToast('Datos del préstamo actualizados.', 'success');
        } catch (err: any) {
            showToast(`Error: ${err.message}`, 'error');
            throw err;
        }
    }, [showToast]);

    const handleUpdateClient = useCallback(async (clientId: string, updatedData: Partial<Client>) => {
        try {
            await updateDocument('clients', clientId, updatedData);
            
            // Note: If client name changed, ideally we should update clientName in their active loans too
            // For simplicity, we are just updating the client document here. 
            // A more robust solution would query all loans by clientId and update clientName there too.
            
            showToast('Datos del cliente actualizados.', 'success');
        } catch (err: any) {
            showToast(`Error al actualizar cliente: ${err.message}`, 'error');
            throw err;
        }
    }, [showToast]);

    const handleDeleteLoan = useCallback(async (loanId: string, clientName: string) => {
        try {
            await deleteDocument('loans', loanId);
            showToast(`Préstamo eliminado.`, 'success');
        } catch (err: any) {
            showToast(`Error: ${err.message}`, 'error');
            throw err;
        }
    }, [showToast]);

    const handleArchivePaidLoans = useCallback(async () => {
        try {
            const loansToArchive = loans.filter(l => l.status === LoanStatus.PAID && !l.archived);
            
            if (loansToArchive.length === 0) {
                showToast('No hay préstamos pagados para archivar.', 'info');
                return 0;
            }

            const updatePromises = loansToArchive.map(loan => 
                updateDocument('loans', loan.id, { archived: true })
            );

            await Promise.all(updatePromises);
            showToast(`${loansToArchive.length} préstamos archivados correctamente.`, 'success');
            return loansToArchive.length;
        } catch (err: any) {
            console.error("Error archiving loans:", err);
            showToast(`Error al archivar: ${err.message}`, 'error');
            return 0;
        }
    }, [loans, showToast]);

    const handleArchiveClient = useCallback(async (clientId: string) => {
        try {
            await updateDocument('clients', clientId, { archived: true });
            showToast('Cliente movido al historial.', 'success');
        } catch (err: any) {
            showToast(`Error al archivar cliente: ${err.message}`, 'error');
        }
    }, [showToast]);

    const handleRestoreClient = useCallback(async (clientId: string) => {
        try {
            await updateDocument('clients', clientId, { archived: false });
            showToast('Cliente restaurado a la lista principal.', 'success');
        } catch (err: any) {
            showToast(`Error al restaurar cliente: ${err.message}`, 'error');
        }
    }, [showToast]);

    const handleBatchDeleteClients = useCallback(async (clientIds: string[]) => {
        try {
            if (clientIds.length === 0) return;
            const deletePromises = clientIds.map(id => deleteDocument('clients', id));
            await Promise.all(deletePromises);
            showToast(`${clientIds.length} clientes eliminados permanentemente.`, 'success');
        } catch (err: any) {
            console.error("Error batch deleting clients:", err);
            showToast(`Error al eliminar clientes: ${err.message}`, 'error');
        }
    }, [showToast]);

    const handleGenerateTestRequest = useCallback(async () => {
        try {
            const randomId = Math.floor(Math.random() * 10000);
            const testRequest = {
                fullName: `Cliente de Prueba ${randomId}`,
                idNumber: `TEST-${randomId}`,
                address: 'Calle Falsa 123, Ciudad de Prueba',
                phone: '555-000-123',
                email: 'test@ejemplo.com',
                loanAmount: 1500,
                loanReason: 'Prueba de Sistema',
                employmentStatus: 'Empleado',
                contractType: 'Indefinido',
                frontIdUrl: DNI_FRONT_PLACEHOLDER,
                backIdUrl: DNI_BACK_PLACEHOLDER,
                status: RequestStatus.PENDING,
                requestDate: new Date().toISOString()
            };
            
            await addDocument('requests', testRequest);
            showToast('Solicitud de prueba generada.', 'success');
        } catch (err: any) {
            console.error("Error generating test request:", err);
            showToast(`Error al generar prueba: ${err.message}`, 'error');
        }
    }, [showToast]);

    const handleDeleteTestRequests = useCallback(async () => {
         try {
            const testRequests = requests.filter(r => r.fullName.startsWith('Cliente de Prueba'));
            
            if (testRequests.length === 0) {
                showToast('No se encontraron solicitudes de prueba.', 'info');
                return;
            }

            const deletePromises = testRequests.map(req => deleteDocument('requests', req.id));
            await Promise.all(deletePromises);

            showToast(`${testRequests.length} solicitudes de prueba eliminadas.`, 'success');
         } catch (err: any) {
             console.error("Error deleting test requests:", err);
             showToast(`Error al eliminar: ${err.message}`, 'error');
         }
    }, [requests, showToast]);

    const clientLoanData = useMemo(() => {
        const loansByClientId = new Map<string, Loan[]>();
        for (const loan of activeLoans) {
            if (!loansByClientId.has(loan.clientId)) {
                loansByClientId.set(loan.clientId, []);
            }
            loansByClientId.get(loan.clientId)!.push(loan);
        }

        return activeClients.map(client => ({
            ...client,
            loans: loansByClientId.get(client.id) || [],
        }));
    }, [activeClients, activeLoans]);

    return {
        clients: activeClients, 
        archivedClients,        
        loans: activeLoans,
        archivedLoans,
        allLoans: loans,
        requests,
        isLoading,
        error,
        clientLoanData,
        handleLoanRequestSubmit,
        handleApproveRequest,
        handleRejectRequest,
        handleUpdateRequestStatus,
        handleRegisterPayment,
        handleUpdatePayment,
        handleAddClientAndLoan,
        handleAddLoan,
        handleGenerateTestRequest,
        handleDeleteTestRequests,
        handleUpdateLoan,
        handleUpdateClient,
        handleDeleteLoan,
        handleArchivePaidLoans,
        handleArchiveClient,
        handleRestoreClient,
        handleBatchDeleteClients,
        reloadRequests,
        refreshAllData 
    };
};
