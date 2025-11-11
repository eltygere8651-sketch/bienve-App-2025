

export enum LoanStatus {
    PENDING = 'Pendiente',
    PAID = 'Pagado',
    OVERDUE = 'Vencido',
}

export enum RequestStatus {
    PENDING = 'Pendiente',
    UNDER_REVIEW = 'En Estudio',
    DENIED = 'Denegado',
    APPROVED = 'Aprobado',
}

export interface Loan {
    id: string;
    clientId: string;
    clientName: string;
    amount: number;
    interestRate: number; // Annual percentage rate
    term: number; // in months
    startDate: string;
    status: LoanStatus;
    monthlyPayment: number;
    totalRepayment: number;
    paymentsMade: number;
    signature?: string;
    contractPdfUrl?: string;
}

export interface Client {
    id: string;
    name: string;
    joinDate: string;
    idNumber?: string;
    phone?: string;
    address?: string;
    email?: string;
}

export interface LoanRequest {
    id: string;
    fullName: string;
    idNumber: string;
    address: string;
    phone: string;
    email?: string;
    loanAmount: number;
    loanReason: string;
    employmentStatus: string;
    contractType?: string;
    frontIdUrl: string;
    backIdUrl: string;
    requestDate: string;
    status: RequestStatus;
    signature?: string;
}

export type AppView = 'welcome' | 'dashboard' | 'clients' | 'loanRequest' | 'requests' | 'receiptGenerator' | 'settings' | 'dataManagement' | 'auth' | 'newClient' | 'requestStatus';

export type FilterStatus = LoanStatus | 'Todos';