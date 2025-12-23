
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Client, Loan, LoanRequest, LoanStatus, RequestStatus, PaymentRecord } from '../types';
import { User } from 'firebase/auth';
import { 
    subscribeToCollection, 
    addDocument, 
    updateDocument, 
    deleteDocument,
    getCollection 
} from '../services/firebaseService';
import { DNI_FRONT_PLACEHOLDER, DNI_BACK_PLACEHOLDER } from '../constants';

export const useAppData = (
    showToast: (message: string, type: 'success' | 'error' | 'info') => void,
    user: User | null
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
        }, 3000);

        const unsubClients = subscribeToCollection('clients', (data) => {
            setClients(data as Client[]);
            clientsLoaded = true;
            checkAllLoaded();
        }, [], (err) => {
            console.error("Error loading clients", err);
            clientsLoaded = true;
            checkAllLoaded();
        });

        const unsubLoans = subscribeToCollection('loans', (data) => {
            // Ensure compatibility with old data structure
            const mappedLoans = (data as any[]).map(l => ({
                ...l,
                initialCapital: l.initialCapital ?? l.amount,
                remainingCapital: l.remainingCapital ?? (l.status === 'Pagado' ? 0 : l.amount),
                paymentHistory: l.paymentHistory ?? [],
                totalInterestPaid: l.totalInterestPaid ?? 0,
                totalCapitalPaid: l.totalCapitalPaid ?? 0
            }));
            setLoans(mappedLoans as Loan[]);
            loansLoaded = true;
            checkAllLoaded();
        }, [], (err) => {
             console.error("Error loading loans", err);
             loansLoaded = true;
             checkAllLoaded();
        });

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
    }, []);

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

    const reloadRequests = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getCollection('requests');
            setRequests(data as LoanRequest[]);
            showToast(`Sincronizado: ${data.length} solicitudes encontradas.`, 'success');
        } catch (err: any) {
            console.error("Error en recarga manual:", err);
            setError(`Error manual: ${err.message}`);
            showToast("Error al buscar en la nube. Verifica tu conexión.", "error");
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

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
            const newClient = {
                name: request.fullName,
                idNumber: request.idNumber,
                phone: request.phone,
                address: request.address,
                email: request.email,
                joinDate: new Date().toISOString()
            };
            const clientDoc = await addDocument('clients', newClient);

            // Default 8% monthly = 96% Annual
            const annualRate = 96; 
            const monthlyRate = annualRate / 12 / 100;
            const monthlyPayment = (loanAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -loanTerm));
            const totalRepayment = monthlyPayment * loanTerm;

            const newLoan: Omit<Loan, 'id'> = {
                clientId: clientDoc.id,
                clientName: request.fullName,
                amount: loanAmount,
                initialCapital: loanAmount,
                remainingCapital: loanAmount,
                interestRate: annualRate,
                term: loanTerm,
                startDate: new Date().toISOString(),
                status: LoanStatus.PENDING,
                monthlyPayment,
                totalRepayment,
                paymentsMade: 0,
                totalInterestPaid: 0,
                totalCapitalPaid: 0,
                paymentHistory: [],
                signature: request.signature,
                contractPdfUrl: '',
                notes: request.loanReason
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
        
        // --- ACCOUNTING LOGIC ---
        // 1. Calculate Monthly Interest based on Pending Capital
        // Rate is Annual / 12. Example: 96% / 12 = 8%.
        const monthlyRate = (loan.interestRate / 12) / 100;
        const interestDue = loan.remainingCapital * monthlyRate;

        // 2. Distribute Payment
        // Priority: Interest -> Capital
        let interestPaid = 0;
        let capitalPaid = 0;

        if (amount <= interestDue) {
            // Payment only covers partial or full interest, no capital reduction
            interestPaid = amount;
            capitalPaid = 0;
        } else {
            // Payment covers full interest + capital reduction
            interestPaid = interestDue;
            capitalPaid = amount - interestDue;
        }

        const newRemainingCapital = Math.max(0, loan.remainingCapital - capitalPaid);
        const isPaidOff = newRemainingCapital <= 0.1; // Tolerance for float errors

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
                paymentHistory: updatedHistory
            });
            showToast(`Pago registrado: €${interestPaid.toFixed(2)} interés, €${capitalPaid.toFixed(2)} capital.`, 'success');
        } catch (err: any) {
            showToast(`Error: ${err.message}`, 'error');
        }
    }, [loans, showToast]);

    const handleAddClientAndLoan = useCallback(async (clientData: any, loanData: { amount: number; term: number }) => {
        try {
            const clientDoc = await addDocument('clients', {
                ...clientData,
                joinDate: new Date().toISOString()
            });

             const annualRate = 96; // 8% monthly
             const monthlyRate = annualRate / 12 / 100;
             const monthlyPayment = (loanData.amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -loanData.term));
             const totalRepayment = monthlyPayment * loanData.term;
 
             await addDocument('loans', {
                 clientId: clientDoc.id,
                 clientName: clientData.name,
                 amount: loanData.amount,
                 initialCapital: loanData.amount,
                 remainingCapital: loanData.amount,
                 interestRate: annualRate,
                 term: loanData.term,
                 startDate: new Date().toISOString(),
                 status: LoanStatus.PENDING,
                 monthlyPayment,
                 totalRepayment,
                 paymentsMade: 0,
                 totalInterestPaid: 0,
                 totalCapitalPaid: 0,
                 paymentHistory: [],
                 notes: 'Préstamo inicial'
             });

            showToast(`Cliente registrado.`, 'success');
        } catch (err: any) {
            showToast(`Error: ${err.message}`, 'error');
            throw err;
        }
    }, [showToast]);

    const handleAddLoan = useCallback(async (clientId: string, clientName: string, loanData: { amount: number; term: number; interestRate: number; startDate: string; notes: string }) => {
        try {
            const monthlyRate = (loanData.interestRate / 12) / 100;
            const monthlyPayment = (loanData.amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -loanData.term));
            const totalRepayment = monthlyPayment * loanData.term;

            await addDocument('loans', {
                clientId,
                clientName,
                amount: loanData.amount,
                initialCapital: loanData.amount,
                remainingCapital: loanData.amount,
                interestRate: loanData.interestRate,
                term: loanData.term,
                startDate: loanData.startDate,
                status: LoanStatus.PENDING,
                monthlyPayment,
                totalRepayment,
                paymentsMade: 0,
                totalInterestPaid: 0,
                totalCapitalPaid: 0,
                paymentHistory: [],
                notes: loanData.notes
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
            showToast('Préstamo actualizado.', 'success');
        } catch (err: any) {
            showToast(`Error: ${err.message}`, 'error');
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

    return {
        clients,
        loans,
        requests,
        isLoading,
        error,
        clientLoanData,
        handleLoanRequestSubmit,
        handleApproveRequest,
        handleRejectRequest,
        handleUpdateRequestStatus,
        handleRegisterPayment,
        handleAddClientAndLoan,
        handleAddLoan,
        handleGenerateTestRequest,
        handleDeleteTestRequests,
        handleUpdateLoan,
        handleDeleteLoan,
        reloadRequests
    };
};
