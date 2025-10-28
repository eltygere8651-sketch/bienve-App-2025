export enum LoanStatus {
    PENDING = 'Pendiente',
    PAID = 'Pagado',
    OVERDUE = 'Vencido',
}

export enum RequestStatus {
    PENDING = 'Pendiente',
    UNDER_REVIEW = 'En Estudio',
}

export interface Loan {
    id: string;
    clientId: string;
    clientName: string;
    amount: number;
    interestRate: number;
    term: number; // in months
    startDate: string;
    status: LoanStatus;
    monthlyPayment: number;
    totalRepayment: number;
    paymentsMade: number;
    isTestData?: boolean;
    signature?: string;
    contractPdf?: Blob;
}

export interface Client {
    id: string;
    name: string;
    joinDate: string;
    isTestData?: boolean;
}

export interface LoanRequest {
    id: string;
    fullName: string;
    idNumber: string;
    address: string;
    phone: string;
    email: string;
    loanAmount: number;
    loanReason: string;
    employmentStatus: string;
    contractType?: string;
    frontId: File | Blob;
    backId: File | Blob;
    referredBy?: string;
    requestDate: string;
    status: RequestStatus;
    isTestData?: boolean;
    signature?: string;
    contractPdf?: Blob;
}


export type AppView = 'dashboard' | 'clients' | 'loanRequest' | 'requests' | 'referrals' | 'adminLogin' | 'dataExplorer';