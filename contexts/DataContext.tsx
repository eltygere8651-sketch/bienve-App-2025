
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
    loans: Loan[];
    requests: LoanRequest[];
    isLoading: boolean;
    error: string | null;
    clientLoanData: ClientLoanData[];
    handleLoanRequestSubmit: (requestData: Omit<LoanRequest, 'id' | 'requestDate' | 'status' | 'frontIdUrl' | 'backIdUrl'>, files: { frontId: string, backId: string }) => Promise<void>;
    handleApproveRequest: (request: LoanRequest, loanAmount: number, loanTerm: number) => Promise<void>;
    handleRejectRequest: (request: LoanRequest) => Promise<void>;
    handleUpdateRequestStatus: (requestId: string, status: RequestStatus) => Promise<void>;
    handleRegisterPayment: (loanId: string, amount: number, date: string, notes: string) => Promise<void>;
    handleAddClientAndLoan: (clientData: NewClientData, loanData: NewLoanData) => Promise<void>;
    handleAddLoan: (clientId: string, clientName: string, loanData: { amount: number; term: number; interestRate: number; startDate: string; notes: string }) => Promise<void>;
    handleGenerateTestRequest: () => Promise<void>;
    handleDeleteTestRequests: () => Promise<void>;
    handleUpdateLoan: (loanId: string, updatedData: Partial<Loan>) => Promise<void>;
    handleDeleteLoan: (loanId: string, clientName: string) => Promise<void>;
    reloadRequests: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { showToast, user } = useAppContext();
    const appData = useAppData(showToast, user);

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
