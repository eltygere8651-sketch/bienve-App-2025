
import React, { createContext, useContext, useMemo } from 'react';
import { useAppData } from '../hooks/useAppData';
import { useAppContext } from './AppContext';
import { Client, Loan, LoanRequest, RequestStatus } from '../types';

interface ClientLoanData extends Client {
    loans: Loan[];
}

export type NewClientData = Omit<Client, 'id' | 'joinDate'>;
export type NewLoanData = { amount: number, term: number };

interface DataContextType {
    clients: Client[];
    archivedClients: Client[]; // Expose archived clients
    loans: Loan[]; // Active loans
    archivedLoans: Loan[]; // Historical loans
    requests: LoanRequest[];
    isLoading: boolean;
    error: string | null;
    clientLoanData: ClientLoanData[];
    handleLoanRequestSubmit: (requestData: Omit<LoanRequest, 'id' | 'requestDate' | 'status' | 'frontIdUrl' | 'backIdUrl'>, files: { frontId: string, backId: string }) => Promise<void>;
    handleApproveRequest: (request: LoanRequest, loanAmount: number, loanTerm: number) => Promise<void>;
    handleRejectRequest: (request: LoanRequest) => Promise<void>;
    handleUpdateRequestStatus: (requestId: string, status: RequestStatus) => Promise<void>;
    handleRegisterPayment: (loanId: string, amount: number, date: string, notes: string) => Promise<void>;
    handleUpdatePayment: (loanId: string, paymentId: string, newInterest: number, newAmount: number, newDate: string, newNotes: string) => Promise<void>; // New
    handleAddClientAndLoan: (clientData: NewClientData, loanData: NewLoanData) => Promise<void>;
    handleAddLoan: (clientId: string, clientName: string, loanData: { amount: number; term: number; interestRate: number; startDate: string; notes: string }) => Promise<void>;
    handleGenerateTestRequest: () => Promise<void>;
    handleDeleteTestRequests: () => Promise<void>;
    handleUpdateLoan: (loanId: string, updatedData: Partial<Loan>) => Promise<void>;
    handleDeleteLoan: (loanId: string, clientName: string) => Promise<void>;
    handleArchivePaidLoans: () => Promise<number>;
    handleArchiveClient: (clientId: string) => Promise<void>; 
    handleRestoreClient: (clientId: string) => Promise<void>; 
    handleBatchDeleteClients: (clientIds: string[]) => Promise<void>; 
    reloadRequests: () => Promise<void>;
    refreshAllData: () => Promise<void>; 
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { showToast, user, isConfigReady } = useAppContext();
    // CRITICAL FIX: Pass isConfigReady so subscriptions wait for Firebase initialization
    const appData = useAppData(showToast, user, isConfigReady);

    const value = useMemo(() => appData, [appData]);

    return (
        <DataContext.Provider value={value as unknown as DataContextType}>
            {children}
        </DataContext.Provider>
    );
};

export const useDataContext = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useDataContext must be used within a DataProvider');
    }
    return context;
};
