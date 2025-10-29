// Fix: Changed Dexie import to a default import to ensure proper type inheritance for subclassing.
import Dexie from 'dexie';
import type { Table } from 'dexie';
import { Client, Loan, LoanRequest } from '../types';

export class AppDatabase extends Dexie {
    clients!: Table<Client, string>;
    loans!: Table<Loan, string>;
    requests!: Table<LoanRequest, string>;

    constructor() {
        super('bmContigoDatabase');

        // Version 1: Initial schema
        // The 'isTestData' index allows for efficient querying and clearing of test data.
        this.version(1).stores({
            clients: 'id, name, isTestData',
            loans: 'id, clientId, status, isTestData',
            requests: 'id, status, isTestData',
        });
    }
}

export const db = new AppDatabase();