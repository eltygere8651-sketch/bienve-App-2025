
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

export interface PaymentRecord {
    id: string;
    date: string;
    amount: number;
    interestPaid: number;
    capitalPaid: number;
    remainingCapitalAfter: number;
    notes?: string;
    daysElapsed?: number; // Nuevo: Para registro histórico
}

export interface Loan {
    id: string;
    clientId: string;
    clientName: string;
    amount: number; // Capital Inicial
    initialCapital: number; // Explicit Capital Inicial for clarity
    remainingCapital: number; // Capital Pendiente
    interestRate: number; // Annual percentage rate
    term: number; // in months
    startDate: string;
    lastPaymentDate?: string; // Nuevo: Fecha del último pago o inicio para cálculo de intereses
    status: LoanStatus;
    monthlyPayment: number; // Cuota estimada (referencia)
    totalRepayment: number; // Total estimado
    paymentsMade: number; // Contador de pagos
    totalInterestPaid: number;
    totalCapitalPaid: number;
    paymentHistory: PaymentRecord[];
    signature?: string;
    contractPdfUrl?: string;
    notes?: string;
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
