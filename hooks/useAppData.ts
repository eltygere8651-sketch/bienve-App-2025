import { useState, useEffect, useMemo, useCallback } from 'react';
import { Client, Loan, LoanRequest, LoanStatus, RequestStatus } from '../types';
import { generateWelcomeMessage } from '../services/geminiService';
import { supabase } from '../services/supabaseService';
import { User } from '@supabase/supabase-js';

export const useAppData = (
    showToast: (message: string, type: 'success' | 'error' | 'info') => void,
    user: User | null,
    isSchemaReady: boolean
) => {
    const [clients, setClients] = useState<Client[]>([]);
    const [loans, setLoans] = useState<Loan[]>([]);
    const [requests, setRequests] = useState<LoanRequest[]>([]);
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

            const newRequest: Omit<LoanRequest, 'id'> = {
                ...requestData,
                frontIdUrl: frontUrlData.publicUrl,
                backIdUrl: backUrlData.publicUrl,
                requestDate: new Date().toISOString(),
                status: RequestStatus.PENDING,
            };
            
            const { error: insertError } = await supabase.from('requests').insert([newRequest]).select();
            if (insertError) throw insertError;
        } catch (err) {
            console.error("Failed to submit loan request:", err);
            showToast('Error al enviar la solicitud.', 'error');
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

            const welcomeMessage = await generateWelcomeMessage(request.fullName);
            showToast(`Préstamo Aprobado para ${request.fullName}`, 'success');
            showToast(welcomeMessage, 'info');

        } catch (err)
 {
            console.error("Failed to approve request:", err);
            showToast('Error al aprobar el préstamo.', 'error');
            throw err;
        }
    };
    
    const handleDenyRequest = async (request: LoanRequest) => {
        if(!user || !supabase) {
            showToast('Acción no autorizada o servicios no disponibles.', 'error');
            return;
        }
        try {
            const { error } = await supabase.from('requests').delete().eq('id', request.id);
            if (error) throw error;
            
            try {
                // Robust path extraction from URL
                const getPath = (url: string) => url.substring(url.indexOf('/documents/') + '/documents/'.length);
                const frontPath = getPath(request.frontIdUrl);
                const backPath = getPath(request.backIdUrl);
                await supabase.storage.from('documents').remove([frontPath, backPath]);
            } catch (storageError) {
                console.warn("Could not clean up request files from Storage:", storageError);
            }

            showToast('Solicitud denegada y eliminada.', 'info');
        } catch (err) {
            console.error("Failed to deny request:", err);
            showToast('Error al denegar la solicitud.', 'error');
            throw err;
        }
    };

    const handleUpdateRequestStatus = async (requestId: string, status: RequestStatus) => {
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
            throw err;
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
                { data: requestsData, error: requestsError }
            ] = await Promise.all([
                supabase.from('clients').select('*'),
                supabase.from('loans').select('*'),
                supabase.from('requests').select('*').in('status', [RequestStatus.PENDING, RequestStatus.UNDER_REVIEW]),
            ]);
            
            if (clientsError) throw new Error(`Error fetching clients: ${clientsError.message}`);
            if (loansError) throw new Error(`Error fetching loans: ${loansError.message}`);
            if (requestsError) throw new Error(`Error fetching requests: ${requestsError.message}`);
            
            setClients(clientsData || []);
            setLoans(loansData || []);
            setRequests(requestsData || []);

        } catch (err: any) {
             console.error("Data fetch error:", err);
             setError("No se pudieron cargar los datos. Revisa tu conexión y la configuración de Supabase (RLS).");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!user || !supabase || !isSchemaReady) {
            setClients([]);
            setLoans([]);
            setRequests([]);
            setIsLoading(false);
            return;
        }
        
        fetchData(); 

        const handleChanges = (payload: any) => {
            console.log('Realtime change received!', payload);
            const table = payload.table;
            const event = payload.eventType;
            const newRecord = payload.new;
            const oldRecord = payload.old;

            const stateUpdater = {
                clients: setClients,
                loans: setLoans,
                requests: setRequests,
            }[table];

            if (!stateUpdater) return;

            stateUpdater((currentRecords: any[]) => {
                if (event === 'INSERT') {
                    return [...currentRecords, newRecord];
                }
                if (event === 'UPDATE') {
                    return currentRecords.map(record => record.id === newRecord.id ? newRecord : record);
                }
                if (event === 'DELETE') {
                    return currentRecords.filter(record => record.id !== oldRecord.id);
                }
                return currentRecords;
            });
        };
        
        const channels = supabase
            .channel('db-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, handleChanges)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'loans' }, handleChanges)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, handleChanges)
            .subscribe();

        return () => {
            supabase.removeChannel(channels);
        };
    }, [user, fetchData, isSchemaReady]);


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
    };
};