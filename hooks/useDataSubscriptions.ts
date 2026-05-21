
import { useState, useEffect } from 'react';
import { 
    subscribeToCollection, 
    query, 
    where, 
    orderBy 
} from '../services/firebaseService';
import { TABLE_NAMES } from '../constants';
import { Client, Loan, LoanRequest, ReinvestmentRecord, PersonalFund, WithdrawalRecord, LoanStatus } from '../types';

export const useDataSubscriptions = (user: any, isConfigReady: boolean, showToast: (msg: string, type: 'success' | 'error' | 'info') => void) => {
    const [clients, setClients] = useState<Client[]>([]);
    const [archivedClients, setArchivedClients] = useState<Client[]>([]);
    const [loans, setLoans] = useState<Loan[]>([]);
    const [archivedLoans, setArchivedLoans] = useState<Loan[]>([]);
    const [requests, setRequests] = useState<LoanRequest[]>([]);
    const [reinvestments, setReinvestments] = useState<ReinvestmentRecord[]>([]);
    const [funds, setFunds] = useState<PersonalFund[]>([]);
    const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user || !isConfigReady) {
            setClients([]);
            setArchivedClients([]);
            setLoans([]);
            setArchivedLoans([]);
            setRequests([]);
            setReinvestments([]);
            setFunds([]);
            setWithdrawals([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        // Safety timeout to prevent infinite cargando state
        const safetyTimeout = setTimeout(() => {
            setIsLoading((loading) => {
                if (loading) {
                    console.warn("Data subscription timeout reached, forcing load resolution");
                }
                return false;
            });
        }, 6000);

        const handleSubError = (collectionName: string, err: any) => {
            console.error(`Error loading collection ${collectionName}:`, err);
            setError(`Error cargando ${collectionName}: ${err.message || err.code || String(err)}`);
            setIsLoading(false);
        };

        const unsubscribers = [
            subscribeToCollection(TABLE_NAMES.CLIENTS, (data) => {
                setClients(data.filter(c => !c.archived));
                setArchivedClients(data.filter(c => c.archived));
                setIsLoading(false);
            }, [orderBy('name', 'asc')], (err) => handleSubError(TABLE_NAMES.CLIENTS, err)),

            subscribeToCollection(TABLE_NAMES.LOANS, (data) => {
                setLoans(data.filter(l => l.status !== LoanStatus.PAID && !l.archived));
                setArchivedLoans(data.filter(l => l.status === LoanStatus.PAID || l.archived));
            }, [], (err) => handleSubError(TABLE_NAMES.LOANS, err)),

            subscribeToCollection(TABLE_NAMES.REQUESTS, (data) => {
                setRequests(data);
            }, [orderBy('requestDate', 'desc')], (err) => handleSubError(TABLE_NAMES.REQUESTS, err)),

            subscribeToCollection(TABLE_NAMES.REINVESTMENTS, (data) => {
                setReinvestments(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            }, [], (err) => handleSubError(TABLE_NAMES.REINVESTMENTS, err)),

            subscribeToCollection(TABLE_NAMES.PERSONAL_FUNDS, (data) => {
                setFunds(data);
            }, [], (err) => handleSubError(TABLE_NAMES.PERSONAL_FUNDS, err)),

            subscribeToCollection(TABLE_NAMES.WITHDRAWALS, (data) => {
                setWithdrawals(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            }, [], (err) => handleSubError(TABLE_NAMES.WITHDRAWALS, err))
        ];

        return () => {
            clearTimeout(safetyTimeout);
            unsubscribers.forEach(unsub => unsub());
        };
    }, [user, isConfigReady]);

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
        setClients,
        setLoans,
        setRequests,
        setReinvestments,
        setFunds,
        setWithdrawals,
        setIsLoading,
        setError,
        setArchivedLoans
    };
};
