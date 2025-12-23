
import { PaymentRecord, Loan } from "../types";

export const formatCurrency = (amount: number | null | undefined): string => {
    // Check if the amount is a valid number. If not, default to 0.
    if (typeof amount !== 'number' || !isFinite(amount)) {
        return (0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
    }
    return amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
};

export const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.6): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                
                // Convertir a JPEG comprimido (Base64)
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};

export const exportLoanToCSV = (loan: Loan) => {
    const headers = ['Fecha', 'Monto Total', 'Interés Pagado', 'Capital Amortizado', 'Capital Pendiente', 'Notas'];
    
    const rows = loan.paymentHistory.map((p: PaymentRecord) => [
        new Date(p.date).toLocaleDateString('es-ES'),
        p.amount.toFixed(2),
        p.interestPaid.toFixed(2),
        p.capitalPaid.toFixed(2),
        p.remainingCapitalAfter.toFixed(2),
        `"${p.notes || ''}"`
    ]);

    const csvContent = [
        `Cliente: ${loan.clientName}`,
        `Préstamo ID: ${loan.id}`,
        `Capital Inicial: ${loan.initialCapital}`,
        `Estado: ${loan.status}`,
        '',
        headers.join(','),
        ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Historial_${loan.clientName.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
