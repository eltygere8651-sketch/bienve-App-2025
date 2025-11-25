
import Dexie, { type Table } from 'dexie';
import type { Client, Loan, LoanRequest } from '../types';

export class BmContigoDB extends Dexie {
    clients!: Table<Client, string>;
    loans!: Table<Loan, string>;
    requests!: Table<LoanRequest, string>;

    constructor() {
        super('BmContigoDB');
        // Cast to any to avoid TS error about 'version' property in some environments
        (this as any).version(1).stores({
            clients: 'id, name, idNumber',
            loans: 'id, clientId, status',
            requests: 'id, idNumber, status, requestDate'
        });
    }
}

export const db = new BmContigoDB();

// --- HELPERS PARA IMÁGENES ---

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

// --- SERVICIOS DE DATOS ---

// Clientes
export const getClients = () => db.clients.toArray();
export const addClient = (client: Client) => db.clients.add(client);
export const updateClient = (id: string, updates: Partial<Client>) => db.clients.update(id, updates);

// Préstamos
export const getLoans = () => db.loans.toArray();
export const addLoan = (loan: Loan) => db.loans.add(loan);
export const updateLoan = (id: string, updates: Partial<Loan>) => db.loans.update(id, updates);
export const deleteLoan = (id: string) => db.loans.delete(id);

// Solicitudes
export const getRequests = () => db.requests.orderBy('requestDate').reverse().toArray();
export const addRequest = (request: LoanRequest) => db.requests.add(request);
export const updateRequest = (id: string, updates: Partial<LoanRequest>) => db.requests.update(id, updates);
export const deleteRequest = (id: string) => db.requests.delete(id);
export const findRequestsByIdNumber = (idNumber: string) => db.requests.where('idNumber').equals(idNumber).toArray();

// Backup & Restore
export const exportDatabase = async () => {
    const clients = await db.clients.toArray();
    const loans = await db.loans.toArray();
    const requests = await db.requests.toArray();
    return { clients, loans, requests };
};

export const clearDatabase = () => {
    return Promise.all([db.clients.clear(), db.loans.clear(), db.requests.clear()]);
};
