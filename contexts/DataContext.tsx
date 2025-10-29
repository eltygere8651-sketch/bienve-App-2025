import React, { createContext, useContext } from 'react';
import { useAppData } from '../hooks/useAppData';
import { useAppContext } from './AppContext';
import { Client, Loan, LoanRequest, RequestStatus } from '../types';

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
    handleLoanRequestSubmit: (requestData: Omit<LoanRequest, 'id' | 'requestDate' | 'status' | 'frontIdUrl' | 'backIdUrl'>, files: { frontId: File, backId: File }) => Promise<void>;
    handleApproveRequest: (request: LoanRequest, loanAmount: number, loanTerm: number) => Promise<void>;
    handleDenyRequest: (request: LoanRequest) => Promise<void>;
    handleUpdateRequestStatus: (requestId: string, status: RequestStatus) => Promise<void>;
    handleRegisterPayment: (loanId: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { showToast, showConfirmModal, user } = useAppContext();
    const appData = useAppData(showToast, showConfirmModal, user);

    const value: DataContextType = {
        ...appData,
        handleLoanRequestSubmit: appData.handleLoanRequestSubmit as any,
        handleDenyRequest: appData.handleDenyRequest as any,
    };


    return (
        <DataContext.Provider value={value}>
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