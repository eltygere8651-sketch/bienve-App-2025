import { useState, useEffect, useMemo, useCallback } from 'react';
import { Client, Loan, LoanRequest, LoanStatus, RequestStatus } from '../types';
import { generateWelcomeMessage } from '../services/geminiService';
import { INTEREST_RATE_CONFIG } from '../config';
import { auth, db, storage } from '../services/firebaseService';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, writeBatch, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { User } from 'firebase/auth';

export const useAppData = (
    showToast: (message: string, type: 'success' | 'error' | 'info') => void,
    showConfirmModal: (options: { title: string; message: string; onConfirm: () => void; }) => void,
    user: User | null
) => {
    const [clients, setClients] = useState<Client[]>([]);
    const [loans, setLoans] = useState<Loan[]>([]);
    const [requests, setRequests] = useState<LoanRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const getCollectionRef = useCallback((collectionName: string) => {
        if (!user) throw new Error("User not authenticated");
        return collection(db, "users", user.uid, collectionName);
    }, [user]);
    
    useEffect(() => {
        if (!user) {
            setClients([]);
            setLoans([]);
            setRequests([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const collectionsToWatch = ['clients', 'loans', 'requests'];
        const unsubscribes = collectionsToWatch.map(collectionName => {
            const q = query(getCollectionRef(collectionName));
            return onSnapshot(q, (querySnapshot) => {
                const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                switch (collectionName) {
                    case 'clients':
                        setClients(data as Client[]);
                        break;
                    case 'loans':
                        setLoans(data as Loan[]);
                        break;
                    case 'requests':
                        setRequests(data as LoanRequest[]);
                        break;
                }
                setIsLoading(false);
            }, (err) => {
                console.error(`Error fetching ${collectionName}:`, err);
                setError(`No se pudieron cargar los datos de ${collectionName}.`);
                setIsLoading(false);
            });
        });

        return () => unsubscribes.forEach(unsub => unsub());

    }, [user, getCollectionRef]);


    const handleLoanRequestSubmit = async (requestData: Omit<LoanRequest, 'id' | 'requestDate' | 'status' | 'frontIdUrl' | 'backIdUrl'>, files: { frontId: File, backId: File }) => {
        if (!user) {
            showToast('Necesitas iniciar sesión para enviar una solicitud.', 'error');
            return;
        }
    
        const requestId = `req-${Date.now()}`;
        const frontIdPath = `requests/${requestId}/frontId_${files.frontId.name}`;
        const backIdPath = `requests/${requestId}/backId_${files.backId.name}`;
    
        try {
            // Subir imágenes a un path temporal o directamente al user path si se decide
            const frontIdRef = ref(storage, frontIdPath);
            await uploadBytes(frontIdRef, files.frontId);
            const frontIdUrl = await getDownloadURL(frontIdRef);
    
            const backIdRef = ref(storage, backIdPath);
            await uploadBytes(backIdRef, files.backId);
            const backIdUrl = await getDownloadURL(backIdRef);
    
            const newRequest: Omit<LoanRequest, 'id'> = {
                ...requestData,
                frontIdUrl,
                backIdUrl,
                requestDate: new Date().toISOString(),
                status: RequestStatus.PENDING,
            };
            
            // Asignar a un admin. En este modelo, el "admin" es el propio usuario.
            await addDoc(getCollectionRef('requests'), newRequest);
            // No actualizamos estado local, `onSnapshot` lo hará.

        } catch (err) {
            console.error("Failed to submit loan request:", err);
            showToast('Error al enviar la solicitud.', 'error');
            throw err;
        }
    };
    
    const handleApproveRequest = async (request: LoanRequest, loanAmount: number, loanTerm: number) => {
        if (!user) return;
        
        try {
            // Generar PDF y subirlo
            const { generateContractPDF } = await import('../services/pdfService');
            const contractPdfBlob = await generateContractPDF({
                fullName: request.fullName,
                idNumber: request.idNumber,
                address: request.address,
                loanAmount: loanAmount,
            }, request.signature || null);
            
            const contractPath = `contracts/${user.uid}/contract-${request.id}.pdf`;
            const contractRef = ref(storage, contractPath);
            await uploadBytes(contractRef, contractPdfBlob);
            const contractPdfUrl = await getDownloadURL(contractRef);

            const batch = writeBatch(db);

            // 1. Crear nuevo cliente
            const newClient: Omit<Client, 'id'> = {
                name: request.fullName,
                joinDate: new Date().toISOString(),
            };
            const clientRef = doc(getCollectionRef('clients'));
            batch.set(clientRef, newClient);

            // 2. Crear nuevo préstamo
            const interestRate = INTEREST_RATE_CONFIG.ANNUAL;
            const principal = loanAmount;
            const rate = INTEREST_RATE_CONFIG.MONTHLY / 100;
            const n = loanTerm;
            const monthlyPayment = rate > 0 ? (principal * rate * Math.pow(1 + rate, n)) / (Math.pow(1 + rate, n) - 1) : principal / n;
            const totalRepayment = monthlyPayment * n;

            const newLoan: Omit<Loan, 'id'> = {
                clientId: clientRef.id,
                clientName: newClient.name,
                amount: loanAmount,
                interestRate,
                term: loanTerm,
                startDate: new Date().toISOString(),
                status: LoanStatus.PENDING,
                monthlyPayment,
                totalRepayment,
                paymentsMade: 0,
                signature: request.signature,
                contractPdfUrl,
            };
            const loanRef = doc(getCollectionRef('loans'));
            batch.set(loanRef, newLoan);

            // 3. Eliminar la solicitud
            const requestRef = doc(getCollectionRef('requests'), request.id);
            batch.delete(requestRef);

            await batch.commit();

            // 4. Limpiar archivos de la solicitud en Storage (opcional, pero buena práctica)
            try {
                const frontIdFileRef = ref(storage, request.frontIdUrl);
                await deleteObject(frontIdFileRef);
                const backIdFileRef = ref(storage, request.backIdUrl);
                await deleteObject(backIdFileRef);
            } catch (storageError) {
                console.warn("Could not clean up request files from Storage:", storageError);
            }

            const welcomeMessage = await generateWelcomeMessage(newClient.name);
            showToast(`Préstamo Aprobado para ${newClient.name}`, 'success');
            showToast(welcomeMessage, 'info');

        } catch (err) {
            console.error("Failed to approve request:", err);
            showToast('Error al aprobar el préstamo.', 'error');
        }
    };
    
    const handleDenyRequest = async (request: LoanRequest) => {
        if(!user) return;
        try {
            await deleteDoc(doc(getCollectionRef('requests'), request.id));
            
             // Limpiar archivos de Storage
            try {
                const frontIdFileRef = ref(storage, request.frontIdUrl);
                await deleteObject(frontIdFileRef);
                const backIdFileRef = ref(storage, request.backIdUrl);
                await deleteObject(backIdFileRef);
            } catch (storageError) {
                console.warn("Could not clean up request files from Storage:", storageError);
            }

            showToast('Solicitud denegada y eliminada.', 'info');
        } catch (err) {
            console.error("Failed to deny request:", err);
            showToast('Error al denegar la solicitud.', 'error');
        }
    };

    const handleUpdateRequestStatus = async (requestId: string, status: RequestStatus) => {
        if(!user) return;
        try {
            await updateDoc(doc(getCollectionRef('requests'), requestId), { status });
            showToast(`Solicitud actualizada a "${status}".`, 'info');
        } catch (err) {
            console.error("Failed to update request status:", err);
            showToast('Error al actualizar el estado.', 'error');
        }
    };
    
    const handleRegisterPayment = async (loanId: string) => {
        if(!user) return;
        const loan = loans.find(l => l.id === loanId);
        if (!loan || loan.status === LoanStatus.PAID) return;
        
        const newPaymentsMade = loan.paymentsMade + 1;
        const isPaidOff = newPaymentsMade >= loan.term;
        const newStatus = isPaidOff ? LoanStatus.PAID : LoanStatus.PENDING;

        try {
            await updateDoc(doc(getCollectionRef('loans'), loanId), { paymentsMade: newPaymentsMade, status: newStatus });
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