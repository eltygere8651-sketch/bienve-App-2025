import { Dexie, type Table } from 'dexie';
import { Client, Loan, LoanRequest } from '../types';

export class AppDatabase extends Dexie {
    clients!: Table<Client, string>;
    loans!: Table<Loan, string>;
    requests!: Table<LoanRequest, string>;

    constructor() {
        super('bmContigoDatabase');

        // Version 1: Initial schema
        this.version(1).stores({
            clients: 'id, name, isTestData',
            loans: 'id, clientId, status, isTestData',
            requests: 'id, status, isTestData',
        });

        // Version 2: Added signature and contractPdf to requests and loans.
        // Dexie handles adding new properties automatically, but we bump the version
        // to make the schema aware of these new, non-indexed properties.
        this.version(2).stores({
             // No schema changes for indexed fields, just declaring the new version.
             // This is correct as we only need to add non-indexed properties.
        });
    }
}

export const db = new AppDatabase();