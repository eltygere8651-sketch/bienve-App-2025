
import React, { createContext, useContext, useMemo } from 'react';
import { useAppData } from '../hooks/useAppData';
import { useAppContext } from './AppContext';
import { Client, Loan, LoanRequest, RequestStatus, NewClientData, NewLoanData, ReinvestmentRecord, PersonalFund, WithdrawalRecord } from '../types';

interface ClientLoanData extends Client {
    loans: Loan[];
}

interface DataContextType {
    clients: Client[];
    archivedClients: Client[]; 
    loans: Loan[]; 
    archivedLoans: Loan[]; 
    requests: LoanRequest[];
    reinvestments: ReinvestmentRecord[]; // New
    funds: PersonalFund[];
    withdrawals: WithdrawalRecord[];
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
    handleRegisterReinvestment: (amount: number, source: 'Banco' | 'Efectivo', notes: string, date: string, deductFromTreasury: boolean) => Promise<void>; // Updated
    handleDeleteReinvestment: (id: string) => Promise<void>; // New
    handleSaveFund: (fundData: PersonalFund) => Promise<void>;
    handleDeleteFund: (id: string) => Promise<void>;
    handleRegisterWithdrawal: (amount: number, source: 'Banco' | 'Efectivo', notes: string, date: string, peñaPercentage: number) => Promise<void>;
    reloadRequests: () => Promise<void>;
    refreshAllData: () => Promise<void>; 
    recalculateTreasury: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { showToast, user, isConfigReady } = useAppContext();
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
