import React, { useEffect, useState } from 'react';
import { useDataContext } from '../contexts/DataContext';
import { addDocument } from '../services/firebaseService';
import { TABLE_NAMES } from '../constants';
import { LoanStatus, PaymentRecord } from '../types';
import { useAppContext } from '../contexts/AppContext';

const SeedNurys: React.FC = () => {
    const { clients, archivedClients, loans, archivedLoans } = useDataContext();
    const { showToast } = useAppContext();
    const [done, setDone] = useState(false);

    useEffect(() => {
        if (done || (clients.length === 0 && archivedClients.length === 0)) return;
        
        const seed = async () => {
            try {
                // Find or create Nurys
                let clientId = '';
                const allClients = [...clients, ...archivedClients];
                const existing = allClients.find(c => c.name.toLowerCase().includes('nurys tolentino'));
                
                if (existing) {
                    clientId = existing.id;
                } else {
                    const clientData = {
                        name: 'Nurys Tolentino',
                        joinDate: new Date(Date.now() - 9 * 30 * 24 * 60 * 60 * 1000).toISOString(),
                        phone: '000000000',
                        archived: false
                    };
                    const res = await addDocument(TABLE_NAMES.CLIENTS, clientData);
                    clientId = res.id;
                }

                // Check if a loan already exists for this client to prevent duplication
                const allLoans = [...loans, ...archivedLoans];
                const existingLoan = allLoans.find(l => l.clientId === clientId && l.amount === 800);
                if (existingLoan) {
                    setDone(true);
                    return;
                }

                // Generate payments
                const payments: PaymentRecord[] = [];
                let currentDate = new Date(Date.now() - 9 * 30 * 24 * 60 * 60 * 1000);
                for (let i = 1; i <= 8; i++) {
                    currentDate = new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000);
                    payments.push({
                        id: 'pay_' + i,
                        date: currentDate.toISOString(),
                        amount: 100,
                        interestPaid: 100,
                        capitalPaid: 0,
                        remainingCapitalAfter: 800,
                        notes: `Pago mes ${i}`,
                        paymentMethod: 'Efectivo',
                        regularInterestPaid: 100,
                        pendingInterestPaid: 0
                    });
                }
                
                // Final payment
                currentDate = new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000);
                payments.push({
                    id: 'pay_9',
                    date: currentDate.toISOString(),
                    amount: 900,
                    interestPaid: 100,
                    capitalPaid: 800,
                    remainingCapitalAfter: 0,
                    notes: 'Liquidación total de deuda y rédito',
                    paymentMethod: 'Efectivo',
                    regularInterestPaid: 100,
                    pendingInterestPaid: 0
                });

                const loanData = {
                    clientId,
                    clientName: 'Nurys Tolentino',
                    amount: 800,
                    initialCapital: 800,
                    remainingCapital: 0,
                    interestRate: 12.5, // 100 is 12.5% of 800
                    term: 0,
                    startDate: new Date(Date.now() - 9 * 30 * 24 * 60 * 60 * 1000).toISOString(),
                    notes: 'Cliente con buen puntaje de confianza. Liquidado exitosamente.',
                    status: LoanStatus.PAID,
                    monthlyPayment: 100,
                    totalRepayment: 800,
                    paymentsMade: 9,
                    totalInterestPaid: 900,
                    totalCapitalPaid: 800,
                    paymentHistory: payments,
                    archived: true
                };

                await addDocument(TABLE_NAMES.LOANS, loanData);
                showToast('Historial de Nurys Tolentino añadido a Préstamos Cerrados', 'success');
                setDone(true);
            } catch (e) {
                console.error(e);
            }
        };
        seed();
    }, [clients, archivedClients, loans, archivedLoans, done, showToast]);

    return null;
};
export default SeedNurys;
