import React, { useState, useMemo } from 'react';
import { Target, Calendar, Info } from 'lucide-react';
import { formatCurrency } from '../services/utils';

const SavingsGoalCalculator: React.FC = () => {
    const [goalAmount, setGoalAmount] = useState('');
    const [monthlyContribution, setMonthlyContribution] = useState('');

    const calculation = useMemo(() => {
        const goal = parseFloat(goalAmount);
        const contribution = parseFloat(monthlyContribution);

        if (isNaN(goal) || isNaN(contribution) || goal <= 0 || contribution <= 0) {
            return null;
        }

        const months = Math.ceil(goal / contribution);
        const years = Math.floor(months / 12);
        const remainingMonths = months % 12;

        return {
            months,
            years,
            remainingMonths,
        };
    }, [goalAmount, monthlyContribution]);
    
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md">
            <div className="flex items-center text-rose-600 dark:text-rose-400">
                <Target className="h-7 w-7 mr-3" />
                <h2 className="text-xl font-bold">Calculadora de Metas de Ahorro</h2>
            </div>
             <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 flex items-center">
                <Info size={14} className="mr-2 flex-shrink-0" />
                Planifica cuánto tiempo te tomará alcanzar tu meta de ahorro.
             </p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                     <label htmlFor="goalAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Meta de Ahorro (€)
                    </label>
                    <input
                        type="number"
                        id="goalAmount"
                        value={goalAmount}
                        onChange={(e) => setGoalAmount(e.target.value)}
                        placeholder="Ej: 5000"
                        className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-rose-500 focus:border-rose-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                </div>
                 <div>
                     <label htmlFor="monthlyContribution" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Aporte Mensual (€)
                    </label>
                    <input
                        type="number"
                        id="monthlyContribution"
                        value={monthlyContribution}
                        onChange={(e) => setMonthlyContribution(e.target.value)}
                        placeholder="Ej: 200"
                        className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-rose-500 focus:border-rose-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                </div>
            </div>
            
            {calculation && (
                <div className="mt-6 animate-fade-in text-center bg-rose-50 dark:bg-rose-900/50 p-4 rounded-lg">
                     <Calendar size={24} className="mx-auto text-rose-500" />
                    <p className="mt-2 text-gray-700 dark:text-gray-200">
                        Te tomará aproximadamente
                    </p>
                    <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                         {calculation.years > 0 && `${calculation.years} año${calculation.years > 1 ? 's' : ''}`}
                         {calculation.years > 0 && calculation.remainingMonths > 0 && ' y '}
                         {calculation.remainingMonths > 0 && `${calculation.remainingMonths} mes${calculation.remainingMonths > 1 ? 'es' : ''}`}
                         {calculation.years === 0 && calculation.remainingMonths === 0 && `${calculation.months} meses`}
                    </p>
                    <p className="text-gray-700 dark:text-gray-200">
                        alcanzar tu meta de <strong className="font-semibold">{formatCurrency(parseFloat(goalAmount))}</strong>.
                    </p>
                </div>
            )}
        </div>
    );
};

export default SavingsGoalCalculator;