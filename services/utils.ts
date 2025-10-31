export const formatCurrency = (amount: number | null | undefined): string => {
    // Check if the amount is a valid number. If not, default to 0.
    if (typeof amount !== 'number' || !isFinite(amount)) {
        return (0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
    }
    return amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
};