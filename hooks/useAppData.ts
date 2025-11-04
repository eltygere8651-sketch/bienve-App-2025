import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Client, Loan, LoanRequest, LoanStatus, RequestStatus, AccountingEntry, AppMeta, AccountingEntryType } from '../types';
import { supabase } from '../services/supabaseService';
import { User } from '@supabase/supabase-js';

// --- Mappers: DB (snake_case) to App (camelCase) ---

const mapClientFromDb = (c: any): Client => ({
    id: c.id,
    name: c.name,
    joinDate: c.join_date,
});

const mapLoanFromDb = (l: any): Loan => ({
    id: l.id,
    clientId: l.client_id,
    clientName: l.client_name,
    amount: l.amount,
    interestRate: l.interest_rate,
    term: l.term,
    startDate: l.start_date,
    status: l.status,
    monthlyPayment: l.monthly_payment,
    totalRepayment: l.total_repayment,
    paymentsMade: l.payments_made,
    signature: l.signature,
    contractPdfUrl: l.contract_pdf_url,
});

const mapRequestFromDb = (r: any): LoanRequest => ({
    id: r.id,
    fullName: r.full_name,
    idNumber: r.id_number,
    address: r.address,
    phone: r.phone,
    email: r.email,
    loanAmount: r.loan_amount,
    loanReason: r.loan_reason,
    employmentStatus: r.employment_status,
    contractType: r.contract_type,
    frontIdUrl: r.front_id_url,
    backIdUrl: r.back_id_url,
    requestDate: r.request_date,
    status: r.status,
    signature: r.signature,
});

const mapAccountingEntryFromDb = (e: any): AccountingEntry => ({
    id: e.id,
    entry_date: e.entry_date,
    type: e.type,
    description: e.description,
    amount: e.amount,
    created_at: e.created_at,
});

const mapAppMetaFromDb = (m: any): AppMeta => ({
    key: m.key,
    value: m.value,
});


export const useAppData = (
    showToast: (message: string, type: 'success' | 'error' | 'info') => void,
    user: User | null,
    isSchemaReady: boolean
) => {
    const [clients, setClients] = useState<Client[]>([]);
    const [loans, setLoans] = useState<Loan[]>([]);
    const [requests, setRequests] = useState<LoanRequest[]>([]);
    const [accountingEntries, setAccountingEntries] = useState<AccountingEntry[]>([]);
    const [appMeta, setAppMeta] = useState<AppMeta[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const handleLoanRequestSubmit = async (requestData: Omit<LoanRequest, 'id' | 'requestDate' | 'status' | 'frontIdUrl' | 'backIdUrl'>, files: { frontId: File, backId: File }) => {
        if (!supabase) throw new Error("Supabase services not initialized.");
        const requestId = `req-${Date.now()}`;
        const frontIdPath = `${requestId}/frontId_${files.frontId.name}`;
        const backIdPath = `${requestId}/backId_${files.backId.name}`;

        try {
            const { error: frontUploadError } = await supabase.storage.from('documents').upload(frontIdPath, files.frontId);
            if (frontUploadError) throw frontUploadError;

            const { error: backUploadError } = await supabase.storage.from('documents').upload(backIdPath, files.backId);
            if (backUploadError) throw backUploadError;

            const { data: frontUrlData } = supabase.storage.from('documents').getPublicUrl(frontIdPath);
            const { data: backUrlData } = supabase.storage.from('documents').getPublicUrl(backIdPath);

            const newRequestForDb = {
                full_name: requestData.fullName,
                id_number: requestData.idNumber,
                address: requestData.address,
                phone: requestData.phone,
                email: requestData.email,
                loan_amount: requestData.loanAmount,
                loan_reason: requestData.loanReason,
                employment_status: requestData.employmentStatus,
                contract_type: requestData.contractType,
                front_id_url: frontUrlData.publicUrl,
                back_id_url: backUrlData.publicUrl,
                request_date: new Date().toISOString(),
                status: RequestStatus.PENDING,
                signature: requestData.signature,
            };
            
            const { error: insertError } = await supabase.from('requests').insert([newRequestForDb]).select();

            if (insertError) throw insertError;
        } catch (err: any) {
            console.error("Failed to submit loan request:", err);
            if (err.message && (err.message.toLowerCase().includes('bucket not found') || err.message === 'The resource was not found')) {
                 showToast('Error: El bucket "documents" no existe. Por favor, créalo en tu panel de Supabase Storage.', 'error');
            } else {
                 showToast('Error al enviar la solicitud.', 'error');
            }
            throw err;
        }
    };

    const handleApproveRequest = async (request: LoanRequest, loanAmount: number, loanTerm: number) => {
        if (!user || !supabase) {
            showToast('Acción no autorizada o servicios no disponibles.', 'error');
            return;
        }

        try {
            const { generateContractPDF } = await import('../services/pdfService');
            const contractPdfBlob = await generateContractPDF({
                fullName: request.fullName,
                idNumber: request.idNumber,
                address: request.address,
                loanAmount: loanAmount,
            }, request.signature || null);

            const contractPath = `contracts/${user.id}/contract-${request.id}.pdf`;
            const { error: uploadError } = await supabase.storage.from('documents').upload(contractPath, contractPdfBlob);
            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage.from('documents').getPublicUrl(contractPath);
            const contractPdfUrl = urlData.publicUrl;
            
            // Calling the transactional database function
            const { error: rpcError } = await supabase.rpc('approve_request', {
                p_request_id: request.id,
                p_loan_amount: loanAmount,
                p_loan_term: loanTerm,
                p_contract_pdf_url: contractPdfUrl,
                p_request_signature: request.signature,
                p_front_id_url: request.frontIdUrl,
                p_back_id_url: request.backIdUrl
            });

            if (rpcError) throw rpcError;

            showToast(`Préstamo Aprobado para ${request.fullName}`, 'success');

        } catch (err: any) {
            console.error("Failed to approve request:", err);
            if (err.message && err.message.toLowerCase().includes('bucket not found')) {
                showToast('Error de Storage: El bucket "documents" no existe. Por favor, créalo en tu panel de Supabase.', 'error');
            } else {
                showToast('Error al aprobar el préstamo.', 'error');
            }
            throw err;
        }
    };
    
    const handleDenyRequest = async (request: LoanRequest) => {
        if(!user || !supabase) {
            showToast('Acción no autorizada o servicios no disponibles.', 'error');
            return;
        }
        try {
            // Se cambia la acción de borrar a actualizar el estado a "Denegado"
            const { error } = await supabase
                .from('requests')
                .update({ status: RequestStatus.DENIED })
                .eq('id', request.id);

            if (error) throw error;
            
            // Ya no se eliminan los archivos de Storage para mantener el historial.
            showToast('Solicitud marcada como denegada.', 'info');
        } catch (err) {
            console.error("Failed to deny request:", err);
            showToast('Error al denegar la solicitud.', 'error');
            throw err;
        }
    };

    const handleUpdateRequestStatus = async (requestId: number, status: RequestStatus) => {
        if(!user || !supabase) {
            showToast('Acción no autorizada o servicios no disponibles.', 'error');
            return;
        }
        try {
            const { error } = await supabase.from('requests').update({ status }).eq('id', requestId);
            if (error) throw error;
            showToast(`Solicitud actualizada a "${status}".`, 'info');
        } catch (err) {
            console.error("Failed to update request status:", err);
            showToast('Error al actualizar el estado.', 'error');
        }
    };
    
    const handleRegisterPayment = async (loanId: string) => {
        if(!user || !supabase) {
            showToast('Acción no autorizada o servicios no disponibles.', 'error');
            return;
        }
        const loan = loans.find(l => l.id === loanId);
        if (!loan || loan.status === LoanStatus.PAID) return;
        
        const newPaymentsMade = loan.paymentsMade + 1;
        const isPaidOff = newPaymentsMade >= loan.term;
        const newStatus = isPaidOff ? LoanStatus.PAID : LoanStatus.PENDING;

        try {
            const { error } = await supabase.from('loans').update({ payments_made: newPaymentsMade, status: newStatus }).eq('id', loanId);
            if (error) throw error;
            showToast('Pago registrado correctamente.', 'success');
        } catch (err) {
            console.error("Failed to register payment:", err);
            showToast('Error al registrar el pago.', 'error');
        }
    };

    const handleAddAccountingEntry = async (entry: { type: AccountingEntryType; description: string; amount: number; entry_date: string; }) => {
        if (!user || !supabase) {
            showToast('Acción no autorizada o servicios no disponibles.', 'error');
            return;
        }
        try {
            const { error } = await supabase.from('accounting_entries').insert([entry]);
            if (error) throw error;
            showToast('Movimiento contable registrado.', 'success');
        } catch (err) {
            console.error("Failed to add accounting entry:", err);
            showToast('Error al registrar el movimiento.', 'error');
            throw err;
        }
    };

    const handleSetCapital = async (amount: number) => {
        if (!user || !supabase) {
            showToast('Acción no autorizada o servicios no disponibles.', 'error');
            return;
        }
        try {
            const { error } = await supabase.from('app_meta').upsert({ key: 'initial_capital', value: amount.toString() }, { onConflict: 'key' });
            if (error) throw error;
            showToast('Capital inicial actualizado.', 'success');
        } catch (err) {
            console.error("Failed to set capital:", err);
            showToast('Error al actualizar el capital.', 'error');
            throw err;
        }
    };

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

    const fetchData = useCallback(async () => {
        if (!supabase) return;
        setIsLoading(true);
        setError(null);
        try {
            const [
                { data: clientsData, error: clientsError },
                { data: loansData, error: loansError },
                { data: requestsData, error: requestsError },
                { data: accountingData, error: accountingError },
                { data: metaData, error: metaError },
            ] = await Promise.all([
                supabase.from('clients').select('*'),
                supabase.from('loans').select('*'),
                supabase.from('requests').select('*').in('status', [RequestStatus.PENDING, RequestStatus.UNDER_REVIEW]),
                supabase.from('accounting_entries').select('*'),
                supabase.from('app_meta').select('*'),
            ]);
            
            if (clientsError) throw new Error(`Error fetching clients: ${clientsError.message}`);
            if (loansError) throw new Error(`Error fetching loans: ${loansError.message}`);
            if (requestsError) throw new Error(`Error fetching requests: ${requestsError.message}`);
            if (accountingError) throw new Error(`Error fetching accounting entries: ${accountingError.message}`);
            if (metaError) throw new Error(`Error fetching app meta: ${metaError.message}`);
            
            setClients((clientsData || []).map(mapClientFromDb));
            setLoans((loansData || []).map(mapLoanFromDb));
            setRequests((requestsData || []).map(mapRequestFromDb));
            setAccountingEntries((accountingData || []).map(mapAccountingEntryFromDb));
            setAppMeta((metaData || []).map(mapAppMetaFromDb));

        } catch (err: any) {
             console.error("Data fetch error:", err);
             setError("No se pudieron cargar los datos. Revisa tu conexión y la configuración de Supabase (RLS).");
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        if (!user || !supabase || !isSchemaReady) {
            setClients([]);
            setLoans([]);
            setRequests([]);
            setAccountingEntries([]);
            setAppMeta([]);
            setIsLoading(false);
            return;
        }
        
        fetchData(); 

        const handleChanges = (payload: any) => {
            console.log('Realtime change received!', payload);
            const table = payload.table;
            const event = payload.eventType;

            const mapper = {
                clients: mapClientFromDb,
                loans: mapLoanFromDb,
                requests: mapRequestFromDb,
                accounting_entries: mapAccountingEntryFromDb,
                app_meta: mapAppMetaFromDb,
            }[table];

            if (!mapper) return;
            
            const stateUpdater = {
                clients: setClients,
                loans: setLoans,
                requests: setRequests,
                accounting_entries: setAccountingEntries,
                app_meta: setAppMeta,
            }[table] as React.Dispatch<React.SetStateAction<any[]>>;

            if (!stateUpdater) return;

            if (event === 'INSERT') {
                const newRecord = mapper(payload.new);
                stateUpdater(currentRecords => {
                    if (currentRecords.some(rec => rec.id === newRecord.id)) {
                        return currentRecords;
                    }
                    return [...currentRecords, newRecord];
                });
            } else if (event === 'UPDATE') {
                const updatedRecord = mapper(payload.new);
                stateUpdater(currentRecords => currentRecords.map(record => record.id === updatedRecord.id ? updatedRecord : record));
            } else if (event === 'DELETE') {
                const oldRecordId = payload.old.id;
                stateUpdater(currentRecords => currentRecords.filter(record => record.id !== oldRecordId));
            }
        };
        
        const channels = supabase
            .channel('db-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, handleChanges)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'loans' }, handleChanges)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, handleChanges)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'accounting_entries' }, handleChanges)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'app_meta' }, handleChanges)
            .subscribe();

        return () => {
            supabase.removeChannel(channels);
        };
    }, [user, fetchData, isSchemaReady, supabase]);


    return {
        clients,
        loans,
        requests,
        accountingEntries,
        appMeta,
        isLoading,
        error,
        handleLoanRequestSubmit,
        handleApproveRequest,
        handleDenyRequest,
        handleUpdateRequestStatus,
        handleRegisterPayment,
        handleAddAccountingEntry,
        handleSetCapital,
        clientLoanData,
    };
};