
// FIX: Refactored to initialize Dexie without subclassing to resolve type inheritance issues.
// This ensures that all Dexie methods like `version()` and `transaction()` are available on the `db` instance.
import Dexie, { type Table } from 'dexie';
import { Client, Loan, LoanRequest } from '../types';

export const db = new Dexie('bmContigoDatabase') as Dexie & {
    clients: Table<Client, string>;
    loans: Table<Loan, string>;
    requests: Table<LoanRequest, string>;
};

// Version 1: Initial schema
// The 'isTestData' index allows for efficient querying and clearing of test data.
db.version(1).stores({
    clients: 'id, name, isTestData',
    loans: 'id, clientId, status, isTestData',
    requests: 'id, status, isTestData',
});
