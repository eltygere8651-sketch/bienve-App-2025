import Dexie, { type Table } from 'dexie';
import type { Client, Loan, LoanRequest } from '../types';

export interface BmContigoDB extends Dexie {
    clients: Table<Client, string>;
    loans: Table<Loan, string>;
    requests: Table<LoanRequest, string>;
}

let dbInstance: BmContigoDB | null = null;

// Esta función inicializa la base de datos en la primera llamada y devuelve la instancia.
// En llamadas posteriores, devuelve la instancia ya creada.
const getDb = (): BmContigoDB => {
    if (dbInstance) {
        return dbInstance;
    }
    
    // Crea y configura la instancia de la base de datos.
    const db = new Dexie('bmContigoDB');

    // FIX: The property 'version' does not exist on type 'BmContigoDB'.
    // The cast to BmContigoDB was premature. We define the schema on the plain
    // Dexie instance first, then cast to our interface.
    db.version(1).stores({
        clients: 'id, name, idNumber', // Clave primaria 'id', e índices en 'name' y 'idNumber'
        loans: 'id, clientId, status', // Clave primaria 'id', e índices en 'clientId' y 'status'
        requests: 'id, idNumber, status' // Clave primaria 'id', e índices en 'idNumber' y 'status'
    });
    
    dbInstance = db as BmContigoDB;
    return dbInstance;
};

// --- GETTERS ---
export const getCachedClients = () => getDb().clients.toArray();
export const getCachedLoans = () => getDb().loans.toArray();
export const getCachedRequests = () => getDb().requests.toArray();

// --- SETTERS ---
export const cacheClients = (clients: Client[]) => getDb().clients.bulkPut(clients);
export const cacheLoans = (loans: Loan[]) => getDb().loans.bulkPut(loans);
export const cacheRequests = (requests: LoanRequest[]) => getDb().requests.bulkPut(requests);

// --- UTILS ---
export const clearAllCachedTables = () => {
    const db = getDb();
    return Promise.all([db.requests.clear(), db.clients.clear(), db.loans.clear()]);
};