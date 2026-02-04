
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Client, Loan, LoanRequest, LoanStatus, RequestStatus, PaymentRecord, NewClientData, NewLoanData } from '../types';
import { User } from 'firebase/auth';
import { 
    subscribeToCollection, 
    addDocument, 
    updateDocument, 
    deleteDocument,
    getCollection,
    checkClientExists,
    getPaginatedCollection,
    where,
    orderBy,
    limit,
    getDocument,
    setDocument
} from '../services/firebaseService';
import { DNI_FRONT_PLACEHOLDER, DNI_BACK_PLACEHOLDER, TABLE_NAMES } from '../constants';
import { DEFAULT_ANNUAL_INTEREST_RATE, calculateLoanParameters, calculateMonthlyInterest } from '../config';

// UX Helper: Returns a context-aware success message
const getSuccessMessage = (baseMessage: string) => {
    if (navigator.onLine) {
        return baseMessage;
    }
    return `${baseMessage} (Guardado localmente. Se sincronizará al conectar)`;
};

// --- DATA MAPPERS (Centralized Logic) ---
const mapClientFromDB = (data: any): Client => ({
    ...data,
    archived: data.archived ?? false
});

const mapLoanFromDB = (l: any): Loan => ({
    ...l,
    initialCapital: l.initialCapital ?? l.amount,
    remainingCapital: l.remainingCapital ?? (l.status === 'Pagado' ? 0 : l.amount),
    lastPaymentDate: l.lastPaymentDate ?? l.startDate, 
    paymentHistory: l.paymentHistory ?? [],
    totalInterestPaid: l.totalInterestPaid ?? 0,
    totalCapitalPaid: l.totalCapitalPaid ?? 0,
    archived: l.archived ?? false,
    fundingSource: l.fundingSource ?? 'Capital'
});

export const useAppData = (
    showToast: (message: string, type: 'success' | 'error' | 'info') => void,
    user: User | null,
    isConfigReady: boolean
) => {
    const [clients, setClients] = useState<Client[]>([]);
    
    // Split Loans State
    const [activeLoans, setActiveLoans] = useState<Loan[]>([]);
    const [archivedLoans, setArchivedLoans] = useState<Loan[]>([]);
    const [lastArchivedLoanCursor, setLastArchivedLoanCursor] = useState<any>(null);
    const [hasMoreArchivedLoans, setHasMoreArchivedLoans] = useState(true);
    const [allHistoryLoaded, setAllHistoryLoaded] = useState(false);

    // Requests State
    const [requests, setRequests] = useState<LoanRequest[]>([]);
    const [requestsLimit, setRequestsLimit] = useState(20);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isInitialLoadRef = useRef(true);
    const prevRequestsCountRef = useRef(0);

    // Cargar datos en tiempo real con Firebase
    useEffect(() => {
        if (!isConfigReady || !user) return;

        setIsLoading(true);
        let clientsLoaded = false;
        let activeLoansLoaded = false;
        let requestsLoaded = false;

        const checkAllLoaded = () => {
            if (clientsLoaded && activeLoansLoaded && requestsLoaded) {
                setIsLoading(false);
            }
        };

        // 1. Clients: Subscribe to ALL clients (using centralized constant and mapper)
        const unsubClients = subscribeToCollection(TABLE_NAMES.CLIENTS, (data) => {
            const mappedClients = (data as any[]).map(mapClientFromDB);
            setClients(mappedClients);
            clientsLoaded = true;
            checkAllLoaded();
        }, [], (err) => {
            console.error("Error loading clients", err);
            clientsLoaded = true;
            checkAllLoaded();
        });

        // 2. Active Loans: Real-time subscription ONLY for active loans
        const unsubActiveLoans = subscribeToCollection(TABLE_NAMES.LOANS, (data) => {
            const mappedLoans = (data as any[]).map(mapLoanFromDB);
            setActiveLoans(mappedLoans);
            activeLoansLoaded = true;
            checkAllLoaded();
        }, [where('archived', '==', false)], (err) => { // FILTER: Only active
             console.error("Error loading active loans", err);
             activeLoansLoaded = true;
             checkAllLoaded();
        });

        // 3. Requests: Real-time subscription with LIMIT
        const unsubRequests = subscribeToCollection(
            TABLE_NAMES.REQUESTS, 
            (data) => {
                const reqs = (data || []) as LoanRequest[];
                setRequests(reqs);
                requestsLoaded = true;
                checkAllLoaded();
                setError(null);
            },
            [limit(requestsLimit)], // PAGINATION: Limit real-time listener
            (err) => {
                console.error("Error loading requests:", err);
                requestsLoaded = true;
                checkAllLoaded();
            }
        );

        // 4. Archived Loans: Initial Fetch (One-time, no subscription)
        const loadInitialArchived = async () => {
            try {
                const { data, lastVisible, hasMore } = await getPaginatedCollection(
                    TABLE_NAMES.LOANS, 
                    [where('archived', '==', true)], 
                    null, 
                    20
                );
                
                const mappedArchived = (data as any[]).map(mapLoanFromDB).map(l => ({ ...l, archived: true })); // Ensure archived true

                setArchivedLoans(mappedArchived);
                setLastArchivedLoanCursor(lastVisible);
                setHasMoreArchivedLoans(hasMore);
            } catch (e) {
                console.error("Error fetching initial archived loans:", e);
                // Fallback: don't block app
            }
        };
        loadInitialArchived();

        return () => {
            unsubClients();
            unsubActiveLoans();
            unsubRequests();
        };
    }, [isConfigReady, user, requestsLimit]);

    // Derived Lists
    const activeClients = useMemo(() => clients.filter(c => !c.archived), [clients]);
    const archivedClientsList = useMemo(() => clients.filter(c => c.archived), [clients]);
    const allLoans = useMemo(() => [...activeLoans, ...archivedLoans], [activeLoans, archivedLoans]);

    // PAGINATION HANDLERS

    const loadMoreRequests = useCallback(() => {
        setRequestsLimit(prev => prev + 20); // Increase limit for listener
    }, []);

    const loadMoreArchivedLoans = useCallback(async () => {
        if (!hasMoreArchivedLoans || isLoading) return;
        
        try {
            const { data, lastVisible, hasMore } = await getPaginatedCollection(
                TABLE_NAMES.LOANS, 
                [where('archived', '==', true)], 
                lastArchivedLoanCursor, 
                20
            );

            const mappedNew = (data as any[]).map(mapLoanFromDB).map(l => ({ ...l, archived: true }));

            setArchivedLoans(prev => [...prev, ...mappedNew]);
            setLastArchivedLoanCursor(lastVisible);
            setHasMoreArchivedLoans(hasMore);
        } catch (e: any) {
            showToast(`Error cargando más historial: ${e.message}`, 'error');
        }
    }, [hasMoreArchivedLoans, lastArchivedLoanCursor, isLoading, showToast]);

    const loadAllHistory = useCallback(async () => {
        if (allHistoryLoaded) return;
        try {
            // Warning: Expensive operation
            const rawData = await getCollection(TABLE_NAMES.LOANS, [where('archived', '==', true)]);
            const mappedAll = (rawData as any[]).map(mapLoanFromDB).map(l => ({ ...l, archived: true }));
            
            setArchivedLoans(mappedAll);
            setAllHistoryLoaded(true);
            setHasMoreArchivedLoans(false);
            showToast(`Historial completo cargado (${mappedAll.length} registros).`, 'success');
        } catch (e: any) {
            showToast(`Error cargando historial completo: ${e.message}`, 'error');
        }
    }, [allHistoryLoaded, showToast]);


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
            // Full manual reload implies resetting pagination
            const [clientsData, loansData, requestsData] = await Promise.all([
                getCollection(TABLE_NAMES.CLIENTS),
                getCollection(TABLE_NAMES.LOANS), 
                getCollection(TABLE_NAMES.REQUESTS)
            ]);

            const mappedClients = (clientsData as any[]).map(mapClientFromDB);
            setClients(mappedClients);
            
            const allFetchedLoans = (loansData as any[]).map(mapLoanFromDB);

            // Separate manually for state consistency
            setActiveLoans(allFetchedLoans.filter((l: Loan) => !l.archived));
            setArchivedLoans(allFetchedLoans.filter((l: Loan) => l.archived));
            setRequests(requestsData as LoanRequest[]);
            
            setAllHistoryLoaded(true); // Since we fetched everything via getCollection
            setHasMoreArchivedLoans(false);

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
        setRequestsLimit(20); // Reset limit to default
        // The effect will trigger re-sub
    }, []);

    // --- RECALCULATE TREASURY FEATURE ---
    const recalculateTreasury = useCallback(async () => {
        setIsLoading(true);
        try {
            showToast('Auditando todas las transacciones...', 'info');
            
            // 1. Fetch ALL loans (bypass pagination to get accurate sum)
            const allLoansRaw = await getCollection(TABLE_NAMES.LOANS);
            const allLoansParsed = allLoansRaw.map(mapLoanFromDB);

            let calculatedBank = 0;
            let calculatedCash = 0;
            let excludedCount = 0;

            // 2. Iterate and Sum (Payments IN)
            allLoansParsed.forEach(loan => {
                const name = loan.clientName.toLowerCase();
                if (name.includes('prueba') || name.includes('test')) {
                    excludedCount++;
                    return;
                }

                if (loan.paymentHistory && Array.isArray(loan.paymentHistory)) {
                    loan.paymentHistory.forEach(payment => {
                        const amount = Number(payment.amount) || 0;
                        if (payment.paymentMethod === 'Banco') {
                            calculatedBank += amount;
                        } else {
                            calculatedCash += amount;
                        }
                    });
                }
            });

            // 3. DEDUCT Loans OUT (When I lend money, it leaves the treasury)
            // Assumption: Loans are always given in Cash unless we add a "Payout Method" field later.
            // For now, let's assume loans reduce Cash balance primarily.
            allLoansParsed.forEach(loan => {
                const name = loan.clientName.toLowerCase();
                if (name.includes('prueba') || name.includes('test')) return;

                const loanPrincipal = Number(loan.initialCapital || loan.amount);
                calculatedCash -= loanPrincipal;
            });

            // 3. Update Treasury Doc
            await setDocument(TABLE_NAMES.TREASURY, 'main', {
                bankBalance: calculatedBank,
                cashBalance: calculatedCash,
                lastAudit: new Date().toISOString()
            });

            showToast(`Tesorería Recalculada. Banco: ${calculatedBank.toFixed(2)}€, Efectivo: ${calculatedCash.toFixed(2)}€. (Se excluyeron ${excludedCount} préstamos de prueba)`, 'success');

        } catch (err: any) {
            console.error("Error recalculating treasury:", err);
            showToast(`Error al recalcular: ${err.message}`, 'error');
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

            await addDocument(TABLE_NAMES.REQUESTS, newRequest);

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
            const clientDoc = await addDocument(TABLE_NAMES.CLIENTS, newClient);

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
                archived: false,
                fundingSource: 'Capital' // Default to Capital for approved requests
            };
            await addDocument(TABLE_NAMES.LOANS, newLoan);

            // DEDUCT FROM TREASURY (Assume Cash for approvals for now)
            try {
                const treasuryDoc = await getDocument(TABLE_NAMES.TREASURY, 'main');
                const data = treasuryDoc as any;
                const currentCash = Number(data?.cashBalance || 0);
                await setDocument(TABLE_NAMES.TREASURY, 'main', { cashBalance: currentCash - loanAmount });
            } catch(e) { console.error("Treasury update failed", e); }

            await deleteDocument(TABLE_NAMES.REQUESTS, request.id);
            
            showToast(getSuccessMessage(`Préstamo Aprobado para ${request.fullName}`), 'success');
            
        } catch (err: any) {
            console.error("Failed to approve request:", err);
            showToast(`Error al aprobar: ${err.message}`, 'error');
            throw err;
        }
    }, [showToast]);
    
    const handleRejectRequest = useCallback(async (request: LoanRequest) => {
        try {
            await deleteDocument(TABLE_NAMES.REQUESTS, request.id);
            showToast(getSuccessMessage('Solicitud rechazada y eliminada.'), 'success');
        } catch (err: any) {
            showToast(`Error al rechazar: ${err.message}`, 'error');
            throw err;
        }
    }, [showToast]);

    const handleUpdateRequestStatus = useCallback(async (requestId: string, status: RequestStatus) => {
        try {
            await updateDocument(TABLE_NAMES.REQUESTS, requestId, { status });
            showToast(getSuccessMessage(`Solicitud actualizada a "${status}".`), 'info');
        } catch (err: any) {
            showToast(`Error: ${err.message}`, 'error');
            throw err;
        }
    }, [showToast]);
    
    const handleRegisterPayment = useCallback(async (loanId: string, amount: number, date: string, notes: string, paymentMethod: 'Efectivo' | 'Banco' = 'Efectivo') => {
        const loan = activeLoans.find(l => l.id === loanId) || archivedLoans.find(l => l.id === loanId);
        if (!loan || loan.status === LoanStatus.PAID) return;
        
        // CHECK FOR TEST CLIENT TO AVOID TREASURY UPDATE
        const isTestClient = loan.clientName.toLowerCase().includes('prueba') || loan.clientName.toLowerCase().includes('test');

        const { interest } = calculateMonthlyInterest(loan.remainingCapital, loan.interestRate);

        let interestPaid = 0;
        let capitalPaid = 0;

        const numericAmount = Number(amount);

        if (numericAmount <= interest) {
            interestPaid = numericAmount;
            capitalPaid = 0;
        } else {
            interestPaid = interest;
            capitalPaid = numericAmount - interest;
        }

        const newRemainingCapital = Math.max(0, loan.remainingCapital - capitalPaid);
        const isPaidOff = newRemainingCapital <= 0.1;

        const newPaymentRecord: PaymentRecord = {
            id: Date.now().toString(),
            date: date,
            amount: numericAmount,
            interestPaid: interestPaid,
            capitalPaid: capitalPaid,
            remainingCapitalAfter: newRemainingCapital,
            notes: notes,
            paymentMethod: paymentMethod
        };

        const updatedHistory = [...(loan.paymentHistory || []), newPaymentRecord];

        try {
            // 1. Actualizar Préstamo
            await updateDocument(TABLE_NAMES.LOANS, loanId, { 
                paymentsMade: loan.paymentsMade + 1, 
                status: isPaidOff ? LoanStatus.PAID : LoanStatus.PENDING,
                remainingCapital: newRemainingCapital,
                totalInterestPaid: (loan.totalInterestPaid || 0) + interestPaid,
                totalCapitalPaid: (loan.totalCapitalPaid || 0) + capitalPaid,
                paymentHistory: updatedHistory,
                lastPaymentDate: date
            });

            // 2. Actualizar Tesorería
            if (!isTestClient) {
                try {
                    const treasuryDoc = await getDocument(TABLE_NAMES.TREASURY, 'main');
                    let currentBank = 0;
                    let currentCash = 0;
                    let currentBankName = 'Banco';

                    if (treasuryDoc) {
                        const data = treasuryDoc as any;
                        currentBank = Number(data.bankBalance) || 0;
                        currentCash = Number(data.cashBalance) || 0;
                        currentBankName = data.bankName || 'Banco';
                    }

                    if (paymentMethod === 'Banco') {
                        currentBank += numericAmount;
                    } else {
                        currentCash += numericAmount; 
                    }

                    await setDocument(TABLE_NAMES.TREASURY, 'main', { 
                        bankName: currentBankName,
                        bankBalance: Number(currentBank), 
                        cashBalance: Number(currentCash) 
                    });
                } catch (treasuryError) {
                    console.error("Error actualizando tesorería automática:", treasuryError);
                    showToast("El pago se registró, pero hubo un error actualizando el saldo de la caja.", "error");
                }
                showToast(getSuccessMessage(`Pago de ${numericAmount.toFixed(2)}€ (${paymentMethod}) registrado exitosamente.`), 'success');
            } else {
                showToast(getSuccessMessage(`Pago registrado (Modo Prueba: No afecta caja).`), 'info');
            }

        } catch (err: any) {
            console.error("Error updating loan payment:", err);
            showToast(`Error: ${err.message}`, 'error');
            throw err; 
        }
    }, [activeLoans, archivedLoans, showToast]);

    const handleUpdatePayment = useCallback(async (loanId: string, paymentId: string, newInterest: number, newAmount: number, newDate: string, newNotes: string) => {
        try {
            const loan = activeLoans.find(l => l.id === loanId) || archivedLoans.find(l => l.id === loanId);
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
        
            await updateDocument(TABLE_NAMES.LOANS, loanId, {
                paymentHistory: newHistory,
                remainingCapital: newLoanRemaining,
                totalInterestPaid: newTotalInterest,
                totalCapitalPaid: newTotalCapital,
                status: newLoanRemaining < 0.1 ? LoanStatus.PAID : LoanStatus.PENDING
            });
        
            showToast(getSuccessMessage("Pago corregido exitosamente."), "success");
        } catch (err: any) {
            console.error("Error updating payment:", err);
            showToast(`Error al corregir pago: ${err.message}`, 'error');
            throw err;
        }
    }, [activeLoans, archivedLoans, showToast]);

    const handleBalanceCorrection = useCallback(async (loanId: string, newBalance: number, notes: string) => {
        try {
            const loan = activeLoans.find(l => l.id === loanId) || archivedLoans.find(l => l.id === loanId);
            if (!loan) throw new Error("Préstamo no encontrado");

            const balanceDifference = loan.remainingCapital - newBalance;
            
            const newPaymentRecord: PaymentRecord = {
                id: `ADJ-${Date.now()}`,
                date: new Date().toISOString(),
                amount: 0, 
                interestPaid: 0,
                capitalPaid: balanceDifference,
                remainingCapitalAfter: newBalance,
                notes: `[SISTEMA] Corrección de saldo: ${notes}`
            };

            const updatedHistory = [...(loan.paymentHistory || []), newPaymentRecord];
            const newTotalCapitalPaid = (loan.totalCapitalPaid || 0) + balanceDifference;

            await updateDocument(TABLE_NAMES.LOANS, loanId, {
                remainingCapital: newBalance,
                totalCapitalPaid: newTotalCapitalPaid,
                paymentHistory: updatedHistory,
                status: newBalance <= 0.1 ? LoanStatus.PAID : LoanStatus.PENDING
            });

            showToast(getSuccessMessage("Saldo corregido y registrado en historial."), "success");

        } catch (err: any) {
            console.error("Error adjusting balance:", err);
            showToast(`Error al ajustar saldo: ${err.message}`, 'error');
            throw err;
        }
    }, [activeLoans, archivedLoans, showToast]);

    const handleAddClientAndLoan = useCallback(async (clientData: NewClientData, loanData: NewLoanData & { fundingSource?: 'Capital' | 'Reinvested' }) => {
        try {
            if (isNaN(loanData.amount) || loanData.amount <= 0) throw new Error("El monto del préstamo debe ser válido.");
            if (isNaN(loanData.term) || loanData.term < 0) throw new Error("El plazo del préstamo debe ser válido.");
            
            if (!clientData.name || clientData.name.trim() === '') throw new Error("El nombre del cliente es obligatorio.");
            if (!clientData.idNumber || clientData.idNumber.trim() === '') throw new Error("El DNI es obligatorio.");

            const exists = await checkClientExists(clientData.idNumber);
            if (exists) {
                throw new Error(`El cliente con DNI ${clientData.idNumber} ya está registrado.`);
            }

            const clientDoc = await addDocument(TABLE_NAMES.CLIENTS, {
                ...clientData,
                joinDate: new Date().toISOString(),
                archived: false
            });

             const { monthlyPayment, totalRepayment } = calculateLoanParameters(loanData.amount, loanData.term);
             const startDate = new Date().toISOString();
 
             await addDocument(TABLE_NAMES.LOANS, {
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
                 archived: false,
                 fundingSource: loanData.fundingSource || 'Capital'
             });

             // DEDUCT FROM TREASURY (Automatic)
             try {
                const treasuryDoc = await getDocument(TABLE_NAMES.TREASURY, 'main');
                const data = treasuryDoc as any;
                const currentCash = Number(data?.cashBalance || 0);
                await setDocument(TABLE_NAMES.TREASURY, 'main', { cashBalance: currentCash - loanData.amount });
            } catch(e) { console.error("Treasury deduction failed", e); }

            showToast(getSuccessMessage(`Cliente registrado y préstamo creado.`), 'success');

        } catch (err: any) {
            console.error(err);
            showToast(err.message, 'error');
            throw err; 
        }
    }, [showToast]);

    const handleAddLoan = useCallback(async (clientId: string, clientName: string, loanData: { amount: number; term: number; interestRate: number; startDate: string; notes: string; fundingSource?: 'Capital' | 'Reinvested' }) => {
        try {
            const { monthlyPayment, totalRepayment } = calculateLoanParameters(loanData.amount, loanData.term, loanData.interestRate);

            await addDocument(TABLE_NAMES.LOANS, {
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
                archived: false,
                fundingSource: loanData.fundingSource || 'Capital'
            });

            // DEDUCT FROM TREASURY (Automatic)
            try {
                const treasuryDoc = await getDocument(TABLE_NAMES.TREASURY, 'main');
                const data = treasuryDoc as any;
                const currentCash = Number(data?.cashBalance || 0);
                await setDocument(TABLE_NAMES.TREASURY, 'main', { cashBalance: currentCash - loanData.amount });
            } catch(e) { console.error("Treasury deduction failed", e); }

            showToast(getSuccessMessage('Préstamo añadido y fondos descontados de caja.'), 'success');
        } catch (err: any) {
            showToast(`Error: ${err.message}`, 'error');
            throw err;
        }
    }, [showToast]);

    const handleUpdateLoan = useCallback(async (loanId: string, updatedData: Partial<Loan>) => {
        try {
            await updateDocument(TABLE_NAMES.LOANS, loanId, updatedData);
            showToast(getSuccessMessage('Datos del préstamo actualizados.'), 'success');
        } catch (err: any) {
            showToast(`Error: ${err.message}`, 'error');
            throw err;
        }
    }, [showToast]);

    const handleUpdateClient = useCallback(async (clientId: string, updatedData: Partial<Client>) => {
        try {
            await updateDocument(TABLE_NAMES.CLIENTS, clientId, updatedData);
            showToast(getSuccessMessage('Datos del cliente actualizados.'), 'success');
        } catch (err: any) {
            showToast(`Error al actualizar cliente: ${err.message}`, 'error');
            throw err;
        }
    }, [showToast]);

    const handleDeleteLoan = useCallback(async (loanId: string, clientName: string) => {
        try {
            await deleteDocument(TABLE_NAMES.LOANS, loanId);
            showToast(getSuccessMessage(`Préstamo eliminado permanentemente.`), 'success');
        } catch (err: any) {
            showToast(`Error: ${err.message}`, 'error');
            throw err;
        }
    }, [showToast]);

    const handleArchivePaidLoans = useCallback(async () => {
        try {
            const loansToArchive = activeLoans.filter(l => l.status === LoanStatus.PAID && !l.archived);
            
            if (loansToArchive.length === 0) {
                showToast('No hay préstamos pagados para archivar.', 'info');
                return 0;
            }

            const updatePromises = loansToArchive.map(loan => 
                updateDocument(TABLE_NAMES.LOANS, loan.id, { archived: true })
            );

            await Promise.all(updatePromises);
            
            showToast(getSuccessMessage(`${loansToArchive.length} préstamos archivados correctamente.`), 'success');
            return loansToArchive.length;
        } catch (err: any) {
            console.error("Error archiving loans:", err);
            showToast(`Error al archivar: ${err.message}`, 'error');
            return 0;
        }
    }, [activeLoans, showToast]);

    const handleArchiveClient = useCallback(async (clientId: string) => {
        try {
            await updateDocument(TABLE_NAMES.CLIENTS, clientId, { archived: true });
            showToast(getSuccessMessage('Cliente movido al historial.'), 'success');
        } catch (err: any) {
            showToast(`Error al archivar cliente: ${err.message}`, 'error');
        }
    }, [showToast]);

    const handleRestoreClient = useCallback(async (clientId: string) => {
        try {
            await updateDocument(TABLE_NAMES.CLIENTS, clientId, { archived: false });
            showToast(getSuccessMessage('Cliente restaurado a la lista principal.'), 'success');
        } catch (err: any) {
            showToast(`Error al restaurar cliente: ${err.message}`, 'error');
        }
    }, [showToast]);

    const handleBatchDeleteClients = useCallback(async (clientIds: string[]) => {
        try {
            if (clientIds.length === 0) return;
            const deletePromises = clientIds.map(id => deleteDocument(TABLE_NAMES.CLIENTS, id));
            await Promise.all(deletePromises);
            showToast(getSuccessMessage(`${clientIds.length} clientes eliminados permanentemente.`), 'success');
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
            
            await addDocument(TABLE_NAMES.REQUESTS, testRequest);
            showToast(getSuccessMessage('Solicitud de prueba generada.'), 'success');
        } catch (err: any) {
            console.error("Error generating test request:", err);
            showToast(`Error al generar prueba: ${err.message}`, 'error');
        }
    }, [showToast]);

    const handleGenerateTestClient = useCallback(async () => {
        try {
            const randomId = Math.floor(Math.random() * 10000);
            const clientData = {
                name: `Cliente Prueba ${randomId}`,
                idNumber: `TEST-${randomId}`,
                address: 'Calle de Prueba 123, Ciudad Test',
                phone: '600000000',
                email: `test${randomId}@ejemplo.com`,
                joinDate: new Date().toISOString(),
                archived: false
            };

            const clientDoc = await addDocument(TABLE_NAMES.CLIENTS, clientData);

            const startDate = new Date().toISOString();
            const { monthlyPayment, totalRepayment } = calculateLoanParameters(1000, 12, DEFAULT_ANNUAL_INTEREST_RATE);

            const loanData = {
                clientId: clientDoc.id,
                clientName: clientData.name,
                amount: 1000,
                initialCapital: 1000,
                remainingCapital: 1000,
                interestRate: DEFAULT_ANNUAL_INTEREST_RATE,
                term: 12,
                startDate: startDate,
                lastPaymentDate: startDate,
                status: LoanStatus.PENDING,
                monthlyPayment,
                totalRepayment,
                paymentsMade: 0,
                totalInterestPaid: 0,
                totalCapitalPaid: 0,
                paymentHistory: [],
                notes: 'Préstamo de prueba generado automáticamente.',
                archived: false
            };

            await addDocument(TABLE_NAMES.LOANS, loanData);
            showToast(getSuccessMessage('Cliente de prueba generado. Ve a "Recibos" para probar.'), 'success');
        } catch (err: any) {
            console.error("Error generating test client:", err);
            showToast(`Error: ${err.message}`, 'error');
        }
    }, [showToast]);

    const handleDeleteTestRequests = useCallback(async () => {
         try {
            const testRequests = requests.filter(r => r.fullName.startsWith('Cliente de Prueba'));
            
            if (testRequests.length === 0) {
                showToast('No se encontraron solicitudes de prueba.', 'info');
                return;
            }

            const deletePromises = testRequests.map(req => deleteDocument(TABLE_NAMES.REQUESTS, req.id));
            await Promise.all(deletePromises);

            showToast(getSuccessMessage(`${testRequests.length} solicitudes de prueba eliminadas.`), 'success');
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
        archivedClients: archivedClientsList,        
        loans: activeLoans,
        archivedLoans,
        allLoans,
        requests,
        isLoading,
        error,
        clientLoanData,
        hasMoreArchivedLoans,
        hasMoreRequests: true, // simplified for now
        allHistoryLoaded,
        loadMoreRequests,
        loadMoreArchivedLoans,
        loadAllHistory,
        handleLoanRequestSubmit,
        handleApproveRequest,
        handleRejectRequest,
        handleUpdateRequestStatus,
        handleRegisterPayment,
        handleUpdatePayment,
        handleBalanceCorrection,
        handleAddClientAndLoan,
        handleAddLoan,
        handleGenerateTestRequest,
        handleGenerateTestClient,
        handleDeleteTestRequests,
        handleUpdateLoan,
        handleUpdateClient,
        handleDeleteLoan,
        handleArchivePaidLoans,
        handleArchiveClient,
        handleRestoreClient,
        handleBatchDeleteClients,
        reloadRequests,
        refreshAllData,
        recalculateTreasury 
    };
};
