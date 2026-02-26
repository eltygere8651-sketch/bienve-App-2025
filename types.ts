
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
    paymentMethod?: 'Efectivo' | 'Banco'; // Nuevo: Desglose de tesorería
}

export interface ReinvestmentRecord {
    id: string;
    date: string;
    amount: number;
    source: 'Banco' | 'Efectivo';
    notes?: string;
    createdAt: string;
    deducted?: boolean; // Added deducted field
}

export interface WithdrawalRecord {
    id: string;
    date: string;
    amount: number;
    source: 'Banco' | 'Efectivo';
    notes?: string;
    peñaPercentage?: number;
    peñaAmount?: number;
    createdAt: string;
}

export interface PersonalFund {
    id: string;
    name: string;
    icon: string; // key for icon mapping
    color: 'cyan' | 'purple' | 'emerald' | 'orange' | 'rose' | 'blue';
    currentAmount: number;
    goal: number;
    bankName: string;
    monthlyContribution: number;
    lastUpdated: string;
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
    archived?: boolean; // Nuevo: Flag para historial
}

export interface Client {
    id: string;
    name: string;
    joinDate: string;
    idNumber?: string;
    phone?: string;
    address?: string;
    email?: string;
    archived?: boolean; // Added for soft delete/archiving
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

export type AppView = 'welcome' | 'dashboard' | 'clients' | 'loanRequest' | 'requests' | 'receiptGenerator' | 'settings' | 'dataManagement' | 'auth' | 'newClient' | 'history' | 'accounting';

export type FilterStatus = LoanStatus | 'Todos';

export type NewClientData = Omit<Client, 'id' | 'joinDate'>;
export type NewLoanData = { amount: number; term: number };
