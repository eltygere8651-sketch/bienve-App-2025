export const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
};
