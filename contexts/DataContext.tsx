import React, { createContext, useContext } from 'react';
import { useAppData } from '../hooks/useAppData';
import { useAppContext } from './AppContext';
import { Client, Loan, LoanRequest } from '../types';

interface ClientLoanData extends Client {
    loans: Loan[];
}

interface DataContextType {
    clients: Client[];
    loans: Loan[];
    requests: LoanRequest[];
    isLoading: boolean;
    error: string | null;
    clientLoanData: ClientLoanData[];
    handleLoanRequestSubmit: (request: Omit<LoanRequest, 'id' | 'requestDate' | 'status'>) => Promise<void>;
    handleApproveRequest: (requestId: string, loanAmount: number, loanTerm: number) => Promise<void>;
    handleDenyRequest: (requestId: string) => Promise<void>;
    handleUpdateRequestStatus: (requestId: string, status: any) => Promise<void>;
    handleRegisterPayment: (loanId: string) => Promise<void>;
    generateDummyData: () => Promise<void>;
    clearAllData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { showToast, showConfirmModal } = useAppContext();
    const appData = useAppData(showToast, showConfirmModal);

    return (
        <DataContext.Provider value={appData as DataContextType}>
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