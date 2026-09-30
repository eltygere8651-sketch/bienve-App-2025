
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
    subscribeToCollection, 
    addDocument, 
    updateDocument, 
    deleteDocument, 
    setDocument, 
    getDocument,
    getPaginatedCollection,
    where,
    orderBy,
    limit,
    startAfter,
    query,
    getCollection
} from '../services/firebaseService';
import { generateMasterBackupPDF } from '../services/pdfService';
import { LOCAL_STORAGE_KEYS, TABLE_NAMES } from '../constants';
import { Client, Loan, LoanRequest, RequestStatus, NewClientData, NewLoanData, ReinvestmentRecord, LoanStatus, PaymentRecord, PersonalFund, WithdrawalRecord } from '../types';
import { calculateMonthlyInterest, calculateLoanParameters, DEFAULT_ANNUAL_INTEREST_RATE } from '../config';
import { formatCurrency } from '../services/utils';

import { useDataSubscriptions } from './useDataSubscriptions';

export const useAppData = (showToast: (msg: string, type: 'success' | 'error' | 'info') => void, user: any, isConfigReady: boolean) => {
    const {
        clients,
        archivedClients,
        loans,
        archivedLoans,
        requests,
        reinvestments,
        funds,
        withdrawals,
        isLoading,
        error,
        setIsLoading,
        setLoans,
        setArchivedLoans
    } = useDataSubscriptions(user, isConfigReady, showToast);
    
    // Pagination state for archived loans
    const [lastArchivedLoanDoc, setLastArchivedLoanDoc] = useState<any>(null);
    const [hasMoreArchivedLoans, setHasMoreArchivedLoans] = useState(false);
    const [allHistoryLoaded, setAllHistoryLoaded] = useState(true);

    const loadMoreArchivedLoans = useCallback(async (reset = false) => {
        if (!user) return;
        try {
            const currentLastDoc = reset ? null : lastArchivedLoanDoc;
            const pageSize = 20;
            
            const result = await getPaginatedCollection(
                TABLE_NAMES.LOANS,
                [where('archived', '==', true)],
                currentLastDoc,
                pageSize
            );

            setArchivedLoans(prev => {
                const map = new Map<string, Loan>();
                prev.forEach(l => map.set(l.id, l));
                (result.data as Loan[]).forEach(l => map.set(l.id, l));
                return Array.from(map.values());
            });
            
            setLastArchivedLoanDoc(result.lastVisible);
            setHasMoreArchivedLoans(result.hasMore);
        } catch (err) {
            console.error("Error loading archived loans:", err);
        }
    }, [user, lastArchivedLoanDoc, setArchivedLoans]);

    const loadAllHistory = useCallback(async () => {
        if (!user) return;
        try {
            const allArchivedRaw = await getCollection(TABLE_NAMES.LOANS, [where('archived', '==', true)]);
            const allArchived = (allArchivedRaw as Loan[]).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
            
            setArchivedLoans(prev => {
                const map = new Map<string, Loan>();
                prev.forEach(l => map.set(l.id, l));
                allArchived.forEach(l => map.set(l.id, l));
                return Array.from(map.values());
            });
            setAllHistoryLoaded(true);
            setHasMoreArchivedLoans(false);
            showToast(`Historial completo sincronizado.`, 'success');
        } catch (err: any) {
            console.error(err);
            showToast('Error cargando historial: ' + err.message, 'error');
        }
    }, [user, showToast, setArchivedLoans]);

    // Combine active and archived loans deduplicated by ID - available to all handlers
    const allLoans = useMemo(() => {
        const map = new Map<string, Loan>();
        loans.forEach(l => map.set(l.id, l));
        archivedLoans.forEach(l => map.set(l.id, l));
        return Array.from(map.values());
    }, [loans, archivedLoans]);

    // --- HELPERS ---
    const _updateTreasuryBalance = useCallback(async (amount: number, type: 'inflow' | 'outflow', source: 'Banco' | 'Efectivo') => {
        try {
            const treasuryDoc = await getDocument(TABLE_NAMES.TREASURY, 'main');
            let balances = { bankBalance: 0, cashBalance: 0 };
            
            if (treasuryDoc) {
                balances = {
                    bankBalance: Number((treasuryDoc as any).bankBalance) || 0,
                    cashBalance: Number((treasuryDoc as any).cashBalance) || 0
                };
            }

            const multiplier = type === 'inflow' ? 1 : -1;
            
            if (source === 'Banco') {
                balances.bankBalance += (amount * multiplier);
            } else {
                balances.cashBalance += (amount * multiplier);
            }

            await setDocument(TABLE_NAMES.TREASURY, 'main', balances);
        } catch (e) {
            console.error("Treasury update error:", e);
        }
    }, []);

    // --- ACTIONS ---

    const handleLoanRequestSubmit = useCallback(async (requestData: any, files: { frontId: string, backId: string }) => {
        try {
            await addDocument(TABLE_NAMES.REQUESTS, {
                ...requestData,
                frontIdUrl: files.frontId, // Base64 string
                backIdUrl: files.backId,   // Base64 string
                requestDate: new Date().toISOString(),
                status: RequestStatus.PENDING
            });
            showToast('Solicitud enviada correctamente.', 'success');
        } catch (err: any) {
            console.error(err);
            showToast('Error al enviar solicitud: ' + err.message, 'error');
            throw err;
        }
    }, [showToast]);

    const handleApproveRequest = useCallback(async (request: LoanRequest, loanAmount: number, loanTerm: number, source: 'Banco' | 'Efectivo' = 'Banco') => {
        try {
            // 1. Create Client
            const newClient = await addDocument(TABLE_NAMES.CLIENTS, {
                name: request.fullName,
                idNumber: request.idNumber,
                phone: request.phone,
                address: request.address,
                email: request.email,
                joinDate: new Date().toISOString(),
            });

            // 2. Create Loan
            // Calculate details using centralized logic
            const { monthlyPayment, totalRepayment, monthlyRatePercentage } = calculateLoanParameters(loanAmount, loanTerm);

            await addDocument(TABLE_NAMES.LOANS, {
                clientId: newClient.id,
                clientName: request.fullName,
                amount: loanAmount,
                initialCapital: loanAmount,
                remainingCapital: loanAmount,
                interestRate: monthlyRatePercentage * 12, // Annual rate for storage
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
                fundingSource: source // Store the source
            });

            // 3. Update Request Status (or delete?)
            await updateDocument(TABLE_NAMES.REQUESTS, request.id, { status: RequestStatus.APPROVED });
            
            // 4. Update Treasury (Deduct loan amount)
            await _updateTreasuryBalance(loanAmount, 'outflow', source);

            showToast(`Préstamo aprobado para ${request.fullName}.`, 'success');
        } catch (err: any) {
            console.error(err);
            showToast('Error al aprobar: ' + err.message, 'error');
        }
    }, [showToast, _updateTreasuryBalance]);

    const handleRejectRequest = useCallback(async (request: LoanRequest) => {
        try {
            await updateDocument(TABLE_NAMES.REQUESTS, request.id, { status: RequestStatus.DENIED });
            // Alternatively delete?
            // await deleteDocument(TABLE_NAMES.REQUESTS, request.id);
            showToast('Solicitud rechazada.', 'info');
        } catch (err: any) {
            showToast('Error: ' + err.message, 'error');
        }
    }, [showToast]);

    const handleUpdateRequestStatus = useCallback(async (requestId: string, status: RequestStatus) => {
        try {
            await updateDocument(TABLE_NAMES.REQUESTS, requestId, { status });
            showToast(`Estado actualizado a ${status}.`, 'success');
        } catch (err: any) {
            showToast('Error al actualizar estado.', 'error');
        }
    }, [showToast]);

    const handleRegisterPayment = useCallback(async (loanId: string, amount: number, date: string, notes: string, paymentMethod: 'Efectivo' | 'Banco' = 'Efectivo', isLiquidation: boolean = false) => {
        const loan = allLoans.find(l => l.id === loanId) || loans.find(l => l.id === loanId) || archivedLoans.find(l => l.id === loanId);
        if (!loan) throw new Error("Préstamo no encontrado");

        const { interest: monthlyInterest } = calculateMonthlyInterest(loan.remainingCapital, loan.interestRate);
        
        let payOffRegular = Math.min(amount, monthlyInterest);
        let amountAfterRegular = amount - payOffRegular;
        let capitalPart = Math.max(0, amountAfterRegular);
        let remainingCapitalAfter = Math.max(0, loan.remainingCapital - capitalPart);

        if (isLiquidation) {
            capitalPart = loan.remainingCapital;
            payOffRegular = Math.max(0, amount - capitalPart);
            remainingCapitalAfter = 0;
        }

        const newPayment: PaymentRecord = {
            id: Date.now().toString(),
            date,
            amount,
            interestPaid: payOffRegular,
            capitalPaid: capitalPart,
            remainingCapitalAfter,
            notes: notes.trim(),
            payOffRegular,
            paymentMethod
        };

        const updatedHistory = [...(loan.paymentHistory || []), newPayment];
        const totalCapitalPaid = updatedHistory.reduce((acc, p) => acc + p.capitalPaid, 0);
        const totalInterestPaidForLoan = updatedHistory.reduce((acc, p) => acc + p.interestPaid, 0);
        
        let newStatus = loan.status;
        if (remainingCapitalAfter <= 0) newStatus = LoanStatus.PAID;
        if (remainingCapitalAfter > 0) {
            newStatus = LoanStatus.PENDING;
        }

        const updatePayload: Partial<Loan> = {
            remainingCapital: remainingCapitalAfter,
            paymentHistory: updatedHistory,
            totalCapitalPaid,
            totalInterestPaid: totalInterestPaidForLoan,
            status: newStatus,
            paymentsMade: updatedHistory.length,
            lastPaymentDate: date
        };

        if (isLiquidation || remainingCapitalAfter <= 0) {
            updatePayload.pendingInterest = 0;
            updatePayload.archived = false; // explicitly keep it visible in closed loans
            if (loan.overdueHistory) {
                updatePayload.overdueHistory = loan.overdueHistory.map(h => ({...h, status: h.status === 'pendiente' ? 'reclamado' : h.status}));
            }
        }

        // Optimistic UI state update so layout updates in 0ms without leaving/refreshing the app
        const fullUpdatedLoan: Loan = { ...loan, ...updatePayload };
        if (newStatus === LoanStatus.PAID) {
            setLoans(prev => prev.filter(l => l.id !== loanId));
            setArchivedLoans(prev => {
                const map = new Map<string, Loan>();
                map.set(loanId, fullUpdatedLoan);
                prev.forEach(l => { if (l.id !== loanId) map.set(l.id, l); });
                return Array.from(map.values());
            });
        } else {
            setLoans(prev => prev.map(l => l.id === loanId ? fullUpdatedLoan : l));
            setArchivedLoans(prev => prev.map(l => l.id === loanId ? fullUpdatedLoan : l));
        }

        await updateDocument(TABLE_NAMES.LOANS, loanId, updatePayload);

        // Update Treasury
        let treasuryInflow = amount;
        const fundingSrc = loan.fundingSource || loan.source;
        if (fundingSrc === 'Fondo Personal') {
            treasuryInflow = payOffRegular; // Only interest goes to treasury
        }
        
        if (treasuryInflow > 0) {
            await _updateTreasuryBalance(treasuryInflow, 'inflow', paymentMethod);
        }
    }, [loans, allLoans, archivedLoans, setLoans, setArchivedLoans, _updateTreasuryBalance]);

    // Background check for overdue loans (Runs when app loads or loans update)
    // Background check for potential overdue loans (Informative only)
    const [suggestedOverdues, setSuggestedOverdues] = useState<{ loanId: string, monthName: string, amount: number, accrualDate: string }[]>([]);

    useEffect(() => {
        const checkPotentialOverdue = () => {
            if (!loans.length || isLoading) return;

            const today = new Date();
            const suggestions: { loanId: string, monthName: string, amount: number, accrualDate: string }[] = [];

            loans.forEach(loan => {
                if (loan.status === LoanStatus.PAID || loan.archived) return;

                const baseDate = loan.lastPaymentDate ? new Date(loan.lastPaymentDate) : new Date(loan.startDate);
                let tempBaseDate = new Date(baseDate.getTime());
                const todayTime = today.getTime();
                let limit = 0;

                while (todayTime - tempBaseDate.getTime() >= 35 * 24 * 60 * 60 * 1000 && limit < 48) {
                    limit++;
                    const accrualDate = new Date(tempBaseDate.getTime() + 30 * 24 * 60 * 60 * 1000); // We still count by 30 day periods for the amount
                    const monthDate = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(accrualDate);
                    const overdueHistory = loan.overdueHistory || [];
                    const parts = monthDate.toLowerCase().split(' ');
                    const monthPart = parts[0];
                    const yearPart = parseInt(parts[parts.length - 1]);
                    
                    const alreadyExists = overdueHistory.some(m => 
                        m.monthName.toLowerCase() === monthPart && m.year === yearPart
                    );
                    
                    if (!alreadyExists) {
                        const { interest } = calculateMonthlyInterest(loan.remainingCapital, loan.interestRate);
                        suggestions.push({
                            loanId: loan.id,
                            monthName: monthDate,
                            amount: interest,
                            accrualDate: accrualDate.toISOString()
                        });
                    }

                    // Advance tempBaseDate for the next iteration (checks the next month slot)
                    tempBaseDate = accrualDate;
                }
            });

            setSuggestedOverdues(suggestions);
        };
        
        checkPotentialOverdue();
    }, [loans, isLoading]);

    const handleConfirmOverdue = useCallback(async (loanId: string, suggestion: { monthName: string, amount: number, accrualDate: string }, initialStatus: 'pendiente' | 'anulado' = 'pendiente') => {
        const loan = allLoans.find(l => l.id === loanId) || loans.find(l => l.id === loanId) || archivedLoans.find(l => l.id === loanId);
        if (!loan) return;

        const parts = suggestion.monthName.split(' ');
        const monthName = parts[0] || '';
        const year = parseInt(parts[parts.length - 1] || new Date().getFullYear().toString());

        const overdueHistory = [...(loan.overdueHistory || [])];
        overdueHistory.push({
            id: `OVERDUE-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            monthName: monthName.charAt(0).toUpperCase() + monthName.slice(1),
            year: year,
            amount: suggestion.amount,
            status: initialStatus,
            createdAt: new Date().toISOString()
        });

        const newPendingInterest = initialStatus === 'pendiente' ? (loan.pendingInterest || 0) + suggestion.amount : (loan.pendingInterest || 0);
        const newStatus = initialStatus === 'pendiente' ? LoanStatus.OVERDUE : (newPendingInterest > 0 ? LoanStatus.OVERDUE : LoanStatus.PENDING);

        await updateDocument(TABLE_NAMES.LOANS, loanId, {
            status: loan.remainingCapital > 0 ? newStatus : LoanStatus.PAID,
            overdueHistory,
            pendingInterest: newPendingInterest,
            // We advance the lastPaymentDate (virtually) so it doesn't suggest the same month again immediately
            lastPaymentDate: suggestion.accrualDate
        });

        showToast(`Mora de ${suggestion.monthName} registrada${initialStatus === 'anulado' ? ' y perdonada' : ''} correctamente.`, 'success');
    }, [loans, allLoans, archivedLoans, showToast]);

    const handleManualAddOverdue = useCallback(async (loanId: string, monthName: string, year: number, amount: number) => {
        const loan = allLoans.find(l => l.id === loanId) || loans.find(l => l.id === loanId) || archivedLoans.find(l => l.id === loanId);
        if (!loan) return;

        const overdueHistory = [...(loan.overdueHistory || [])];
        overdueHistory.push({
            id: `OVERDUE-MAN-${Date.now()}`,
            monthName: monthName.charAt(0).toUpperCase() + monthName.slice(1),
            year: year,
            amount: amount,
            status: 'pendiente',
            createdAt: new Date().toISOString()
        });

        await updateDocument(TABLE_NAMES.LOANS, loanId, {
            status: LoanStatus.OVERDUE,
            overdueHistory,
            pendingInterest: (loan.pendingInterest || 0) + amount
        });

        showToast(`Interés vencido de ${monthName} ${year} registrado manualmente.`, 'success');
    }, [loans, allLoans, archivedLoans, showToast]);

    const handleDeleteOverdueMonth = useCallback(async (loanId: string, overdueId: string) => {
        const loan = allLoans.find(l => l.id === loanId) || loans.find(l => l.id === loanId) || archivedLoans.find(l => l.id === loanId);
        if (!loan || !loan.overdueHistory) return;

        const itemToDelete = loan.overdueHistory.find(m => m.id === overdueId);
        if (!itemToDelete) return;

        const updatedHistory = loan.overdueHistory.filter(m => m.id !== overdueId);
        
        // Recalculate pendingInterest
        const newTotalPending = updatedHistory
            .filter(m => m.status === 'pendiente')
            .reduce((acc, m) => acc + m.amount, 0);

        const newStatus = (newTotalPending > 0) ? LoanStatus.OVERDUE : LoanStatus.PENDING;

        await updateDocument(TABLE_NAMES.LOANS, loanId, {
            overdueHistory: updatedHistory,
            pendingInterest: newTotalPending,
            status: loan.remainingCapital > 0 ? newStatus : LoanStatus.PAID
        });

        showToast(`Registro de mora eliminado.`, 'info');
    }, [loans, allLoans, archivedLoans, showToast]);

    const handleClearOverdueHistory = useCallback(async (loanId: string) => {
        const loan = allLoans.find(l => l.id === loanId) || loans.find(l => l.id === loanId) || archivedLoans.find(l => l.id === loanId);
        if (!loan) return;

        await updateDocument(TABLE_NAMES.LOANS, loanId, {
            overdueHistory: [],
            pendingInterest: 0,
            pendingInterestDetails: '',
            status: loan.remainingCapital > 0 ? LoanStatus.PENDING : LoanStatus.PAID
        });

        showToast(`Historial de mora de ${loan.clientName} limpiado por completo.`, 'success');
    }, [loans, allLoans, archivedLoans, showToast]);

    const handleUpdatePayment = useCallback(async (loanId: string, paymentId: string, newInterest: number, newAmount: number, newDate: string, newNotes: string) => {
        const loan = allLoans.find(l => l.id === loanId) || loans.find(l => l.id === loanId) || archivedLoans.find(l => l.id === loanId);
        if (!loan) return;

        // Find and update the specific payment
        const updatedHistory = (loan.paymentHistory || []).map(p => {
            if (p.id === paymentId) {
                const capitalPart = Math.max(0, newAmount - newInterest);
                return {
                    ...p,
                    date: newDate,
                    amount: newAmount,
                    interestPaid: newInterest,
                    capitalPaid: capitalPart,
                    notes: newNotes
                };
            }
            return p;
        });

        const totalCapitalPaid = updatedHistory.reduce((acc, p) => acc + p.capitalPaid, 0);
        const totalInterestPaid = updatedHistory.reduce((acc, p) => acc + p.interestPaid, 0);
        const initialCap = loan.initialCapital || loan.amount;
        const remainingCapital = Math.max(0, initialCap - totalCapitalPaid);

        let newStatus = loan.status;
        if (remainingCapital <= 0) newStatus = LoanStatus.PAID;
        else if (newStatus === LoanStatus.PAID) newStatus = LoanStatus.PENDING;

        const updatedDoc = {
            paymentHistory: updatedHistory,
            totalCapitalPaid,
            totalInterestPaid,
            remainingCapital,
            status: newStatus
        };

        setLoans(prev => prev.map(l => l.id === loanId ? { ...l, ...updatedDoc } : l));
        setArchivedLoans(prev => prev.map(l => l.id === loanId ? { ...l, ...updatedDoc } : l));

        await updateDocument(TABLE_NAMES.LOANS, loanId, updatedDoc);
        showToast('Pago actualizado y saldos recalculados al momento.', 'success');
    }, [loans, allLoans, archivedLoans, setLoans, setArchivedLoans, showToast]);

    const handleDeletePayment = useCallback(async (loanId: string, paymentId: string) => {
        const loan = allLoans.find(l => l.id === loanId) || loans.find(l => l.id === loanId) || archivedLoans.find(l => l.id === loanId);
        if (!loan) return;

        const paymentToDelete = (loan.paymentHistory || []).find(p => p.id === paymentId);
        if (!paymentToDelete) return;

        const updatedHistory = (loan.paymentHistory || []).filter(p => p.id !== paymentId);

        const totalCapitalPaid = updatedHistory.reduce((acc, p) => acc + p.capitalPaid, 0);
        const totalInterestPaid = updatedHistory.reduce((acc, p) => acc + p.interestPaid, 0);
        const initialCap = loan.initialCapital || loan.amount;
        const remainingCapital = Math.max(0, initialCap - totalCapitalPaid);

        let newStatus = loan.status;
        if (remainingCapital <= 0) newStatus = LoanStatus.PAID;
        else if (newStatus === LoanStatus.PAID) newStatus = LoanStatus.PENDING;

        const updatedDoc = {
            paymentHistory: updatedHistory,
            totalCapitalPaid,
            totalInterestPaid,
            remainingCapital,
            status: newStatus,
            paymentsMade: updatedHistory.length
        };

        setLoans(prev => prev.map(l => l.id === loanId ? { ...l, ...updatedDoc } : l));
        setArchivedLoans(prev => prev.map(l => l.id === loanId ? { ...l, ...updatedDoc } : l));

        await updateDocument(TABLE_NAMES.LOANS, loanId, updatedDoc);

        // Revert the treasury balance
        let treasuryOutflow = paymentToDelete.amount;
        const fundingSrc = loan.fundingSource || loan.source;
        if (fundingSrc === 'Fondo Personal') {
            treasuryOutflow = paymentToDelete.payOffRegular || 0;
        }

        if (treasuryOutflow > 0) {
            await _updateTreasuryBalance(treasuryOutflow, 'outflow', paymentToDelete.paymentMethod || 'Efectivo');
        }

        showToast('Pago eliminado y saldo actualizado al momento.', 'success');
    }, [loans, allLoans, archivedLoans, setLoans, setArchivedLoans, showToast, _updateTreasuryBalance]);

    const handleBalanceCorrection = useCallback(async (loanId: string, newBalance: number, notes: string) => {
        const loan = allLoans.find(l => l.id === loanId) || loans.find(l => l.id === loanId) || archivedLoans.find(l => l.id === loanId);
        if (!loan) return;

        const diff = loan.remainingCapital - newBalance;
        
        const correctionRecord: PaymentRecord = {
            id: `CORR-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            amount: 0,
            interestPaid: 0,
            capitalPaid: diff,
            remainingCapitalAfter: newBalance,
            notes: `CORRECCIÓN SALDO: ${notes}`,
            paymentMethod: 'Efectivo'
        };

        const updatedHistory = [...(loan.paymentHistory || []), correctionRecord];
        const totalCapitalPaid = updatedHistory.reduce((acc, p) => acc + p.capitalPaid, 0);
        
        const updatedDoc = {
            remainingCapital: newBalance,
            paymentHistory: updatedHistory,
            totalCapitalPaid,
            status: newBalance <= 0 ? LoanStatus.PAID : LoanStatus.PENDING
        };

        setLoans(prev => prev.map(l => l.id === loanId ? { ...l, ...updatedDoc } : l));
        setArchivedLoans(prev => prev.map(l => l.id === loanId ? { ...l, ...updatedDoc } : l));

        await updateDocument(TABLE_NAMES.LOANS, loanId, updatedDoc);
        showToast('Saldo corregido exitosamente.', 'success');
    }, [loans, allLoans, archivedLoans, setLoans, setArchivedLoans, showToast]);

    const handleAddClientAndLoan = useCallback(async (clientData: NewClientData, loanData: NewLoanData & { source?: 'Banco' | 'Efectivo' | 'Fondo Personal' }) => {
        // 1. Client
        const newClient = await addDocument(TABLE_NAMES.CLIENTS, {
            ...clientData,
            joinDate: new Date().toISOString()
        });

        // 2. Loan
        const annualRate = loanData.interestRate ?? DEFAULT_ANNUAL_INTEREST_RATE;
        const { monthlyPayment, totalRepayment } = calculateLoanParameters(loanData.amount, loanData.term, annualRate);
        const source = loanData.source || 'Efectivo';

        await addDocument(TABLE_NAMES.LOANS, {
            clientId: newClient.id,
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
            fundingSource: source
        });

        // 3. Treasury Deduction (Only if not Fondo Personal)
        if (source !== 'Fondo Personal') {
            await _updateTreasuryBalance(loanData.amount, 'outflow', source);
        }

        showToast('Cliente y préstamo registrados.', 'success');
    }, [showToast, _updateTreasuryBalance]);

    const handleAddLoan = useCallback(async (clientId: string, clientName: string, loanData: { amount: number; term: number; interestRate: number; startDate: string; notes: string; source?: 'Banco' | 'Efectivo' | 'Fondo Personal' }) => {
        const { amount, term, interestRate, startDate, notes, source = 'Efectivo' } = loanData;
        const { monthlyPayment, totalRepayment } = calculateLoanParameters(amount, term, interestRate);

        await addDocument(TABLE_NAMES.LOANS, {
            clientId,
            clientName,
            amount,
            initialCapital: amount,
            remainingCapital: amount,
            interestRate,
            term,
            startDate,
            notes,
            status: LoanStatus.PENDING,
            monthlyPayment,
            totalRepayment,
            paymentsMade: 0,
            totalInterestPaid: 0,
            totalCapitalPaid: 0,
            paymentHistory: [],
            fundingSource: source
        });

        // Treasury Deduction (Only if not Fondo Personal)
        if (source !== 'Fondo Personal') {
            await _updateTreasuryBalance(amount, 'outflow', source as 'Banco' | 'Efectivo');
        }

        showToast('Nuevo préstamo añadido.', 'success');
    }, [showToast, _updateTreasuryBalance]);

    // Automatic restoration migration for reunified loans & payment histories (runs only once per session)
    const restorationDoneRef = useRef(false);
    useEffect(() => {
        if (!user || isLoading || restorationDoneRef.current) return;
        if (loans.length === 0 && archivedLoans.length === 0) return;
        restorationDoneRef.current = true;

        const restoreReunifiedHistories = async () => {
            const all = [...loans, ...archivedLoans];
            
            // 1. Ensure reunified source loans are not archived (so they show in history)
            for (const l of all) {
                if (l.notes && l.notes.includes('[DEUDA REUNIFICADA') && l.archived) {
                    try {
                        await updateDocument(TABLE_NAMES.LOANS, l.id, { archived: false });
                    } catch (e) {
                        console.error("Error restoring archived state for reunified loan", l.id, e);
                    }
                }
            }

            // 2. Consolidate missing payment histories into target reunified loans
            const targetReunifiedLoans = all.filter(l => l.notes && (l.notes.includes('Reunificación de deudas') || l.notes.includes('unificados')));
            for (const targetLoan of targetReunifiedLoans) {
                const sourceLoans = all.filter(s => 
                    s.id !== targetLoan.id && 
                    ((s.notes && s.notes.includes(`unificación en préstamo #${targetLoan.id}`)) ||
                     (targetLoan.notes && targetLoan.notes.includes(s.id)))
                );

                if (sourceLoans.length > 0) {
                    const existingHistoryIds = new Set((targetLoan.paymentHistory || []).map(p => p.id));
                    const missingPayments: PaymentRecord[] = [];

                    for (const sLoan of sourceLoans) {
                        if (sLoan.paymentHistory && sLoan.paymentHistory.length > 0) {
                            for (const p of sLoan.paymentHistory) {
                                if (!existingHistoryIds.has(p.id)) {
                                    missingPayments.push({
                                        ...p,
                                        notes: `[Historial Reunificado de ${sLoan.clientName}] ${p.notes || ''}`.trim()
                                    });
                                    existingHistoryIds.add(p.id);
                                }
                            }
                        }
                    }

                    if (missingPayments.length > 0) {
                        const mergedHistory = [...(targetLoan.paymentHistory || []), ...missingPayments].sort(
                            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
                        );
                        try {
                            await updateDocument(TABLE_NAMES.LOANS, targetLoan.id, {
                                paymentHistory: mergedHistory,
                                paymentsMade: mergedHistory.length,
                                totalInterestPaid: mergedHistory.reduce((sum, p) => sum + (p.interestPaid || 0), 0),
                                totalCapitalPaid: mergedHistory.reduce((sum, p) => sum + (p.capitalPaid || 0), 0)
                            });
                        } catch (e) {
                            console.error("Error restoring merged payment history into target loan", targetLoan.id, e);
                        }
                    }
                }
            }

            // 3. Ensure any completed loan without payment history has its history synthesized and preserved
            for (const l of all) {
                if (l.status === LoanStatus.PAID && (!l.paymentHistory || l.paymentHistory.length === 0)) {
                    const syntheticPayment: PaymentRecord = {
                        id: `LIQ-RESTORED-${l.id}`,
                        date: l.lastPaymentDate || l.startDate || new Date().toISOString().split('T')[0],
                        amount: (l.initialCapital || l.amount) + (l.totalInterestPaid || 0),
                        interestPaid: l.totalInterestPaid || 0,
                        capitalPaid: l.initialCapital || l.amount,
                        remainingCapitalAfter: 0,
                        notes: 'Liquidación total de deuda registrada',
                        paymentMethod: 'Efectivo'
                    };
                    try {
                        await updateDocument(TABLE_NAMES.LOANS, l.id, {
                            paymentHistory: [syntheticPayment],
                            paymentsMade: 1,
                            totalCapitalPaid: l.initialCapital || l.amount,
                            archived: false
                        });
                    } catch (e) {
                        console.error("Error restoring payment record for loan", l.id, e);
                    }
                }
            }
        };

        restoreReunifiedHistories();
    }, [user, isLoading, loans, archivedLoans]);

    const handleReunifyLoans = useCallback(async (
        sourceLoanIds: string[],
        targetClientId: string,
        targetClientName: string,
        unifiedAmount: number,
        monthlyInterestRate: number,
        term: number,
        notes: string,
        startDate: string = new Date().toISOString().split('T')[0]
    ) => {
        try {
            const annualRate = monthlyInterestRate * 12;
            const { monthlyPayment, totalRepayment } = calculateLoanParameters(unifiedAmount, term, annualRate);

            const allCurrentLoans = [...loans, ...archivedLoans];

            // 1. Gather payment histories from source loans
            const consolidatedPaymentHistory: PaymentRecord[] = [];
            for (const loanId of sourceLoanIds) {
                const sourceLoan = allCurrentLoans.find(l => l.id === loanId);
                if (sourceLoan && sourceLoan.paymentHistory && sourceLoan.paymentHistory.length > 0) {
                    sourceLoan.paymentHistory.forEach(ph => {
                        consolidatedPaymentHistory.push({
                            ...ph,
                            notes: `[Reunificado de ${sourceLoan.clientName}] ${ph.notes || ''}`.trim()
                        });
                    });
                }
            }

            // 2. Create unified loan with consolidated payment history
            const newLoan = await addDocument(TABLE_NAMES.LOANS, {
                clientId: targetClientId,
                clientName: targetClientName,
                amount: unifiedAmount,
                initialCapital: unifiedAmount,
                remainingCapital: unifiedAmount,
                interestRate: annualRate,
                term,
                startDate,
                notes: notes || `Reunificación de deudas. (${sourceLoanIds.length} préstamos unificados)`,
                status: LoanStatus.PENDING,
                monthlyPayment,
                totalRepayment,
                paymentsMade: consolidatedPaymentHistory.length,
                totalInterestPaid: consolidatedPaymentHistory.reduce((sum, p) => sum + (p.interestPaid || 0), 0),
                totalCapitalPaid: consolidatedPaymentHistory.reduce((sum, p) => sum + (p.capitalPaid || 0), 0),
                paymentHistory: consolidatedPaymentHistory,
                fundingSource: 'Efectivo'
            });

            // 3. Mark source loans as paid / reunified WITHOUT archiving them completely
            for (const loanId of sourceLoanIds) {
                const sourceLoan = allCurrentLoans.find(l => l.id === loanId);
                const prevNotes = sourceLoan?.notes || '';
                await updateDocument(TABLE_NAMES.LOANS, loanId, {
                    remainingCapital: 0,
                    status: LoanStatus.PAID,
                    archived: false,
                    notes: `${prevNotes} [DEUDA REUNIFICADA: Saldado por unificación en préstamo #${newLoan.id}]`.trim()
                });
            }

            showToast(`Deuda reunificada exitosamente (${formatCurrency(unifiedAmount)}).`, 'success');
        } catch (err: any) {
            console.error("Error reunifying loans:", err);
            showToast('Error al reunificar deudas.', 'error');
            throw err;
        }
    }, [loans, archivedLoans, showToast]);

    const handleCleanDeleteClient = useCallback(async (clientId: string) => {
        try {
            // 1. Get all loans for this client
            const clientLoans = loans.filter(l => l.clientId === clientId);

            for (const loan of clientLoans) {
                // 2. Revert Initial Capital Outflow
                // If we lent 1000, we must put it back into the treasury
                const fundingSource = (loan as any).fundingSource || loan.source || 'Efectivo';
                if (fundingSource !== 'Fondo Personal') {
                    await _updateTreasuryBalance(loan.initialCapital || loan.amount, 'inflow', fundingSource);
                }

                // 3. Revert all payments (Inflow Reversal)
                // If the client paid us money, we must take it out of the treasury to leave it as it was
                if (loan.paymentHistory && loan.paymentHistory.length > 0) {
                    for (const payment of loan.paymentHistory) {
                        const method = payment.paymentMethod || 'Efectivo';
                        let treasuryOutflow = payment.amount;
                        if (fundingSource === 'Fondo Personal') {
                             treasuryOutflow = payment.payOffRegular || 0;
                        }
                        if (treasuryOutflow > 0) {
                            await _updateTreasuryBalance(treasuryOutflow, 'outflow', method);
                        }
                    }
                }

                // 4. Delete individual loan
                await deleteDocument(TABLE_NAMES.LOANS, loan.id);
            }

            // 5. Delete Client
            await deleteDocument(TABLE_NAMES.CLIENTS, clientId);

            showToast('Eliminación "Clean" completada. Fondos restaurados.', 'success');
        } catch (err: any) {
            console.error("Clean delete error:", err);
            showToast('Error al realizar el borrado clean.', 'error');
        }
    }, [loans, _updateTreasuryBalance, showToast]);

    const handleToggleOverdueStatus = useCallback(async (loanId: string, overdueId: string, newStatus: 'pendiente' | 'reclamado' | 'anulado') => {
        const loan = loans.find(l => l.id === loanId);
        if (!loan || !loan.overdueHistory) return;

        const updatedHistory = loan.overdueHistory.map(m => 
            m.id === overdueId ? { ...m, status: newStatus } : m
        );

        // Update pendingInterest based on remaining 'pendiente' items
        const newTotalPending = updatedHistory
            .filter(m => m.status === 'pendiente')
            .reduce((acc, m) => acc + m.amount, 0);

        const updatedLoanStatus = loan.remainingCapital > 0 
            ? (newTotalPending > 0 ? LoanStatus.OVERDUE : LoanStatus.PENDING) 
            : LoanStatus.PAID;

        await updateDocument(TABLE_NAMES.LOANS, loanId, {
            overdueHistory: updatedHistory,
            pendingInterest: newTotalPending,
            status: updatedLoanStatus
        });
        
        showToast(`Estado de interés actualizado (${newStatus})`, 'success');
    }, [loans, showToast]);

    const handleUpdateLoan = useCallback(async (loanId: string, updatedData: Partial<Loan>) => {
        setLoans(prev => prev.map(l => l.id === loanId ? { ...l, ...updatedData } : l));
        setArchivedLoans(prev => prev.map(l => l.id === loanId ? { ...l, ...updatedData } : l));
        await updateDocument(TABLE_NAMES.LOANS, loanId, updatedData);
    }, [setLoans, setArchivedLoans]);

    const handleUpdateClient = useCallback(async (clientId: string, updatedData: Partial<Client>) => {
        await updateDocument(TABLE_NAMES.CLIENTS, clientId, updatedData);
    }, []);

    const handleDeleteLoan = useCallback(async (loanId: string, clientName: string) => {
        setLoans(prev => prev.filter(l => l.id !== loanId));
        setArchivedLoans(prev => prev.filter(l => l.id !== loanId));
        await deleteDocument(TABLE_NAMES.LOANS, loanId);
        showToast(`Préstamo de ${clientName} eliminado.`, 'info');
    }, [showToast, setLoans, setArchivedLoans]);

    const handleArchivePaidLoans = useCallback(async () => {
        // In this implementation with `archived` flag, we just set `archived: true` on PAID loans.
        const paidLoans = loans.filter(l => l.status === LoanStatus.PAID);
        let count = 0;
        const archived: Loan[] = [];

        for (const loan of paidLoans) {
            await updateDocument(TABLE_NAMES.LOANS, loan.id, { archived: true });
            archived.push({ ...loan, archived: true });
            count++;
        }
        
        // Add to archived loans state
        setArchivedLoans(prev => [...archived, ...prev]);
        
        showToast(`${count} préstamos archivados.`, 'success');
        return count;
    }, [loans, showToast, setArchivedLoans]);

    const handleArchiveClient = useCallback(async (clientId: string) => {
        await updateDocument(TABLE_NAMES.CLIENTS, clientId, { archived: true });
        showToast('Cliente archivado.', 'info');
    }, [showToast]);

    const handleRestoreClient = useCallback(async (clientId: string) => {
        await updateDocument(TABLE_NAMES.CLIENTS, clientId, { archived: false });
        showToast('Cliente restaurado.', 'success');
    }, [showToast]);

    const handleBatchDeleteClients = useCallback(async (clientIds: string[]) => {
        for (const id of clientIds) {
            await deleteDocument(TABLE_NAMES.CLIENTS, id);
        }
        showToast(`${clientIds.length} clientes eliminados.`, 'success');
    }, [showToast]);

    const handleRegisterReinvestment = useCallback(async (amount: number, source: 'Banco' | 'Efectivo', notes: string, date: string, deductFromTreasury: boolean) => {
        try {
            await addDocument(TABLE_NAMES.REINVESTMENTS, {
                amount,
                source,
                notes,
                date,
                createdAt: new Date().toISOString(),
                deducted: deductFromTreasury
            });

            if (deductFromTreasury) {
                await _updateTreasuryBalance(amount, 'outflow', source);
            }

            showToast(`Reinversión registrada.${deductFromTreasury ? ' Saldo actualizado.' : ''}`, 'success');
        } catch (err: any) {
            console.error(err);
            showToast('Error registrando reinversión.', 'error');
        }
    }, [showToast, _updateTreasuryBalance]);

    const handleDeleteReinvestment = useCallback(async (id: string) => {
        try {
            await deleteDocument(TABLE_NAMES.REINVESTMENTS, id);
            showToast('Registro de reinversión eliminado.', 'success');
        } catch(err: any) {
            console.error(err);
            showToast('Error eliminando registro.', 'error');
        }
    }, [showToast]);

    const handleSaveFund = useCallback(async (fundData: PersonalFund) => {
        try {
            const { id, ...dataToSave } = fundData;
            if (id) {
                await updateDocument(TABLE_NAMES.PERSONAL_FUNDS, id, { 
                    ...dataToSave,
                    lastUpdated: new Date().toISOString()
                });
                showToast('Apartado actualizado.', 'success');
            } else {
                await addDocument(TABLE_NAMES.PERSONAL_FUNDS, {
                    ...dataToSave,
                    lastUpdated: new Date().toISOString()
                });
                showToast('Nuevo apartado creado.', 'success');
            }
        } catch (e: any) {
            showToast('Error al guardar fondo: ' + e.message, 'error');
        }
    }, [showToast]);

    const handleDeleteFund = useCallback(async (id: string) => {
        try {
            await deleteDocument(TABLE_NAMES.PERSONAL_FUNDS, id);
            showToast('Apartado eliminado.', 'info');
        } catch (e: any) {
            showToast('Error al eliminar fondo: ' + e.message, 'error');
        }
    }, [showToast]);

    const handleRegisterWithdrawal = useCallback(async (amount: number, source: 'Banco' | 'Efectivo', notes: string, date: string, peñaPercentage: number) => {
        try {
            const peñaAmount = amount * (peñaPercentage / 100);
            
            // 1. Add Withdrawal Record
            await addDocument(TABLE_NAMES.WITHDRAWALS, {
                amount,
                source,
                notes,
                date,
                peñaPercentage,
                peñaAmount,
                createdAt: new Date().toISOString()
            });

            // 2. Update Treasury (Deduct total amount)
            await _updateTreasuryBalance(amount, 'outflow', source);

            // 3. Update Peña Fund (if percentage > 0)
            if (peñaAmount > 0) {
                // Find "Peña" fund
                // We need to access `funds` state here, but `useCallback` captures it.
                // However, `funds` might be stale if not in dependency array.
                // Better to query Firestore to be safe or rely on `funds` state if updated correctly.
                // Since we are inside `useAppData`, we can use `funds` state but need to add it to deps.
                // Alternatively, we can query for a fund with name "Peña" or similar.
                
                // Let's try to find it in the current `funds` state (we'll add `funds` to deps).
                // Or better, query it to avoid stale state issues if possible, but `funds` state is synced.
                
                // We'll use a specific ID or Name convention? Let's search by name "Peña" or create it.
                // Actually, since `funds` is in scope, let's use it.
                // Wait, `funds` is not in the dependency array of this `useCallback` yet.
                // I will add `funds` to dependency array.
                
                // But wait, if I add `funds` to dependency array, `handleRegisterWithdrawal` changes on every fund update.
                // That's fine.
                
                // Let's implement the logic to find/create "Peña" fund.
                // We need to fetch the collection to be sure, or use the state.
                // Using state is faster but requires correct deps.
                
                // Let's use `getCollection` to find the fund to be safe and avoid re-creating the function too often.
                const fundsSnapshot = await getCollection(TABLE_NAMES.PERSONAL_FUNDS, [where('name', '==', 'Peña')]);
                let peñaFund = (fundsSnapshot as PersonalFund[])[0];

                if (peñaFund) {
                    await updateDocument(TABLE_NAMES.PERSONAL_FUNDS, peñaFund.id, {
                        currentAmount: peñaFund.currentAmount + peñaAmount,
                        lastUpdated: new Date().toISOString()
                    });
                } else {
                    await addDocument(TABLE_NAMES.PERSONAL_FUNDS, {
                        name: 'Peña',
                        icon: 'wallet',
                        color: 'purple',
                        currentAmount: peñaAmount,
                        goal: 10000, // Default goal
                        bankName: 'Ahorro Personal',
                        monthlyContribution: 0,
                        lastUpdated: new Date().toISOString()
                    });
                }
            }

            showToast(`Retiro registrado. ${peñaAmount > 0 ? `Se destinaron ${peñaAmount} a la Peña.` : ''}`, 'success');
        } catch (err: any) {
            console.error(err);
            showToast('Error registrando retiro.', 'error');
        }
    }, [showToast, _updateTreasuryBalance]);

    const handleDeleteWithdrawal = useCallback(async (id: string) => {
        try {
            const withdrawalDoc = await getDocument(TABLE_NAMES.WITHDRAWALS, id);
            if (!withdrawalDoc) throw new Error('Retiro no encontrado');
            
            const withdrawal = withdrawalDoc as WithdrawalRecord;
            const { amount, source, peñaAmount } = withdrawal;

            // 1. Delete Withdrawal Record
            await deleteDocument(TABLE_NAMES.WITHDRAWALS, id);

            // 2. Update Treasury (Refund amount)
            const treasuryDoc = await getDocument(TABLE_NAMES.TREASURY, 'main');
            let currentBank = 0;
            let currentCash = 0;
            
            if (treasuryDoc) {
                const data = treasuryDoc as any;
                currentBank = Number(data.bankBalance) || 0;
                currentCash = Number(data.cashBalance) || 0;
            }

            if (source === 'Banco') {
                currentBank += amount;
            } else {
                currentCash += amount;
            }

            await setDocument(TABLE_NAMES.TREASURY, 'main', { 
                bankBalance: Number(currentBank), 
                cashBalance: Number(currentCash) 
            });

            // 3. Update Peña Fund (Refund peñaAmount)
            if (peñaAmount && peñaAmount > 0) {
                const fundsSnapshot = await getCollection(TABLE_NAMES.PERSONAL_FUNDS, [where('name', '==', 'Peña')]);
                const peñaFund = (fundsSnapshot as PersonalFund[])[0];
                
                if (peñaFund) {
                    const currentAmount = Number(peñaFund.currentAmount) || 0;
                    await updateDocument(TABLE_NAMES.PERSONAL_FUNDS, peñaFund.id, {
                        currentAmount: Math.max(0, currentAmount - peñaAmount),
                        lastUpdated: new Date().toISOString()
                    });
                }
            }

            showToast('Retiro eliminado y saldos restaurados.', 'success');
        } catch (e: any) {
            console.error(e);
            showToast('Error al eliminar retiro: ' + e.message, 'error');
        }
    }, [showToast]);

    const handleUpdateWithdrawal = useCallback(async (id: string, updatedData: Partial<WithdrawalRecord>) => {
        try {
            await updateDocument(TABLE_NAMES.WITHDRAWALS, id, {
                ...updatedData,
            });
            showToast('Retiro actualizado.', 'success');
        } catch (e: any) {
            showToast('Error al actualizar retiro: ' + e.message, 'error');
        }
    }, [showToast]);

    const handleRegisterFundTransaction = useCallback(async (fundId: string, amount: number, type: 'deposito' | 'gasto', notes: string, date: string) => {
        try {
            const fund = funds.find(f => f.id === fundId);
            if (!fund) throw new Error('Apartado no encontrado');

            const newTransaction = {
                id: Date.now().toString(),
                amount,
                type,
                notes,
                date
            };

            const updatedTransactions = [newTransaction, ...(fund.transactions || [])].slice(0, 50); // Keep last 50
            const newAmount = type === 'deposito' ? fund.currentAmount + amount : fund.currentAmount - amount;

            await updateDocument(TABLE_NAMES.PERSONAL_FUNDS, fundId, {
                currentAmount: newAmount,
                transactions: updatedTransactions,
                lastUpdated: new Date().toISOString()
            });

            showToast(`${type === 'deposito' ? 'Depósito' : 'Gasto'} registrado en ${fund.name}`, 'success');
        } catch (e: any) {
            console.error(e);
            showToast('Error al registrar transacción: ' + e.message, 'error');
        }
    }, [funds, showToast]);

    const handleQuickAdd = useCallback(async (fundId: string) => {
        const fund = funds.find(f => f.id === fundId);
        if (!fund) return;

        try {
            await handleRegisterFundTransaction(
                fundId, 
                fund.monthlyContribution, 
                'deposito', 
                'Aporte mensual rápido', 
                new Date().toISOString().split('T')[0]
            );
        } catch (e: any) {
            showToast('Error de conexión: ' + e.message, 'error');
        }
    }, [funds, handleRegisterFundTransaction, showToast]);

    const reloadRequests = useCallback(async () => {}, []);
    const refreshAllData = useCallback(async () => {}, []);
    const recalculateTreasury = useCallback(async () => {
        // Simple recalc: Sum all initial capitals (outflow) vs all payments (inflow) 
        // This is complex because we don't track expenses or other inflows in detail.
        // Just a placeholder or simple logic.
        showToast('Recálculo no implementado en esta versión.', 'info');
    }, [showToast]);

    const triggerMasterBackup = useCallback((mode: 'download' | 'share' = 'download') => {
        // Collect all payments from all active and archived loans
        const allPayments: PaymentRecord[] = [
            ...loans.flatMap(l => l.paymentHistory || []),
            ...archivedLoans.flatMap(l => l.paymentHistory || [])
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        generateMasterBackupPDF(clients, loans, allPayments, reinvestments, funds, requests, mode);
        localStorage.setItem(LOCAL_STORAGE_KEYS.LAST_BACKUP_DATE, new Date().toISOString());
    }, [clients, loans, archivedLoans, reinvestments, funds, requests]);

    // Automatic backup check effect (every 15 days)
    useEffect(() => {
        if (isLoading || clients.length === 0 || !user) return;
        
        const lastBackupStr = localStorage.getItem(LOCAL_STORAGE_KEYS.LAST_BACKUP_DATE);
        const now = new Date();
        
        if (!lastBackupStr) {
            // First time - set initial date but don't force immediate download 
            // unless we want to. Let's do it to be safe.
            triggerMasterBackup();
            return;
        }

        const lastBackup = new Date(lastBackupStr);
        const diffInDays = Math.floor((now.getTime() - lastBackup.getTime()) / (1000 * 3600 * 24));
        
        if (diffInDays >= 15) {
            showToast('Generando copia de seguridad automática quincenal...', 'info');
            triggerMasterBackup();
        }
    }, [isLoading, clients.length, triggerMasterBackup, showToast, user]);

    // Computed clientLoanData including all active and historical loans for each client
    const clientLoanData = useMemo(() => {
        return clients.map(c => ({
            ...c,
            loans: allLoans.filter(l => l.clientId === c.id)
        }));
    }, [clients, allLoans]);

    return {
        clients,
        archivedClients,
        loans,
        archivedLoans,
        allLoans,
        requests,
        reinvestments,
        funds,
        withdrawals,
        isLoading,
        error,
        clientLoanData,
        hasMoreArchivedLoans,
        allHistoryLoaded,
        loadMoreRequests: reloadRequests,
        loadMoreArchivedLoans,
        loadAllHistory,
        handleLoanRequestSubmit,
        handleApproveRequest,
        handleRejectRequest,
        handleUpdateRequestStatus,
        handleRegisterPayment,
        handleUpdatePayment,
        handleDeletePayment,
        handleBalanceCorrection,
        handleAddClientAndLoan,
        handleAddLoan,
        handleReunifyLoans,
        handleCleanDeleteClient,
        handleToggleOverdueStatus,
        handleConfirmOverdue,
        handleManualAddOverdue,
        handleDeleteOverdueMonth,
        handleClearOverdueHistory,
        suggestedOverdues,
        handleUpdateLoan,
        handleUpdateClient,
        handleDeleteLoan,
        handleArchivePaidLoans,
        handleArchiveClient,
        handleRestoreClient,
        handleBatchDeleteClients,
        handleRegisterReinvestment,
        handleDeleteReinvestment,
        handleSaveFund,
        handleDeleteFund,
        handleRegisterWithdrawal,
        handleDeleteWithdrawal,
        handleUpdateWithdrawal,
        handleRegisterFundTransaction,
        handleQuickAdd,
        reloadRequests,
        refreshAllData,
        recalculateTreasury,
        triggerMasterBackup,
    };
};
