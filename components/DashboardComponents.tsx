
import React from 'react';
import { ThumbsUp, Clock, AlertTriangle } from 'lucide-react';
import { LoanStatus } from '../types';

export const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; change?: string; changeType?: 'increase' | 'decrease' }> = ({ title, value, icon, change, changeType }) => (
    <div className="glass-card p-6 rounded-2xl relative overflow-hidden group transition-all hover:-translate-y-1 bg-slate-800/60 border border-white/5">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity scale-150 transform translate-x-2 -translate-y-2">
            {icon}
        </div>
        <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-white/5 rounded-xl text-primary-400 ring-1 ring-white/10">
                    {icon}
                </div>
            </div>
            <p className="text-3xl font-heading font-bold text-white tracking-tight">{value}</p>
            <p className="text-sm text-slate-400 font-medium mt-1">{title}</p>
            
            {change && (
                <div className={`text-xs flex items-center mt-3 font-medium ${changeType === 'increase' ? 'text-emerald-400' : 'text-red-400'}`}>
                    <span className="mr-1">{changeType === 'increase' ? '↑' : '↓'}</span>
                    {change}
                </div>
            )}
        </div>
    </div>
);

export const StatusBadge: React.FC<{ status: LoanStatus }> = ({ status }) => {
    const baseClasses = "px-2.5 py-0.5 text-xs font-bold rounded-full inline-flex items-center ring-1 ring-inset whitespace-nowrap";
    switch (status) {
        case LoanStatus.PAID:
            return <span className={`${baseClasses} bg-emerald-500/10 text-emerald-400 ring-emerald-500/20`}><ThumbsUp size={12} className="mr-1"/> {status}</span>;
        case LoanStatus.PENDING:
            return <span className={`${baseClasses} bg-primary-500/10 text-primary-400 ring-primary-500/20`}><Clock size={12} className="mr-1"/> {status}</span>;
        case LoanStatus.OVERDUE:
            return <span className={`${baseClasses} bg-red-500/10 text-red-400 ring-red-500/20`}><AlertTriangle size={12} className="mr-1"/> {status}</span>;
        default:
            return null;
    }
};
