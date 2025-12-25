
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
    
    // Sort history chronologically before exporting
    const sortedHistory = [...(loan.paymentHistory || [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const rows = sortedHistory.map((p: PaymentRecord) => [
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

// --- NUEVAS VALIDACIONES Y FORMATEADORES ---

export const isValidDNI = (dni: string): boolean => {
    if (!dni) return false;
    const dniRegex = /^[XYZ]?\d{5,8}[A-Z]$/i;
    return dniRegex.test(dni.trim());
};

export const formatDNI = (value: string): string => {
    return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
};

export const isValidPhone = (phone: string): boolean => {
    if (!phone) return false;
    const cleanPhone = phone.replace(/[\s-]/g, '');
    return /^\d{9,15}$/.test(cleanPhone);
};

export const formatPhone = (value: string): string => {
    // Elimina todo lo que no sea número
    const clean = value.replace(/\D/g, '');
    // Formato simple XXX XXX XXX (para 9 dígitos)
    if (clean.length === 9) {
        return clean.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
    }
    return clean;
};

export const calculateLoanProgress = (loan: Loan): number => {
    if (!loan.initialCapital || loan.initialCapital <= 0) return 0;
    const paid = loan.initialCapital - loan.remainingCapital;
    const percent = (paid / loan.initialCapital) * 100;
    return Math.min(100, Math.max(0, percent));
};
