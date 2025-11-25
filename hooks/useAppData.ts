
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Client, Loan, LoanRequest, LoanStatus, RequestStatus } from '../types';
import { User } from 'firebase/auth';
import { 
    subscribeToCollection, 
    addDocument, 
    updateDocument, 
    deleteDocument,
    getCollection // Importamos getCollection para la carga manual
} from '../services/firebaseService';
// Importamos orderBy y limit, pero los usaremos con precaución
import { orderBy, limit } from 'firebase/firestore';
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

        // SAFETY TIMEOUT
        const safetyTimeout = setTimeout(() => {
            if (isLoading) {
                console.warn("Firebase loading timed out - Forcing app render");
                setIsLoading(false);
            }
        }, 3000);

        // Clientes
        const unsubClients = subscribeToCollection('clients', (data) => {
            setClients(data as Client[]);
            clientsLoaded = true;
            checkAllLoaded();
        }, [], (err) => {
            console.error("Error loading clients", err);
            clientsLoaded = true;
            checkAllLoaded();
        });

        // Préstamos
        const unsubLoans = subscribeToCollection('loans', (data) => {
            setLoans(data as Loan[]);
            loansLoaded = true;
            checkAllLoaded();
        }, [], (err) => {
             console.error("Error loading loans", err);
             loansLoaded = true;
             checkAllLoaded();
        });

        // SOLICITUDES - ESTRATEGIA "SIN FILTROS" (Maximum Compatibility)
        // Eliminamos orderBy y limit de la suscripción automática para evitar 
        // cualquier error de índice o permisos complejos.
        const unsubRequests = subscribeToCollection(
            'requests', 
            (data) => {
                const reqs = (data || []) as LoanRequest[];
                console.log("Solicitudes descargadas (Realtime):", reqs.length);
                setRequests(reqs);
                requestsLoaded = true;
                checkAllLoaded();
                setError(null);
            },
            [], // Sin restricciones (Empty Array)
            (err) => {
                console.error("Error loading requests:", err);
                // No mostramos error bloqueante, permitimos reintentar manual
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

    // Notificaciones de nuevas solicitudes
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

    // Función para forzar la recarga manual (Bypassing listener)
    const reloadRequests = useCallback(async () => {
        setIsLoading(true);
        try {
            console.log("Forzando recarga manual de solicitudes...");
            const data = await getCollection('requests');
            console.log("Datos manuales recibidos:", data.length);
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
            // 1. Crear Cliente
            const newClient = {
                name: request.fullName,
                idNumber: request.idNumber,
                phone: request.phone,
                address: request.address,
                email: request.email,
                joinDate: new Date().toISOString()
            };
            const clientDoc = await addDocument('clients', newClient);

            // 2. Calcular detalles del préstamo
            const monthlyRate = 96 / 12 / 100; // 8% mensual
            const monthlyPayment = (loanAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -loanTerm));
            const totalRepayment = monthlyPayment * loanTerm;

            // 3. Crear Préstamo
            const newLoan = {
                clientId: clientDoc.id,
                clientName: request.fullName,
                amount: loanAmount,
                interestRate: 96,
                term: loanTerm,
                startDate: new Date().toISOString(),
                status: LoanStatus.PENDING,
                monthlyPayment,
                totalRepayment,
                paymentsMade: 0,
                signature: request.signature,
                contractPdfUrl: ''
            };
            await addDocument('loans', newLoan);

            // 4. Eliminar Solicitud
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
    
    const handleRegisterPayment = useCallback(async (loanId: string) => {
        const loan = loans.find(l => l.id === loanId);
        if (!loan || loan.status === LoanStatus.PAID) return;
        
        const newPaymentsMade = loan.paymentsMade + 1;
        const isPaidOff = newPaymentsMade >= loan.term;
        const newStatus = isPaidOff ? LoanStatus.PAID : LoanStatus.PENDING;

        try {
            await updateDocument('loans', loanId, { paymentsMade: newPaymentsMade, status: newStatus });
            showToast('Pago registrado correctamente.', 'success');
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

             const monthlyRate = 96 / 12 / 100;
             const monthlyPayment = (loanData.amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -loanData.term));
             const totalRepayment = monthlyPayment * loanData.term;
 
             await addDocument('loans', {
                 clientId: clientDoc.id,
                 clientName: clientData.name,
                 amount: loanData.amount,
                 interestRate: 96,
                 term: loanData.term,
                 startDate: new Date().toISOString(),
                 status: LoanStatus.PENDING,
                 monthlyPayment,
                 totalRepayment,
                 paymentsMade: 0
             });

            showToast(`Cliente registrado.`, 'success');
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
            showToast('Solicitud de prueba generada. Pulsa "Recargar" si no aparece.', 'success');
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
        handleGenerateTestRequest,
        handleDeleteTestRequests,
        handleUpdateLoan,
        handleDeleteLoan,
        reloadRequests // Exponemos la función de recarga manual
    };
};
