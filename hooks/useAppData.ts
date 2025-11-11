import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Client, Loan, LoanRequest, LoanStatus, RequestStatus } from '../types';
import { supabase } from '../services/supabaseService';
import { User } from '@supabase/supabase-js';
import {
    getCachedClients, getCachedLoans, getCachedRequests,
    cacheClients, cacheLoans, cacheRequests, clearAllCachedTables
} from '../services/dbService';
import { TABLE_NAMES } from '../constants';

// --- Mappers: DB (snake_case) to App (camelCase) ---

const mapClientFromDb = (c: any): Client | null => {
    if (
        !c ||
        typeof c.id !== 'string' ||
        typeof c.name !== 'string' ||
        typeof c.join_date !== 'string'
    ) {
        console.warn('Skipping invalid client record from DB: missing or malformed required fields.', c);
        return null;
    }
    return {
        id: c.id,
        name: c.name,
        joinDate: c.join_date,
        idNumber: c.id_number,
        phone: c.phone,
        address: c.address,
        email: c.email,
    };
};

const mapLoanFromDb = (l: any): Loan | null => {
    if (
        !l ||
        typeof l.id !== 'string' ||
        typeof l.client_id !== 'string' ||
        typeof l.client_name !== 'string' ||
        typeof l.amount !== 'number' ||
        typeof l.interest_rate !== 'number' ||
        typeof l.term !== 'number' ||
        typeof l.start_date !== 'string' ||
        typeof l.status !== 'string' ||
        typeof l.monthly_payment !== 'number' ||
        typeof l.total_repayment !== 'number' ||
        typeof l.payments_made !== 'number'
    ) {
        console.warn('Skipping invalid loan record from DB: missing or malformed required fields.', l);
        return null;
    }
    return {
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
    };
};

const mapRequestFromDb = (r: any): LoanRequest | null => {
    if (
        !r ||
        typeof r.id !== 'string' ||
        typeof r.full_name !== 'string' ||
        typeof r.id_number !== 'string' ||
        typeof r.address !== 'string' ||
        typeof r.phone !== 'string' ||
        typeof r.loan_amount !== 'number' ||
        typeof r.loan_reason !== 'string' ||
        typeof r.employment_status !== 'string' ||
        typeof r.front_id_url !== 'string' ||
        typeof r.back_id_url !== 'string' ||
        typeof r.request_date !== 'string' ||
        typeof r.status !== 'string'
    ) {
        console.warn('Skipping invalid request record from DB: missing or malformed required fields.', r);
        return null;
    }
    
    return {
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
    };
};

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
    const debounceTimerRef = useRef<number | null>(null);

    // Effect for in-app notification sound and toast
    useEffect(() => {
        if (!user || isLoading) return; // Don't run on load or if not logged in

        if (isInitialLoadRef.current) {
            isInitialLoadRef.current = false;
            prevRequestsCountRef.current = requests.length;
            return;
        }
    
        if (requests.length > prevRequestsCountRef.current) {
            showToast('¡Nueva solicitud de préstamo recibida!', 'success');
            const audio = document.getElementById('notification-sound') as HTMLAudioElement;
            if (audio) {
                audio.play().catch(e => console.warn("Could not play notification sound:", e));
            }

            // New powerful notification logic
            if ('Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then(registration => {
                    const title = '¡Nueva Solicitud de Préstamo!';
                    const options: NotificationOptions = {
                        body: 'Se ha registrado una nueva solicitud. ¡Revísala ahora!',
                        icon: 'assets/icon.svg',
                        badge: 'assets/icon.svg',
                        tag: 'new-request'
                    };
                    registration.showNotification(title, options);
                });
            }
        }
    
        prevRequestsCountRef.current = requests.length;
    }, [requests, user, isLoading, showToast]);


    const handleLoanRequestSubmit = useCallback(async (requestData: Omit<LoanRequest, 'id' | 'requestDate' | 'status' | 'frontIdUrl' | 'backIdUrl'>, files: { frontId: File, backId: File }) => {
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

            const { error: insertError } = await supabase.from(TABLE_NAMES.REQUESTS).insert([{
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
                signature: requestData.signature,
            }]);

            if (insertError) throw insertError;

        } catch (err: any) {
            console.error("Failed to submit loan request:", err);
            if (err.message && (err.message.toLowerCase().includes('bucket not found') || err.message === 'The resource was not found')) {
                 showToast('Error: El bucket "documents" no existe. Por favor, créalo en tu panel de Supabase Storage.', 'error');
            } else {
                 showToast(`Error al enviar la solicitud: ${err.message || 'Error desconocido.'}`, 'error');
            }
            throw err;
        }
    }, [showToast]);

    const handleApproveRequest = useCallback(async (request: LoanRequest, loanAmount: number, loanTerm: number) => {
        if (!request.id) {
            const msg = 'No se puede aprobar una solicitud sin ID.';
            showToast(msg, 'error');
            throw new Error(msg);
        }
        if (!user || !supabase) {
            showToast('Acción no autorizada o servicios no disponibles.', 'error');
            throw new Error('Acción no autorizada o servicios no disponibles.');
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
            const { error: uploadError } = await supabase.storage.from('documents').upload(contractPath, contractPdfBlob, {
                upsert: true,
            });
            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage.from('documents').getPublicUrl(contractPath);
            const contractPdfUrl = urlData.publicUrl;
            
            const { error: rpcError } = await supabase.rpc('approve_request', {
                p_request_id: request.id,
                p_loan_amount: loanAmount,
                p_loan_term: loanTerm,
                p_contract_pdf_url: contractPdfUrl,
                p_request_signature: request.signature
            });

            if (rpcError) throw rpcError;

            showToast(`Préstamo Aprobado para ${request.fullName}`, 'success');

        } catch (err: any) {
            const errorMessage = err?.message || 'Ocurrió un error desconocido.';
            console.error("Failed to approve request:", errorMessage, err);
            if (errorMessage.toLowerCase().includes('bucket not found')) {
                showToast('Error de Storage: El bucket "documents" no existe. Por favor, créalo en tu panel de Supabase.', 'error');
            } else if (errorMessage.toLowerCase().includes('violates row-level security policy')) {
                 showToast('Error de Permisos: El esquema de tu base de datos está desactualizado. Por favor, ejecuta el último script SQL desde el editor de Supabase.', 'error');
            } else {
                showToast(`Error al aprobar el préstamo: ${errorMessage}`, 'error');
            }
            throw err;
        }
    }, [user, showToast]);
    
    const handleRejectRequest = useCallback(async (request: LoanRequest) => {
        if (!request.id) {
            const msg = 'No se puede rechazar una solicitud sin ID.';
            showToast(msg, 'error');
            throw new Error(msg);
        }
        if (!user || !supabase) {
            showToast('Acción no autorizada o servicios no disponibles.', 'error');
            throw new Error('Acción no autorizada o servicios no disponibles.');
        }
        try {
            const { error: dbError } = await supabase
                .from(TABLE_NAMES.REQUESTS)
                .delete()
                .eq('id', request.id);
            if (dbError) throw dbError;
    
            const filePaths = [request.frontIdUrl, request.backIdUrl].map(url => {
                const urlParts = url.split('/documents/');
                return urlParts.length > 1 ? decodeURIComponent(urlParts[1]) : null;
            }).filter(Boolean) as string[];
    
            if (filePaths.length > 0) {
                const { error: storageError } = await supabase.storage.from('documents').remove(filePaths);
                if (storageError) {
                    console.warn("Request deleted from DB, but failed to delete storage files:", storageError);
                    showToast('Solicitud eliminada, pero no se pudieron borrar los archivos adjuntos.', 'info');
                } else {
                    showToast('Solicitud rechazada y eliminada permanentemente.', 'success');
                }
            } else {
                showToast('Solicitud rechazada y eliminada permanentemente.', 'success');
            }
        } catch (err: any) {
            console.error("Failed to reject request:", err);
            showToast(`Error al rechazar la solicitud: ${err.message || 'Error desconocido.'}`, 'error');
            throw err;
        }
    }, [user, showToast]);

    const handleUpdateRequestStatus = useCallback(async (requestId: string, status: RequestStatus) => {
        if(!requestId) {
            const msg = 'No se puede actualizar una solicitud sin ID.';
            showToast(msg, 'error');
            throw new Error(msg);
        }
        if(!user || !supabase) {
            showToast('Acción no autorizada o servicios no disponibles.', 'error');
            throw new Error('Acción no autorizada o servicios no disponibles.');
        }
        try {
            const { error } = await supabase.from(TABLE_NAMES.REQUESTS).update({ status }).eq('id', requestId);
            if (error) throw error;
            showToast(`Solicitud actualizada a "${status}".`, 'info');
        } catch (err: any) {
            console.error("Failed to update request status:", err);
            showToast(`Error al actualizar el estado: ${err.message || 'Error desconocido.'}`, 'error');
            throw err;
        }
    }, [user, showToast]);
    
    const handleRegisterPayment = useCallback(async (loanId: string) => {
        if(!user || !supabase) {
            showToast('Acción no autorizada o servicios no disponibles.', 'error');
            throw new Error('Acción no autorizada o servicios no disponibles.');
        }
        const loan = loans.find(l => l.id === loanId);
        if (!loan || loan.status === LoanStatus.PAID) return;
        
        const newPaymentsMade = loan.paymentsMade + 1;
        const isPaidOff = newPaymentsMade >= loan.term;
        const newStatus = isPaidOff ? LoanStatus.PAID : LoanStatus.PENDING;

        try {
            const { error } = await supabase.from(TABLE_NAMES.LOANS).update({ payments_made: newPaymentsMade, status: newStatus }).eq('id', loanId);
            if (error) throw error;
            showToast('Pago registrado correctamente.', 'success');
        } catch (err: any) {
            console.error("Failed to register payment:", err);
            showToast(`Error al registrar el pago: ${err.message || 'Error desconocido.'}`, 'error');
        }
    }, [user, loans, showToast]);

    const handleAddClientAndLoan = useCallback(async (clientData: Omit<Client, 'id' | 'joinDate'>, loanData: { amount: number; term: number }) => {
        if (!user || !supabase) {
            showToast('Acción no autorizada o servicios no disponibles.', 'error');
            throw new Error('Acción no autorizada o servicios no disponibles.');
        }
        try {
            const { error: rpcError } = await supabase.rpc('create_client_and_loan', {
                p_client_name: clientData.name,
                p_client_id_number: clientData.idNumber,
                p_client_phone: clientData.phone,
                p_client_address: clientData.address,
                p_client_email: clientData.email,
                p_loan_amount: loanData.amount,
                p_loan_term: loanData.term
            });

            if (rpcError) throw rpcError;

            showToast(`Cliente ${clientData.name} y su préstamo han sido registrados.`, 'success');
        } catch (err: any) {
            console.error("Failed to add client and loan:", err);
            const errorMessage = err.message || '';
            if (errorMessage.toLowerCase().includes('violates row-level security policy')) {
                showToast('Error de Permisos: El esquema de tu base de datos está desactualizado. Por favor, ejecuta el último script SQL.', 'error');
            } else {
                showToast(`Error al registrar el cliente y el préstamo: ${errorMessage || 'Error desconocido.'}`, 'error');
            }
            throw err;
        }
    }, [user, showToast]);

    const handleUpdateLoan = useCallback(async (loanId: string, updatedData: Partial<Loan>) => {
        if (!user || !supabase) {
            showToast('Acción no autorizada o servicios no disponibles.', 'error');
            throw new Error('Not authorized or services unavailable.');
        }
        try {
            const dbData: { [key: string]: any } = {
                amount: updatedData.amount,
                interest_rate: updatedData.interestRate,
                term: updatedData.term,
                start_date: updatedData.startDate,
                status: updatedData.status,
                payments_made: updatedData.paymentsMade,
            };
            Object.keys(dbData).forEach(key => dbData[key] === undefined && delete dbData[key]);

            if (Object.keys(dbData).length === 0) {
                showToast('No se proporcionaron datos para actualizar.', 'info');
                return;
            }
            const { error } = await supabase.from(TABLE_NAMES.LOANS).update(dbData).eq('id', loanId);
            if (error) throw error;
            showToast('Préstamo actualizado correctamente.', 'success');
        } catch (err: any) {
            console.error("Failed to update loan:", err);
            showToast(`Error al actualizar el préstamo: ${err.message || 'Error desconocido.'}`, 'error');
            throw err;
        }
    }, [user, showToast]);

    const handleDeleteLoan = useCallback(async (loanId: string, clientName: string) => {
        if (!user || !supabase) {
            showToast('Acción no autorizada o servicios no disponibles.', 'error');
            throw new Error('Not authorized or services unavailable.');
        }
        try {
            const { error } = await supabase.from(TABLE_NAMES.LOANS).delete().eq('id', loanId);
            if (error) throw error;
            showToast(`Préstamo de ${clientName} eliminado correctamente.`, 'success');
        } catch (err: any) {
            console.error("Failed to delete loan:", err);
            showToast(`Error al eliminar el préstamo: ${err.message || 'Error desconocido.'}`, 'error');
            throw err;
        }
    }, [user, showToast]);

    const handleGenerateTestRequest = useCallback(async () => {
        if (!supabase) {
            showToast('Servicios de Supabase no inicializados.', 'error');
            throw new Error('Supabase not initialized');
        }

        try {
            const timestamp = Date.now();
            const testRequest = {
                full_name: `Cliente de Prueba ${timestamp}`,
                id_number: `Y${Math.floor(10000000 + Math.random() * 90000000)}T`,
                address: `Calle Falsa 123, Ciudad Demo`,
                phone: `600${Math.floor(100000 + Math.random() * 900000)}`,
                email: `test.${timestamp}@example.com`,
                loan_amount: Math.floor(500 + Math.random() * 4500),
                loan_reason: 'Otro',
                employment_status: 'Empleado',
                contract_type: 'Indefinido',
                front_id_url: 'https://via.placeholder.com/337x212.png?text=DNI+Anverso', // Placeholder URLs
                back_id_url: 'https://via.placeholder.com/337x212.png?text=DNI+Reverso',
                request_date: new Date().toISOString(),
                status: RequestStatus.PENDING,
                signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', // 1x1 transparent png
            };

            const { error: insertError } = await supabase
                .from(TABLE_NAMES.REQUESTS)
                .insert([testRequest]);

            if (insertError) {
                throw insertError;
            }

            showToast('Solicitud de prueba generada correctamente.', 'success');

        } catch (err: any) {
            console.error("Failed to generate test request:", err);
            showToast(`Error al generar la solicitud de prueba: ${err.message}`, 'error');
            throw err;
        }
    }, [showToast]);

    const handleDeleteTestRequests = useCallback(async () => {
        if (!user || !supabase) {
            showToast('Acción no autorizada o servicios no disponibles.', 'error');
            throw new Error('Acción no autorizada o servicios no disponibles.');
        }
        try {
            const { error } = await supabase
                .from(TABLE_NAMES.REQUESTS)
                .delete()
                .ilike('full_name', 'Cliente de Prueba %');

            if (error) throw error;

            showToast('Todas las solicitudes de prueba han sido eliminadas.', 'success');
        } catch (err: any) {
            console.error("Failed to delete test requests:", err);
            showToast(`Error al eliminar las solicitudes de prueba: ${err.message}`, 'error');
            throw err;
        }
    }, [user, showToast]);

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
    
        if (user) {
            const [requestsRes, clientsRes, loansRes] = await Promise.all([
                supabase.from(TABLE_NAMES.REQUESTS).select('*').in('status', [RequestStatus.PENDING, RequestStatus.UNDER_REVIEW]),
                supabase.from(TABLE_NAMES.CLIENTS).select('*'),
                supabase.from(TABLE_NAMES.LOANS).select('*'),
            ]);
    
            if (requestsRes.error) throw requestsRes.error;
            if (clientsRes.error) throw clientsRes.error;
            if (loansRes.error) throw loansRes.error;
    
            const mappedRequests = (requestsRes.data || [])
                .map(mapRequestFromDb)
                .filter((r): r is LoanRequest => r !== null);
            
            const mappedClients = (clientsRes.data || [])
                .map(mapClientFromDb)
                .filter((c): c is Client => c !== null);

            const mappedLoans = (loansRes.data || [])
                .map(mapLoanFromDb)
                .filter((l): l is Loan => l !== null);
    
            setRequests(mappedRequests);
            setClients(mappedClients);
            setLoans(mappedLoans);
    
            Promise.all([
                cacheRequests(mappedRequests),
                cacheClients(mappedClients),
                cacheLoans(mappedLoans),
            ]).catch(cacheError => {
                console.warn("Failed to update offline cache:", cacheError);
            });
        } else {
            setRequests([]);
            setClients([]);
            setLoans([]);
            clearAllCachedTables().catch(e =>
                console.warn('Could not clear cache on logout', e)
            );
        }
    }, [user]);
    
    const loadAndSyncData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        let isCacheEmpty = true;

        if (user) {
            try {
                const [cachedClients, cachedLoans, cachedRequests] = await Promise.all([
                    getCachedClients(),
                    getCachedLoans(),
                    getCachedRequests(),
                ]);

                if (cachedClients.length > 0 || cachedLoans.length > 0 || cachedRequests.length > 0) {
                    setClients(cachedClients);
                    setLoans(cachedLoans);
                    setRequests(cachedRequests);
                    isCacheEmpty = false;
                }
            } catch (cacheError) {
                console.warn("Could not load data from cache:", cacheError);
            }
        }

        try {
            await fetchData();
        } catch (fetchErr: any) {
            console.error("Data fetch error:", fetchErr);
            if (isCacheEmpty) {
                setError(`No se pudieron cargar los datos: ${fetchErr.message}. Revisa tu conexión.`);
            } else {
                showToast('Sin conexión. Mostrando últimos datos disponibles.', 'info');
            }
        } finally {
            setIsLoading(false);
        }
    }, [user, fetchData, showToast]);

    const handleChanges = useCallback(() => {
        console.log('Realtime change received, queueing refetch.');
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = window.setTimeout(() => {
             console.log('Debounced refetch triggered.');
             fetchData().catch(fetchErr => {
                console.error("Realtime fetch failed:", fetchErr);
                showToast("No se pudo sincronizar. Comprueba tu conexión.", 'info');
            });
        }, 500);
    }, [fetchData, showToast]);

    useEffect(() => {
        if (!supabase) {
            setIsLoading(false);
            return;
        }
    
        loadAndSyncData();
    
        if (!user) {
            return;
        }

        const channel = supabase
            .channel('db-changes-bm-contigo')
            .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_NAMES.CLIENTS }, handleChanges)
            .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_NAMES.LOANS }, handleChanges)
            .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_NAMES.REQUESTS }, handleChanges)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, loadAndSyncData, handleChanges]);

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
        handleGenerateTestRequest,
        handleDeleteTestRequests,
        handleUpdateLoan,
        handleDeleteLoan,
    };
};