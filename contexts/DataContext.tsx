
import React, { createContext, useContext } from 'react';
import { useAppData } from '../hooks/useAppData';
import { useAppContext } from './AppContext';
import { Client, Loan, LoanRequest, RequestStatus, AccountingEntry, AppMeta, AccountingEntryType } from '../types';

interface ClientLoanData extends Client {
    loans: Loan[];
}

interface DataContextType {
    clients: Client[];
    loans: Loan[];
    requests: LoanRequest[];
    accountingEntries: AccountingEntry[];
    appMeta: AppMeta[];
    isLoading: boolean;
    error: string | null;
    clientLoanData: ClientLoanData[];
    handleLoanRequestSubmit: (requestData: Omit<LoanRequest, 'id' | 'requestDate' | 'status' | 'frontIdUrl' | 'backIdUrl'>, files: { frontId: File, backId: File }) => Promise<void>;
    handleApproveRequest: (request: LoanRequest, loanAmount: number, loanTerm: number) => Promise<void>;
    handleDenyRequest: (request: LoanRequest) => Promise<void>;
    handleUpdateRequestStatus: (requestId: number, status: RequestStatus) => Promise<void>;
    handleRegisterPayment: (loanId: string) => Promise<void>;
    handleAddAccountingEntry: (entry: { type: AccountingEntryType; description: string; amount: number; entry_date: string; }) => Promise<void>;
    handleSetCapital: (amount: number) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { showToast, user, isSchemaReady } = useAppContext();
    const appData = useAppData(showToast, user, isSchemaReady);

    return (
        <DataContext.Provider value={appData}>
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