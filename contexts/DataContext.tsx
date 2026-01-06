
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
    archivedClients: Client[]; 
    loans: Loan[]; 
    archivedLoans: Loan[]; 
    requests: LoanRequest[];
    isLoading: boolean;
    error: string | null;
    clientLoanData: ClientLoanData[];
    hasMoreArchivedLoans: boolean;
    allHistoryLoaded: boolean;
    loadMoreRequests: () => void;
    loadMoreArchivedLoans: () => void;
    loadAllHistory: () => void;
    handleLoanRequestSubmit: (requestData: Omit<LoanRequest, 'id' | 'requestDate' | 'status' | 'frontIdUrl' | 'backIdUrl'>, files: { frontId: string, backId: string }) => Promise<void>;
    handleApproveRequest: (request: LoanRequest, loanAmount: number, loanTerm: number) => Promise<void>;
    handleRejectRequest: (request: LoanRequest) => Promise<void>;
    handleUpdateRequestStatus: (requestId: string, status: RequestStatus) => Promise<void>;
    handleRegisterPayment: (loanId: string, amount: number, date: string, notes: string, paymentMethod?: 'Efectivo' | 'Banco') => Promise<void>;
    handleUpdatePayment: (loanId: string, paymentId: string, newInterest: number, newAmount: number, newDate: string, newNotes: string) => Promise<void>; 
    handleBalanceCorrection: (loanId: string, newBalance: number, notes: string) => Promise<void>; 
    handleAddClientAndLoan: (clientData: NewClientData, loanData: NewLoanData) => Promise<void>;
    handleAddLoan: (clientId: string, clientName: string, loanData: { amount: number; term: number; interestRate: number; startDate: string; notes: string }) => Promise<void>;
    handleGenerateTestRequest: () => Promise<void>;
    handleGenerateTestClient: () => Promise<void>;
    handleDeleteTestRequests: () => Promise<void>;
    handleUpdateLoan: (loanId: string, updatedData: Partial<Loan>) => Promise<void>;
    handleUpdateClient: (clientId: string, updatedData: Partial<Client>) => Promise<void>;
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
    const appData = useAppData(showToast, user, isConfigReady);

    // Intercept handleRegisterPayment to add Treasury Logic with Test Exclusion
    const originalHandleRegisterPayment = appData.handleRegisterPayment;
    
    // We need to access getDocument and setDocument directly here or import them, 
    // but since useAppData is a hook, we should probably modify the logic inside useAppData 
    // or wrap it here. For simplicity and cleaner separation, we will re-implement the 
    // logic wrapper here if we can access the necessary imports, OR ideally, modify useAppData.
    // However, since we are in the Provider, we can't easily modify the internal hook logic without changing the hook file.
    // 
    // WAIT: The previous file `hooks/useAppData.ts` contained the logic. 
    // But the user prompt provided `contexts/DataContext.tsx` which IMPORTS `useAppData`.
    // I need to modify `hooks/useAppData.ts`? No, the prompt gave me `contexts/DataContext.tsx`.
    // Actually, the `useAppData` hook returns `handleRegisterPayment`.
    // I should modify `hooks/useAppData.ts` to include the logic change.
    // BUT the prompt asked to change the files provided.
    // I will verify if `hooks/useAppData.ts` is available to change. Yes, it was provided in the prompt.
    //
    // However, looking at the `DataContext.tsx` provided, it just passes `appData` through.
    // I will modify `hooks/useAppData.ts` instead as it contains the implementation.
    
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
