
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
import { DEFAULT_ANNUAL_INTEREST_RATE, calculateLoanParameters, calculateAccruedInterest } from '../config';

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
            // Ensure compatibility with old data structure and new logic
            const mappedLoans = (data as any[]).map(l => ({
                ...l,
                initialCapital: l.initialCapital ?? l.amount,
                remainingCapital: l.remainingCapital ?? (l.status === 'Pagado' ? 0 : l.amount),
                // Fallback for existing loans without lastPaymentDate
                lastPaymentDate: l.lastPaymentDate ?? l.startDate, 
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
            // Verificar duplicados antes de aprobar
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
                joinDate: new Date().toISOString()
            };
            const clientDoc = await addDocument('clients', newClient);

            // Calcular usando la utilidad centralizada
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
                lastPaymentDate: startDate, // Inicializar fecha de último pago
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
    
    // --- LÓGICA DE PAGOS ACTUALIZADA (PUNTO 5) ---
    const handleRegisterPayment = useCallback(async (loanId: string, amount: number, date: string, notes: string) => {
        const loan = loans.find(l => l.id === loanId);
        if (!loan || loan.status === LoanStatus.PAID) return;
        
        // Calcular intereses basados en días transcurridos desde el último pago
        const referenceDate = loan.lastPaymentDate || loan.startDate;
        const { interest, daysElapsed } = calculateAccruedInterest(
            loan.remainingCapital,
            referenceDate,
            date,
            loan.interestRate
        );

        let interestPaid = 0;
        let capitalPaid = 0;

        // Lógica de imputación de pagos: Primero intereses acumulados, luego capital
        if (amount <= interest) {
            interestPaid = amount;
            capitalPaid = 0;
            // Nota: Si el pago no cubre el interés, se genera deuda de interés implícita
            // En este modelo simple, asumimos que el interés se paga o se pierde/acumula visualmente
        } else {
            interestPaid = interest;
            capitalPaid = amount - interest;
        }

        const newRemainingCapital = Math.max(0, loan.remainingCapital - capitalPaid);
        const isPaidOff = newRemainingCapital <= 0.1; // Margen de error para decimales

        const newPaymentRecord: PaymentRecord = {
            id: Date.now().toString(),
            date: date,
            amount: amount,
            interestPaid: interestPaid,
            capitalPaid: capitalPaid,
            remainingCapitalAfter: newRemainingCapital,
            notes: notes,
            daysElapsed: daysElapsed // Guardar días que cubrió este pago
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
                lastPaymentDate: date // Actualizar la fecha para el próximo cálculo
            });
            showToast(`Pago registrado. Interés de ${daysElapsed} días cobrado.`, 'success');
        } catch (err: any) {
            console.error("Error updating loan payment:", err);
            showToast(`Error: ${err.message}`, 'error');
            throw err; 
        }
    }, [loans, showToast]);

    const handleAddClientAndLoan = useCallback(async (clientData: any, loanData: { amount: number; term: number }) => {
        try {
            // Validaciones básicas
            if (isNaN(loanData.amount) || loanData.amount <= 0) throw new Error("El monto del préstamo debe ser válido.");
            if (isNaN(loanData.term) || loanData.term <= 0) throw new Error("El plazo del préstamo debe ser válido.");
            if (!clientData.name || clientData.name.trim() === '') throw new Error("El nombre del cliente es obligatorio.");
            if (!clientData.idNumber || clientData.idNumber.trim() === '') throw new Error("El DNI es obligatorio.");

            // 1. Verificación Crítica: Duplicados
            const exists = await checkClientExists(clientData.idNumber);
            if (exists) {
                throw new Error(`El cliente con DNI ${clientData.idNumber} ya está registrado.`);
            }

            // 2. Crear Cliente
            const clientDoc = await addDocument('clients', {
                ...clientData,
                joinDate: new Date().toISOString()
            });

            // 3. Crear Préstamo (Usando utilidad centralizada)
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
                 lastPaymentDate: startDate, // Inicialización
                 status: LoanStatus.PENDING,
                 monthlyPayment,
                 totalRepayment,
                 paymentsMade: 0,
                 totalInterestPaid: 0,
                 totalCapitalPaid: 0,
                 paymentHistory: [],
                 notes: 'Préstamo inicial'
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
            // Calcular usando utilidad centralizada, pero permitiendo tasa custom
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
                lastPaymentDate: loanData.startDate, // Inicialización
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
