import { useState, useEffect, useMemo } from 'react';
import { Client, Loan, LoanRequest, LoanStatus, RequestStatus } from '../types';
import { generateWelcomeMessage } from '../services/geminiService';
import { INTEREST_RATE_CONFIG } from '../config';
import { db, storage, getPathFromUrl } from '../services/firebaseService';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, writeBatch, query } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { User } from 'firebase/auth';

const getCollectionRef = (collectionName: string) => {
    if (!db) {
        throw new Error("Firestore is not initialized.");
    }
    return collection(db, collectionName);
}

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
    
    useEffect(() => {
        // Guard: Ensure Firebase services are initialized and user is logged in before proceeding.
        if (!user || !db || !storage) {
            setClients([]);
            setLoans([]);
            setRequests([]);
            // Only set loading to false if we are not expecting a user. If user is null but auth is loading, we wait.
            if (!user) { 
                setIsLoading(false);
            }
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
                setError(`No se pudieron cargar los datos de ${collectionName}. Por favor, revisa tu conexión y los permisos de Firestore.`);
                setIsLoading(false);
            });
        });

        return () => unsubscribes.forEach(unsub => unsub());

    }, [user]);


    const handleLoanRequestSubmit = async (requestData: Omit<LoanRequest, 'id' | 'requestDate' | 'status' | 'frontIdUrl' | 'backIdUrl'>, files: { frontId: File, backId: File }) => {
        if (!storage || !db) throw new Error("Firebase services not initialized.");
        const requestId = `req-${Date.now()}`;
        const frontIdPath = `requests/${requestId}/frontId_${files.frontId.name}`;
        const backIdPath = `requests/${requestId}/backId_${files.backId.name}`;
    
        try {
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
            
            await addDoc(getCollectionRef('requests'), newRequest);
        } catch (err) {
            console.error("Failed to submit loan request:", err);
            showToast('Error al enviar la solicitud.', 'error');
            throw err;
        }
    };
    
    const handleApproveRequest = async (request: LoanRequest, loanAmount: number, loanTerm: number) => {
        if (!user || !db || !storage) {
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
            
            const contractPath = `contracts/${user.uid}/contract-${request.id}.pdf`;
            const contractRef = ref(storage, contractPath);
            await uploadBytes(contractRef, contractPdfBlob);
            const contractPdfUrl = await getDownloadURL(contractRef);

            const batch = writeBatch(db);

            const newClient: Omit<Client, 'id'> = {
                name: request.fullName,
                joinDate: new Date().toISOString(),
            };
            const clientRef = doc(getCollectionRef('clients'));
            batch.set(clientRef, newClient);

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

            const requestRef = doc(getCollectionRef('requests'), request.id);
            batch.delete(requestRef);

            await batch.commit();

            // Cleanup storage files after successful approval
            try {
                const frontIdPath = getPathFromUrl(request.frontIdUrl);
                if (frontIdPath) await deleteObject(ref(storage, frontIdPath));

                const backIdPath = getPathFromUrl(request.backIdUrl);
                if (backIdPath) await deleteObject(ref(storage, backIdPath));
            } catch (storageError) {
                console.warn("Could not clean up request files from Storage:", storageError);
            }

            const welcomeMessage = await generateWelcomeMessage(newClient.name);
            showToast(`Préstamo Aprobado para ${newClient.name}`, 'success');
            showToast(welcomeMessage, 'info');

        } catch (err) {
            console.error("Failed to approve request:", err);
            showToast('Error al aprobar el préstamo.', 'error');
            throw err;
        }
    };
    
    const handleDenyRequest = async (request: LoanRequest) => {
        if(!user || !db || !storage) {
            showToast('Acción no autorizada o servicios no disponibles.', 'error');
            return;
        }
        try {
            await deleteDoc(doc(getCollectionRef('requests'), request.id));
            
            // Cleanup storage files after successful deletion
            try {
                const frontIdPath = getPathFromUrl(request.frontIdUrl);
                if (frontIdPath) await deleteObject(ref(storage, frontIdPath));

                const backIdPath = getPathFromUrl(request.backIdUrl);
                if (backIdPath) await deleteObject(ref(storage, backIdPath));
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
        if(!user || !db) {
            showToast('Acción no autorizada o servicios no disponibles.', 'error');
            return;
        }
        try {
            await updateDoc(doc(getCollectionRef('requests'), requestId), { status });
            showToast(`Solicitud actualizada a "${status}".`, 'info');
        } catch (err) {
            console.error("Failed to update request status:", err);
            showToast('Error al actualizar el estado.', 'error');
            throw err;
        }
    };
    
    const handleRegisterPayment = async (loanId: string) => {
        if(!user || !db) {
            showToast('Acción no autorizada o servicios no disponibles.', 'error');
            return;
        }
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