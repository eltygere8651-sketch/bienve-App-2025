
import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { calculateMonthlyInterest, calculateLoanParameters } from '../config';

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
        setArchivedLoans
    } = useDataSubscriptions(user, isConfigReady, showToast);
    
    // Pagination state for archived loans
    const [lastArchivedLoanDoc, setLastArchivedLoanDoc] = useState<any>(null);
    const [hasMoreArchivedLoans, setHasMoreArchivedLoans] = useState(true);
    const [allHistoryLoaded, setAllHistoryLoaded] = useState(false);

    // Initial fetch for archived loans
    useEffect(() => {
        if (user && isConfigReady) {
            loadMoreArchivedLoans(true);
        }
    }, [user, isConfigReady]);

    const loadMoreArchivedLoans = useCallback(async (reset = false) => {
        if (!user) return;
        try {
            const currentLastDoc = reset ? null : lastArchivedLoanDoc;
            const pageSize = 20;
            
            // NOTE: Removed orderBy('startDate', 'desc') to avoid "Requires Index" error.
            // We only filter by 'archived' status. Pagination will follow default document order.
            const result = await getPaginatedCollection(
                TABLE_NAMES.LOANS,
                [where('archived', '==', true)],
                currentLastDoc,
                pageSize
            );

            if (reset) {
                setArchivedLoans(result.data as Loan[]);
            } else {
                setArchivedLoans(prev => [...prev, ...result.data as Loan[]]);
            }
            
            setLastArchivedLoanDoc(result.lastVisible);
            setHasMoreArchivedLoans(result.hasMore);
        } catch (err) {
            console.error("Error loading archived loans:", err);
        }
    }, [user, lastArchivedLoanDoc]);

    const loadAllHistory = useCallback(async () => {
        if (!user) return;
        try {
            // Removed orderBy to avoid index error. Sorting client-side.
            const allArchivedRaw = await getCollection(TABLE_NAMES.LOANS, [where('archived', '==', true)]);
            const allArchived = (allArchivedRaw as Loan[]).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
            
            setArchivedLoans(allArchived);
            setAllHistoryLoaded(true);
            setHasMoreArchivedLoans(false);
            showToast(`Historial completo cargado (${allArchived.length} registros).`, 'success');
        } catch (err: any) {
            console.error(err);
            showToast('Error cargando historial completo: ' + err.message, 'error');
        }
    }, [user, showToast]);

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

    const handleApproveRequest = useCallback(async (request: LoanRequest, loanAmount: number, loanTerm: number) => {
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
                signature: request.signature
            });

            // 3. Update Request Status (or delete?)
            await updateDocument(TABLE_NAMES.REQUESTS, request.id, { status: RequestStatus.APPROVED });
            
            // 4. Update Treasury (Deduct loan amount)
            await _updateTreasuryBalance(loanAmount, 'outflow', 'Banco');

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

    const handleRegisterPayment = useCallback(async (loanId: string, amount: number, date: string, notes: string, paymentMethod: 'Efectivo' | 'Banco' = 'Efectivo') => {
        const loan = loans.find(l => l.id === loanId);
        if (!loan) throw new Error("Loan not found");

        const monthlyInterest = calculateMonthlyInterest(loan.remainingCapital, loan.interestRate).interest;
        const pendingInt = loan.pendingInterest || 0;
        
        // Priority 1: Pay off PENDING (accumulated) interest from previous missed months
        const payOffPending = Math.min(amount, pendingInt);
        const amountAfterPending = amount - payOffPending;
        const newPendingInterest = pendingInt - payOffPending;

        // Priority 2: Pay current month's regular interest
        const payOffRegular = Math.min(amountAfterPending, monthlyInterest);
        const amountAfterRegular = amountAfterPending - payOffRegular;
        
        const totalInterestPaid = payOffPending + payOffRegular;

        let newPendingInterestDetails = loan.pendingInterestDetails || '';
        if (newPendingInterest <= 0) {
            newPendingInterestDetails = '';
        } else if (payOffPending > 0) {
            // If they paid exactly one or more months, try to remove them from details
            const monthsCovered = Math.floor(payOffPending / monthlyInterest);
            if (monthsCovered > 0) {
                const detailsArray = newPendingInterestDetails.split(', ');
                newPendingInterestDetails = detailsArray.slice(monthsCovered).join(', ');
            }
        }

        // Priority 3: The rest goes to Capital
        const capitalPart = Math.max(0, amountAfterRegular);
        const remainingCapitalAfter = Math.max(0, loan.remainingCapital - capitalPart);

        let notesPrefix = '';
        if (payOffPending > 0) {
            notesPrefix += `(Saldó ${payOffPending.toFixed(2)} vencido) `;
        }
        if (payOffRegular > 0) {
            notesPrefix += `(Mes actual: ${payOffRegular.toFixed(2)}) `;
        }

        const newPayment: PaymentRecord = {
            id: Date.now().toString(),
            date,
            amount,
            interestPaid: totalInterestPaid,
            capitalPaid: capitalPart,
            remainingCapitalAfter,
            notes: (notesPrefix + notes).trim(),
            paymentMethod
        };

        const updatedHistory = [...(loan.paymentHistory || []), newPayment];
        const totalCapitalPaid = updatedHistory.reduce((acc, p) => acc + p.capitalPaid, 0);
        const totalInterestPaidForLoan = updatedHistory.reduce((acc, p) => acc + p.interestPaid, 0);
        
        let newStatus = loan.status;
        if (remainingCapitalAfter <= 0) newStatus = LoanStatus.PAID;
        // Logic for OVERDUE -> PENDING if they pay something and are caught up? 
        // For now, if they pay anything and remaining debt exists, we go to PENDING
        if (remainingCapitalAfter > 0) {
            newStatus = LoanStatus.PENDING;
        }

        await updateDocument(TABLE_NAMES.LOANS, loanId, {
            remainingCapital: remainingCapitalAfter,
            pendingInterest: newPendingInterest,
            pendingInterestDetails: newPendingInterestDetails,
            paymentHistory: updatedHistory,
            totalCapitalPaid,
            totalInterestPaid: totalInterestPaidForLoan,
            status: newStatus,
            paymentsMade: updatedHistory.length,
            lastPaymentDate: date
        });

        // Update Treasury
        await _updateTreasuryBalance(amount, 'inflow', paymentMethod);
    }, [loans, _updateTreasuryBalance]);

    // NEW: Background check for overdue loans (Runs when app loads or loans update)
    useEffect(() => {
        const detectOverdue = async () => {
            if (!loans.length || isLoading) return;
            
            const today = new Date();
            const loansToUpdate: {id: string, data: any}[] = [];

            loans.forEach(loan => {
                if (loan.status === LoanStatus.PAID || loan.archived) return;

                const baseDate = loan.lastPaymentDate ? new Date(loan.lastPaymentDate) : new Date(loan.startDate);
                const diffTime = Math.abs(today.getTime() - baseDate.getTime());
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                // Rule: For every full 30-day block without payment, accrue interest
                const monthsMissed = Math.floor(diffDays / 30);
                
                // If it's been more than 30 days since last payment/accrual
                if (monthsMissed >= 1) {
                    const accrualDate = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);
                    const monthName = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(accrualDate);
                    
                    const { interest } = calculateMonthlyInterest(loan.remainingCapital, loan.interestRate);
                    
                    const currentDetails = loan.pendingInterestDetails ? loan.pendingInterestDetails.split(', ') : [];
                    if (!currentDetails.includes(monthName)) {
                        currentDetails.push(monthName);
                    }

                    // We accrue for ONE month at a time to keep it incremental and safe with the baseDate update
                    loansToUpdate.push({
                        id: loan.id,
                        data: {
                            status: LoanStatus.OVERDUE,
                            pendingInterest: (loan.pendingInterest || 0) + interest,
                            pendingInterestDetails: currentDetails.join(', '),
                            // Moving the baseDate forward by 30 days to mark THIS month as "accrued"
                            // This ensures next time the effect runs, it won't accrue again until ANOTHER 30 days pass
                            lastPaymentDate: accrualDate.toISOString()
                        }
                    });
                }
            });

            for (const batch of loansToUpdate) {
                await updateDocument(TABLE_NAMES.LOANS, batch.id, batch.data);
            }
        };

        detectOverdue();
    }, [loans.length, isLoading]);

    const handleUpdatePayment = useCallback(async (loanId: string, paymentId: string, newInterest: number, newAmount: number, newDate: string, newNotes: string) => {
        const loan = loans.find(l => l.id === loanId);
        if (!loan) return;

        // Find and update the specific payment
        const updatedHistory = loan.paymentHistory.map(p => {
            if (p.id === paymentId) {
                // Recalculate capital part based on manual input of interest and total amount
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

        // Re-calculate the running balance for all payments subsequent to the edited one
        // This is complex because each payment depends on the previous remaining capital.
        // For simplicity, we will re-aggregate totals.
        // A full replay of history to correct `remainingCapitalAfter` for each record would be ideal but complex.
        // We will just update totals and the final remaining capital.
        
        const totalCapitalPaid = updatedHistory.reduce((acc, p) => acc + p.capitalPaid, 0);
        const totalInterestPaid = updatedHistory.reduce((acc, p) => acc + p.interestPaid, 0);
        const initialCap = loan.initialCapital || loan.amount;
        const remainingCapital = Math.max(0, initialCap - totalCapitalPaid);

        let newStatus = loan.status;
        if (remainingCapital <= 0) newStatus = LoanStatus.PAID;
        else if (newStatus === LoanStatus.PAID) newStatus = LoanStatus.PENDING;

        await updateDocument(TABLE_NAMES.LOANS, loanId, {
            paymentHistory: updatedHistory,
            totalCapitalPaid,
            totalInterestPaid,
            remainingCapital,
            status: newStatus
        });
        showToast('Pago actualizado y saldos recalculados.', 'success');
    }, [loans, showToast]);

    const handleDeletePayment = useCallback(async (loanId: string, paymentId: string) => {
        const loan = loans.find(l => l.id === loanId);
        if (!loan) return;

        const paymentToDelete = loan.paymentHistory.find(p => p.id === paymentId);
        if (!paymentToDelete) return;

        const updatedHistory = loan.paymentHistory.filter(p => p.id !== paymentId);

        const totalCapitalPaid = updatedHistory.reduce((acc, p) => acc + p.capitalPaid, 0);
        const totalInterestPaid = updatedHistory.reduce((acc, p) => acc + p.interestPaid, 0);
        const initialCap = loan.initialCapital || loan.amount;
        const remainingCapital = Math.max(0, initialCap - totalCapitalPaid);

        let newStatus = loan.status;
        if (remainingCapital <= 0) newStatus = LoanStatus.PAID;
        else if (newStatus === LoanStatus.PAID) newStatus = LoanStatus.PENDING;

        await updateDocument(TABLE_NAMES.LOANS, loanId, {
            paymentHistory: updatedHistory,
            totalCapitalPaid,
            totalInterestPaid,
            remainingCapital,
            status: newStatus,
            paymentsMade: updatedHistory.length
        });

        // Revert the treasury balance
        await _updateTreasuryBalance(paymentToDelete.amount, 'outflow', paymentToDelete.paymentMethod || 'Efectivo');

        showToast('Pago eliminado y saldo del tesoro revertido.', 'success');
    }, [loans, showToast, _updateTreasuryBalance]);

    const handleBalanceCorrection = useCallback(async (loanId: string, newBalance: number, notes: string) => {
        const loan = loans.find(l => l.id === loanId);
        if (!loan) return;

        // We add a "correction" record to history so numbers add up
        const diff = loan.remainingCapital - newBalance;
        // If diff > 0, we reduced debt (like a payment or forgiveness)
        // If diff < 0, we increased debt (charge)
        
        const correctionRecord: PaymentRecord = {
            id: `CORR-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            amount: 0,
            interestPaid: 0,
            capitalPaid: diff, // treated as capital adjustment
            remainingCapitalAfter: newBalance,
            notes: `CORRECCIÓN SALDO: ${notes}`,
            paymentMethod: 'Efectivo' // Dummy
        };

        const updatedHistory = [...(loan.paymentHistory || []), correctionRecord];
        const totalCapitalPaid = updatedHistory.reduce((acc, p) => acc + p.capitalPaid, 0);
        
        await updateDocument(TABLE_NAMES.LOANS, loanId, {
            remainingCapital: newBalance,
            paymentHistory: updatedHistory,
            totalCapitalPaid,
            status: newBalance <= 0 ? LoanStatus.PAID : LoanStatus.PENDING
        });
        showToast('Saldo corregido exitosamente.', 'success');
    }, [loans, showToast]);

    const handleAddClientAndLoan = useCallback(async (clientData: NewClientData, loanData: NewLoanData) => {
        // 1. Client
        const newClient = await addDocument(TABLE_NAMES.CLIENTS, {
            ...clientData,
            joinDate: new Date().toISOString()
        });

        // 2. Loan
        const { monthlyPayment, totalRepayment, monthlyRatePercentage } = calculateLoanParameters(loanData.amount, loanData.term);

        await addDocument(TABLE_NAMES.LOANS, {
            clientId: newClient.id,
            clientName: clientData.name,
            amount: loanData.amount,
            initialCapital: loanData.amount,
            remainingCapital: loanData.amount,
            interestRate: monthlyRatePercentage * 12,
            term: loanData.term,
            startDate: new Date().toISOString(),
            status: LoanStatus.PENDING,
            monthlyPayment,
            totalRepayment,
            paymentsMade: 0,
            totalInterestPaid: 0,
            totalCapitalPaid: 0,
            paymentHistory: []
        });

        // 3. Treasury Deduction (Default to Cash for manual creation)
        await _updateTreasuryBalance(loanData.amount, 'outflow', 'Efectivo');

        showToast('Cliente y préstamo registrados.', 'success');
    }, [showToast, _updateTreasuryBalance]);

    const handleAddLoan = useCallback(async (clientId: string, clientName: string, loanData: { amount: number; term: number; interestRate: number; startDate: string; notes: string }) => {
        const { amount, term, interestRate, startDate, notes } = loanData;
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
            paymentHistory: []
        });

        // Treasury Deduction
        await _updateTreasuryBalance(amount, 'outflow', 'Efectivo');

        showToast('Nuevo préstamo añadido.', 'success');
    }, [showToast, _updateTreasuryBalance]);

    const handleUpdateLoan = useCallback(async (loanId: string, updatedData: Partial<Loan>) => {
        await updateDocument(TABLE_NAMES.LOANS, loanId, updatedData);
        
        // Update local state for archived loans if present
        setArchivedLoans(prev => prev.map(l => l.id === loanId ? { ...l, ...updatedData } : l));
    }, [setArchivedLoans]);

    const handleUpdateClient = useCallback(async (clientId: string, updatedData: Partial<Client>) => {
        await updateDocument(TABLE_NAMES.CLIENTS, clientId, updatedData);
    }, []);

    const handleDeleteLoan = useCallback(async (loanId: string, clientName: string) => {
        await deleteDocument(TABLE_NAMES.LOANS, loanId);
        
        // Remove from local state if present
        setArchivedLoans(prev => prev.filter(l => l.id !== loanId));
        
        showToast(`Préstamo de ${clientName} eliminado.`, 'info');
    }, [showToast, setArchivedLoans]);

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

    // Computed clientLoanData
    const clientLoanData = useMemo(() => {
        return clients.map(c => ({
            ...c,
            loans: loans.filter(l => l.clientId === c.id)
        }));
    }, [clients, loans]);

    return {
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
