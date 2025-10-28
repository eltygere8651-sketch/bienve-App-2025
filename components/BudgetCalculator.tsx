import React, { useState, useMemo } from 'react';
import { PiggyBank, PieChart, Info } from 'lucide-react';
import { formatCurrency } from '../services/utils';

const BudgetCalculator: React.FC = () => {
    const [income, setIncome] = useState('');
    
    const budget = useMemo(() => {
        const numericIncome = parseFloat(income);
        if (isNaN(numericIncome) || numericIncome <= 0) {
            return null;
        }
        return {
            needs: numericIncome * 0.5,
            wants: numericIncome * 0.3,
            savings: numericIncome * 0.2,
        };
    }, [income]);
    
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md">
            <div className="flex items-center text-green-600 dark:text-green-400">
                <PiggyBank className="h-7 w-7 mr-3" />
                <h2 className="text-xl font-bold">Calculadora de Presupuesto Rápido</h2>
            </div>
             <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 flex items-center">
                <Info size={14} className="mr-2 flex-shrink-0" />
                Organiza tus finanzas con la regla 50/30/20.
             </p>

            <div className="mt-4">
                <label htmlFor="income" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Ingresos Mensuales (€)
                </label>
                <input
                    type="number"
                    id="income"
                    value={income}
                    onChange={(e) => setIncome(e.target.value)}
                    placeholder="Ej: 1500"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
            </div>
            
            {budget && (
                <div className="mt-6 animate-fade-in">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-200">Sugerencia de Presupuesto:</h3>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/50 rounded-lg">
                            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Necesidades (50%)</p>
                            <p className="text-xl font-bold text-blue-800 dark:text-blue-200">{formatCurrency(budget.needs)}</p>
                        </div>
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/50 rounded-lg">
                            <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Deseos (30%)</p>
                            <p className="text-xl font-bold text-purple-800 dark:text-purple-200">{formatCurrency(budget.wants)}</p>
                        </div>
                        <div className="p-4 bg-green-50 dark:bg-green-900/50 rounded-lg">
                            <p className="text-sm font-medium text-green-600 dark:text-green-400">Ahorros (20%)</p>
                            <p className="text-xl font-bold text-green-800 dark:text-green-200">{formatCurrency(budget.savings)}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BudgetCalculator;
