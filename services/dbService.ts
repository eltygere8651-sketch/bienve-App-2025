import { Dexie, type Table } from 'dexie';
import { Client, Loan, LoanRequest } from '../types';

export class AppDatabase extends Dexie {
    clients!: Table<Client, string>;
    loans!: Table<Loan, string>;
    requests!: Table<LoanRequest, string>;

    constructor() {
        super('bmContigoDatabase');
        this.version(2).stores({
            clients: 'id, name, isTestData',
            loans: 'id, clientId, status, isTestData',
            requests: 'id, status, isTestData',
        }).upgrade(tx => {
            // This upgrade function is empty because we are just adding non-indexed properties.
            // Dexie handles adding new properties to existing objects automatically.
            // This version bump is to ensure schema awareness for new properties like signature and contractPdf.
            return tx.table('requests').toCollection().modify(req => {
                if (!req.signature) req.signature = undefined;
                if (!req.contractPdf) req.contractPdf = undefined;
            });
        });
        
        // Fallback for initial creation
        this.version(1).stores({
            clients: 'id, name, joinDate, isTestData',
            loans: 'id, clientId, clientName, status, startDate, isTestData',
            requests: 'id, fullName, requestDate, status, isTestData',
        });
    }
}

export const db = new AppDatabase();