import React, { useEffect, useState } from 'react';
import { useDataContext } from '../contexts/DataContext';
import { updateDocument } from '../services/firebaseService';
import { TABLE_NAMES } from '../constants';
import { LoanStatus } from '../types';

const CleanFutureLoans: React.FC = () => {
    const { loans } = useDataContext();
    const [done, setDone] = useState(false);

    useEffect(() => {
        if (done || loans.length === 0) return;

        const cleanup = async () => {
            try {
                const now = new Date();
                
                // Find all loans where the start date is in the future
                const futureLoans = loans.filter(loan => {
                    const startDate = new Date(loan.startDate);
                    return startDate.getTime() > now.getTime();
                });

                for (const loan of futureLoans) {
                    let needsUpdate = false;
                    const updatePayload: any = {};

                    // Clear overdue history if any
                    if (loan.overdueHistory && loan.overdueHistory.length > 0) {
                        updatePayload.overdueHistory = [];
                        needsUpdate = true;
                    }

                    // Clear pending interest
                    if (loan.pendingInterest && loan.pendingInterest > 0) {
                        updatePayload.pendingInterest = 0;
                        updatePayload.pendingInterestDetails = '';
                        needsUpdate = true;
                    }

                    // Clear lastPaymentDate if it was accidentally set (like from a perdonar action)
                    if (loan.lastPaymentDate) {
                        const lastPayment = new Date(loan.lastPaymentDate);
                        const start = new Date(loan.startDate);
                        // If lastPaymentDate is BEFORE the start date, or it's just wrong
                        if (lastPayment.getTime() < start.getTime()) {
                             updatePayload.lastPaymentDate = null;
                             needsUpdate = true;
                        }
                    }
                    
                    // Reset status to pending if it's somehow OVERDUE
                    if (loan.status === LoanStatus.OVERDUE) {
                        updatePayload.status = LoanStatus.PENDING;
                        needsUpdate = true;
                    }

                    if (needsUpdate) {
                        console.log(`Cleaning up future loan ${loan.id} for client ${loan.clientName}`);
                        await updateDocument(TABLE_NAMES.LOANS, loan.id, updatePayload);
                    }
                }
                
                setDone(true);
            } catch (e) {
                console.error("Error cleaning up future loans:", e);
            }
        };

        cleanup();
    }, [loans, done]);

    return null;
};

export default CleanFutureLoans;
