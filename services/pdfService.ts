
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Loan, Client, LoanRequest, PaymentRecord, ReinvestmentRecord, PersonalFund } from '../types';
import { LOCAL_STORAGE_KEYS } from '../constants';
import { formatCurrency } from './utils';
import { INTEREST_RATE_CONFIG } from '../config';
import { DEFAULT_CONTRACT_TEMPLATE } from './pdfTemplates';

interface ContractData {
    fullName: string;
    idNumber: string;
    address: string;
    loanAmount: number;
}


export const getContractText = (data: ContractData) => {
    const template = localStorage.getItem(LOCAL_STORAGE_KEYS.CONTRACT_TEMPLATE) || DEFAULT_CONTRACT_TEMPLATE;
    const today = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

    return template
        .replace(/\${fullName}/g, data.fullName)
        .replace(/\${idNumber}/g, data.idNumber)
        .replace(/\${address}/g, data.address)
        .replace(/\${loanAmount}/g, data.loanAmount.toLocaleString('es-ES'))
        .replace(/\${today}/g, today)
        .replace(/\${interestRate}/g, INTEREST_RATE_CONFIG.MONTHLY.toFixed(2));
};


export const generateContractPDF = async (data: ContractData, signatureImage: string | null): Promise<Blob> => {
    const doc = new jsPDF();
    const contractText = getContractText(data);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("CONTRATO DE PRÉSTAMO ENTRE PARTICULARES", 105, 20, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    
    const splitText = doc.splitTextToSize(contractText, 170);
    doc.text(splitText, 20, 35);

    if (signatureImage) {
        const lastTextY = 35 + (splitText.length * 3.5); 
        const signatureY = Math.max(lastTextY + 15, 210);
        
        if (signatureY > 260) {
            doc.addPage();
            const newSignatureY = 40;
            
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            
            doc.text("Firma del Prestatario (Cliente):", 20, newSignatureY);
            doc.addImage(signatureImage, 'PNG', 20, newSignatureY + 5, 50, 25);
            
            doc.text("Firma del Prestamista:", 120, newSignatureY);
            doc.setFont("helvetica", "italic");
            doc.text("Bienvenido N. Feliz T.", 120, newSignatureY + 15);
            doc.text("18476199T", 120, newSignatureY + 20);
        } else {
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            
            doc.text("Firma del Prestatario (Cliente):", 20, signatureY);
            doc.addImage(signatureImage, 'PNG', 20, signatureY + 5, 50, 25);
            
            doc.text("Firma del Prestamista:", 120, signatureY);
            doc.setFont("helvetica", "italic");
            doc.text("Bienvenido N. Feliz T.", 120, signatureY + 15);
            doc.text("18476199T", 120, signatureY + 20);
        }
    } else {
        const lastTextY = 35 + (splitText.length * 3.5);
        const signatureY = Math.max(lastTextY + 20, 220);
        
        doc.line(20, signatureY + 20, 80, signatureY + 20);
        doc.text("Firma del Prestatario", 20, signatureY + 25);
        
        doc.line(120, signatureY + 20, 180, signatureY + 20);
        doc.text("Firma del Prestamista", 120, signatureY + 25);
    }

    return doc.output('blob');
};

export const generateMasterBackupPDF = (
    clients: Client[], 
    loans: Loan[], 
    payments: PaymentRecord[], 
    reinvestments: ReinvestmentRecord[], 
    funds: PersonalFund[],
    requests: LoanRequest[],
    mode: 'download' | 'share' = 'download'
) => {
    const doc = new jsPDF();
    const activeLoans = loans.filter(l => l.status !== 'Pagado' && !l.archived);
    const totalOutstanding = activeLoans.reduce((acc, l) => acc + l.remainingCapital, 0);
    const generationDate = new Date().toLocaleString('es-ES', { 
        day: 'numeric', month: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    // --- PAGE 1: CLIENT DIRECTORY ---
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.rect(0, 0, 210, 42, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.text("COPIA DE SEGURIDAD MAESTRA", 14, 22);
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Resumen Diario y Directorio de Activos", 14, 32);
    
    doc.setFontSize(10);
    doc.setTextColor(200, 200, 200);
    doc.text(`Generado el: ${generationDate}`, 196, 22, { align: 'right' });
    
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text(`Total Cartera Activa: ${formatCurrency(totalOutstanding)}`, 196, 32, { align: 'right' });

    // 1. CLIENT DIRECTORY (Now Page 1)
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.text("Directorio Unificado de Clientes", 14, 55);

    const clientRows = clients.filter(c => !c.archived).sort((a, b) => a.name.localeCompare(b.name)).map(c => [
        c.name.toUpperCase(),
        c.idNumber || '-',
        c.phone || '-',
        c.email || '-',
        c.address || '-',
        new Date(c.joinDate).toLocaleDateString('es-ES')
    ]);

    (doc as any).autoTable({
        startY: 60,
        head: [['Nombre Completo', 'ID/DNI', 'Teléfono', 'Email', 'Dirección', 'Alta']],
        body: clientRows,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        styles: { 
            fontSize: 8,
            cellPadding: 3,
            overflow: 'linebreak',
            rowPageBreak: 'avoid'
        },
        columnStyles: {
            0: { cellWidth: 40, fontStyle: 'bold' },
            5: { halign: 'center' }
        },
        margin: { left: 14, right: 14, bottom: 25 }
    });

    // --- PAGE 2: ACTIVE LOANS & REINVESTMENTS ---
    doc.addPage();
    let lastY = 20;

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Deudas Activas y Préstamos Vigentes", 14, lastY);

    const loanRows = activeLoans.map(l => [
        l.clientName.toUpperCase(),
        new Date(l.startDate).toLocaleDateString('es-ES'),
        formatCurrency(l.initialCapital || l.amount),
        formatCurrency(l.remainingCapital),
        'Pendiente',
        l.lastPaymentDate ? new Date(l.lastPaymentDate).toLocaleDateString('es-ES') : 'N/A'
    ]);

    (doc as any).autoTable({
        startY: lastY + 5,
        head: [['Cliente', 'Fecha Inicio', 'Monto Inicial', 'Pendiente', 'Estado', 'Últ. Pago']],
        body: loanRows,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 8.5, cellPadding: 2.5 },
        columnStyles: {
            3: { fontStyle: 'bold', textColor: [185, 28, 28] }, // Red for balance
            5: { halign: 'center' }
        }
    });

    // REINVESTMENTS (Follows Active Loans)
    lastY = (doc as any).lastAutoTable.finalY + 15;
    if (lastY > 230) { doc.addPage(); lastY = 20; }

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Reinversiones de Cartera", 14, lastY);

    const reinvestRows = reinvestments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(r => [
        new Date(r.date).toLocaleDateString('es-ES'),
        formatCurrency(r.amount),
        r.source,
        r.notes || '-'
    ]);

    (doc as any).autoTable({
        startY: lastY + 5,
        head: [['Fecha', 'Monto', 'Fuente', 'Notas']],
        body: reinvestRows,
        theme: 'striped',
        headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 8.5, cellPadding: 2.5 }
    });

    // --- PAGE 3: PERSONAL FUNDS ---
    doc.addPage();
    lastY = 20;
    
    // ANEXO Header
    doc.setFillColor(14, 165, 233); // Sky 500
    doc.rect(0, 0, 210, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("ANEXO: GESTIÓN DE FINANZAS PERSONALES Y TESORERÍA", 105, 10, { align: 'center' });
    
    lastY = 30;
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Estado de Cajas y Fondos de Ahorro", 14, lastY);

    const fundRows = funds.map(f => [
        f.name,
        f.bankName,
        formatCurrency(f.currentAmount),
        formatCurrency(f.goal),
        new Date(f.lastUpdated).toLocaleDateString('es-ES')
    ]);

    (doc as any).autoTable({
        startY: lastY + 5,
        head: [['Nombre Gasto/Fondo', 'Banco/Ubicación', 'Saldo Actual', 'Meta', 'Últ. Act.']],
        body: fundRows,
        theme: 'striped',
        headStyles: { fillColor: [14, 165, 233], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 8.5, cellPadding: 2.5 }
    });

    // Global Footer with Page Numbers
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        // Footer Bar
        doc.setFillColor(30, 41, 59);   // Dark for page 1 (Directory)
        if (i === 2) doc.setFillColor(79, 70, 229); // Indigo for page 2 (Loans)
        if (i === 3) doc.setFillColor(14, 165, 233); // Sky for page 3 (Funds)
        doc.rect(0, 292, 210, 5, 'F');

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(`Copia Maestra B.M Contigo - Seguridad Blindada - Página ${i} de ${pageCount}`, 105, 287, { align: 'center' });
    }

    const filename = `Backup_Maestro_${new Date().toISOString().split('T')[0]}.pdf`;
    const blob = doc.output('blob');

    if (mode === 'share') {
        sharePdf(blob, filename);
    } else {
        downloadPdf(blob, filename);
    }
};


export const triggerDownload = (pdfBlob: Blob, filename: string) => {
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
};

let isSharingInProgress = false;

export const downloadPdf = (pdfBlob: Blob, filename: string) => {
    triggerDownload(pdfBlob, filename);
};

export const sharePdf = async (pdfBlob: Blob, filename: string): Promise<boolean> => {
    if (isSharingInProgress) {
        return false;
    }
    isSharingInProgress = true;

    try {
        const file = new File([pdfBlob], filename, { type: 'application/pdf' });
        
        // Check if Web Share API with files is supported
        if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                // Share ONLY the single PDF file to prevent duplicate messages or double receipts on WhatsApp
                await navigator.share({
                    files: [file],
                    title: filename
                });
                return true;
            } catch (error: any) {
                // User explicitly aborted or closed share sheet - DO NOT trigger duplicate download
                if (error && (error.name === 'AbortError' || error.message?.includes('abort'))) {
                    return false;
                }
                console.warn('Native share failed, downloading as fallback:', error);
                downloadPdf(pdfBlob, filename);
                return true;
            }
        } else {
            // Fallback for desktop or environments without Web Share API file support: single download
            downloadPdf(pdfBlob, filename);
            return true;
        }
    } finally {
        setTimeout(() => {
            isSharingInProgress = false;
        }, 600);
    }
};

export const sharePaymentReceipt = async (
    data: ReceiptData,
    signatureImage?: string,
    mode: 'share' | 'download' = 'share'
): Promise<boolean> => {
    const doc = generatePaymentReceiptPdf(data, signatureImage);
    const filename = `Recibo_${data.clientName.replace(/\s+/g, '_')}_${new Date(data.paymentDate).toISOString().split('T')[0]}.pdf`;
    const blob = doc.output('blob');

    if (mode === 'download') {
        downloadPdf(blob, filename);
        return true;
    }

    return await sharePdf(blob, filename);
};

// --- CLIENT REPORTS ---

export const generateClientReport = (client: Client, loans: Loan[]) => {
    const doc = new jsPDF();

    // Brand Header
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("B.M CONTIGO", 15, 25);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Ficha Financiera de Cliente", 150, 25);

    // Client Info Box
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(15, 50, 180, 35, 3, 3, 'FD');

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(client.name, 20, 60);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`DNI/NIE: ${client.idNumber || 'N/A'}`, 20, 68);
    doc.text(`Teléfono: ${client.phone || 'N/A'}`, 20, 74);
    doc.text(`Dirección: ${client.address || 'N/A'}`, 20, 80);
    doc.text(`Miembro desde: ${new Date(client.joinDate).toLocaleDateString()}`, 130, 68);

    // Calculate Totals
    const activeLoans = loans.filter(l => l.status !== 'Pagado');
    const totalActiveDebt = activeLoans.reduce((acc, l) => acc + l.remainingCapital, 0);
    const totalPaidInterest = loans.reduce((acc, l) => acc + l.totalInterestPaid, 0);

    // Summary Cards representation in PDF
    doc.setFillColor(240, 240, 240);
    doc.rect(15, 95, 85, 20, 'F'); // Debt Box
    doc.rect(110, 95, 85, 20, 'F'); // Interest Box

    doc.setFontSize(9);
    doc.text("DEUDA ACTIVA TOTAL", 20, 102);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 38, 38); // Red
    doc.text(totalActiveDebt.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }), 20, 110);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("TOTAL INTERESES PAGADOS", 115, 102);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(22, 163, 74); // Green
    doc.text(totalPaidInterest.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }), 115, 110);

    // Loans Table
    doc.setTextColor(0,0,0);
    doc.setFontSize(11);
    doc.text("Detalle de Préstamos", 15, 130);

    (doc as any).autoTable({
        startY: 135,
        head: [['Fecha Inicio', 'Capital Inicial', 'Capital Pendiente', 'Estado', 'Interés Generado']],
        body: loans.map(l => [
            new Date(l.startDate).toLocaleDateString(),
            formatCurrency(l.initialCapital || l.amount),
            formatCurrency(l.remainingCapital),
            l.status,
            formatCurrency(l.totalInterestPaid)
        ]),
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42], textColor: 255 }, // Dark header
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
            2: { fontStyle: 'bold', textColor: [100, 0, 0] } // Highlight remaining capital
        }
    });
    
    const pageCount = doc.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Página ${i} de ${pageCount} - Generado el ${new Date().toLocaleDateString()}`, 105, 290, { align: 'center' });
    }

    downloadPdf(doc.output('blob'), `Ficha_${client.name.replace(/\s/g, '_')}.pdf`);
};

export const generateFullClientListPDF = (clientsWithLoans: { name: string; idNumber?: string; phone?: string; loans: Loan[] }[]) => {
    const doc = new jsPDF();

    // Brand Header
    doc.setFillColor(30, 41, 59); // Slate 800
    doc.rect(0, 0, 210, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("B.M CONTIGO", 14, 18);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Informe Global de Cartera", 14, 25);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 195, 18, { align: 'right' });

    // Prepare data
    const rows = clientsWithLoans.map(c => {
        const activeDebt = c.loans.reduce((acc, l) => acc + l.remainingCapital, 0);
        const activeLoansCount = c.loans.filter(l => l.status !== 'Pagado').length;
        
        return {
            name: c.name,
            id: c.idNumber || '-',
            phone: c.phone || '-',
            loans: activeLoansCount,
            debt: activeDebt
        };
    });

    // Sort by debt descending (Most important first)
    rows.sort((a, b) => b.debt - a.debt);

    // Table
    (doc as any).autoTable({
        startY: 45,
        head: [['Cliente', 'DNI/NIE', 'Teléfono', 'Prést. Activos', 'Deuda Total']],
        body: rows.map(r => [
            r.name,
            r.id,
            r.phone,
            r.loans,
            r.debt.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
        ]),
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229], textColor: 255 }, // Indigo Header
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
            0: { fontStyle: 'bold' },
            4: { fontStyle: 'bold', halign: 'right', textColor: [50, 50, 50] }
        },
        didParseCell: function(data: any) {
            // Highlight high debt rows
            if (data.section === 'body' && data.column.index === 4) {
                const val = parseFloat(data.cell.raw.replace(/[^0-9,-]+/g,"").replace(",","."));
                if (val > 0) {
                    data.cell.styles.textColor = [220, 38, 38]; // Red
                }
            }
        }
    });

    // Summary Box at bottom
    const totalPortfolioDebt = rows.reduce((acc, r) => acc + r.debt, 0);

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(120, finalY, 75, 25, 2, 2, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.roundedRect(120, finalY, 75, 25, 2, 2, 'D');

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("TOTAL CARTERA PENDIENTE", 125, finalY + 8);
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(totalPortfolioDebt.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }), 125, finalY + 18);

    downloadPdf(doc.output('blob'), `Cartera_Global_${new Date().toISOString().split('T')[0]}.pdf`);
};

interface ReceiptData {
    clientName: string;
    loanId: string;
    paymentAmount: number;
    paymentType: string;
    paymentDate: string;
    notes: string;
    previousBalance: number;
    newBalance: number;
    interestPaid?: number; // Optional: Desglose explícito de interés
    capitalPaid?: number;  // Optional: Desglose explícito de capital
    showInterestCovered?: boolean;
    interestRate?: number; // Tasa de interés mensual (ej: 8%)
    nextPeriodInterest?: number; // Interés calculado para el período (8%)
    totalLiquidation?: number; // Monto para cancelar préstamo (Capital + 8%)
}

export const generatePaymentReceiptPdf = (data: ReceiptData, signatureImage?: string): jsPDF => {
    const doc = new jsPDF({
        orientation: 'l',
        unit: 'mm',
        format: 'a5'
    });

    const generationDate = new Date().toLocaleDateString('es-ES');
    const amountString = formatCurrency(data.paymentAmount);

    // Deep clean notes - removing any trace of automated messages
    let displayNotes = data.notes || '';
    displayNotes = displayNotes
        .replace(/\(Mes actual:.*?\)/g, '')
        .replace(/\(Saldó.*?vencido\)/g, '')
        .replace(/Mes actual:\s*[0-9.]+/gi, '')
        .replace(/Saldó.*?vencido/gi, '')
        .trim();

    // --- Background Base ---
    doc.setFillColor(253, 252, 255); 
    doc.rect(0, 0, 210, 148, 'F');

    // --- 1. COMPACT PREMIUM HEADER (18mm) ---
    doc.setFillColor(49, 46, 129); // Rich Dark Indigo (#312e81)
    doc.rect(0, 0, 210, 18, 'F');
    
    // Bottom Gold Accent Line on header
    doc.setFillColor(245, 158, 11); // Amber/Gold (#f59e0b)
    doc.rect(0, 17.2, 210, 0.8, 'F');
    
    // Brand Name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('B.M CONTIGO', 15, 11.5);
    
    // Subtitle
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(199, 210, 254);
    doc.text('Garantía de Confianza y Transparencia', 15, 15.5);

    // Receipt Badge (Right)
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('RECIBO DE PAGO', 195, 11, { align: 'right' });
    
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(251, 191, 36); // Gold badge text
    doc.text('COMPROBANTE OFICIAL & DIGITAL', 195, 15.5, { align: 'right' });
    
    // --- 2. COMPACT CLIENT & PAYMENT INFO (y: 22 to 43) ---
    // Client Name
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENTE', 15, 24.5);
    
    doc.setFontSize(12);
    doc.setTextColor(30, 27, 75); // Indigo 950
    doc.setFont('helvetica', 'bold');
    doc.text(data.clientName.toUpperCase(), 15, 30.5);

    // Concept
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.text('CONCEPTO DE PAGO', 15, 36);
    
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    doc.text(data.paymentType, 15, 40.5);

    // Date & Loan ID (Middle column)
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text('FECHA DE EMISIÓN', 98, 24.5);
    
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(generationDate, 98, 30.5);

    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('REF. OPERACIÓN', 98, 36);
    
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(data.loanId ? `#${data.loanId.slice(-8).toUpperCase()}` : '#DIRECTO', 98, 40.5);

    // Compact Total Abonado Card (Right)
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(79, 70, 229);
    doc.setLineWidth(0.4);
    doc.roundedRect(150, 21.5, 45, 20.5, 2, 2, 'FD');
    
    doc.setTextColor(79, 70, 229);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL ABONADO', 172.5, 27, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(30, 27, 75);
    doc.text(amountString, 172.5, 36.5, { align: 'center' });

    // Subtle divider
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(15, 44, 195, 44);

    // --- 3. DETAILS TABLE & LIQUIDATION VALUES ---
    const monthlyRate = data.interestRate 
        ? (data.interestRate > 20 ? data.interestRate / 12 : data.interestRate) 
        : 8;
    const nextInterest = data.nextPeriodInterest !== undefined 
        ? data.nextPeriodInterest 
        : (data.newBalance > 0 ? (data.newBalance * (monthlyRate / 100)) : 0);
    const liquidationTotal = data.totalLiquidation !== undefined 
        ? data.totalLiquidation 
        : (data.newBalance > 0 ? (data.newBalance + nextInterest) : 0);

    const tableBody: any[] = [
        ['SALDO ANTERIOR', formatCurrency(data.previousBalance)],
    ];

    if (data.interestPaid !== undefined && data.capitalPaid !== undefined) {
        tableBody.push(['PAGO DE INTERESES', data.showInterestCovered ? 'CUBIERTO' : formatCurrency(data.interestPaid)]);
        tableBody.push(['AMORTIZACIÓN CAPITAL', formatCurrency(data.capitalPaid)]);
    }

    if (data.newBalance > 0) {
        tableBody.push(['CAPITAL PENDIENTE', formatCurrency(data.newBalance)]);
        tableBody.push([`INTERÉS PRÓX. PERÍODO (${monthlyRate}%)`, formatCurrency(nextInterest)]);
        tableBody.push(['TOTAL PARA LIQUIDACIÓN', formatCurrency(liquidationTotal)]);
    } else {
        tableBody.push(['CAPITAL PENDIENTE', '0,00 €']);
        tableBody.push(['ESTADO DEL PRÉSTAMO', 'TOTALMENTE LIQUIDADO']);
    }

    (doc as any).autoTable({
        startY: 46.5,
        margin: { left: 15, right: 15 },
        body: tableBody,
        theme: 'plain',
        tableWidth: 110, 
        styles: { 
            fontSize: 7.5, 
            cellPadding: 1.5, 
            textColor: [71, 85, 105],
            font: 'helvetica'
        },
        columnStyles: { 
            0: { cellWidth: 54 },
            1: { fontStyle: 'bold', halign: 'right', textColor: [30, 41, 59] } 
        },
        didParseCell: (d: any) => {
            const raw = d.row.cells[0]?.raw;
            if (raw === 'CAPITAL PENDIENTE') {
                d.cell.styles.fillColor = [241, 245, 249];
                d.cell.styles.textColor = [30, 41, 59];
                d.cell.styles.fontStyle = 'bold';
            } else if (raw && String(raw).startsWith('INTERÉS PRÓX.')) {
                d.cell.styles.fillColor = [254, 243, 199];
                d.cell.styles.textColor = [180, 83, 9];
                d.cell.styles.fontStyle = 'bold';
            } else if (raw === 'TOTAL PARA LIQUIDACIÓN') {
                d.cell.styles.fillColor = [238, 242, 255];
                d.cell.styles.textColor = [79, 70, 229];
                d.cell.styles.fontStyle = 'bold';
                d.cell.styles.fontSize = 8.5;
            } else if (raw === 'ESTADO DEL PRÉSTAMO') {
                d.cell.styles.fillColor = [220, 252, 231];
                d.cell.styles.textColor = [22, 101, 52];
                d.cell.styles.fontStyle = 'bold';
                d.cell.styles.fontSize = 8.5;
            }
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 68;

    // --- 4. SIGNATURE OR CERTIFICATION BADGE (Right column, aligned with table) ---
    if (signatureImage) {
        doc.addImage(signatureImage, 'PNG', 142, 47, 45, 15);
        doc.setFontSize(6);
        doc.setTextColor(148, 163, 184);
        doc.text('Firma Digital Autorizada', 164.5, 65, { align: 'center' });
    } else {
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.roundedRect(138, 47, 57, 19, 1.5, 1.5, 'FD');

        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(22, 101, 52);
        doc.text('✓ TRANSACCIÓN VERIFICADA', 166.5, 53.5, { align: 'center' });

        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('Documento oficial registrado en', 166.5, 58, { align: 'center' });
        doc.text('el sistema de gestión B.M Contigo', 166.5, 62, { align: 'center' });
    }

    // --- 5. INTEGRATED DISCLAIMER BOX (Same single sheet, compact & elegant) ---
    const noticeY = Math.max(finalY + 2.5, 71);
    
    if (data.newBalance > 0) {
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225); // Slate 300
        doc.setLineWidth(0.3);
        doc.roundedRect(15, noticeY, 180, 15, 1.5, 1.5, 'FD');

        // Decorative indigo bar on the left of notice
        doc.setFillColor(79, 70, 229);
        doc.rect(15, noticeY, 1.5, 15, 'F');

        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(67, 56, 202);
        doc.text('CONDICIONES OFICIALES DE CANCELACIÓN Y LIQUIDACIÓN:', 19, noticeY + 4.2);

        doc.setFontSize(5.8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        const noticeMsg = `El importe de "Capital Pendiente" refleja únicamente el capital principal adeudado. Para cancelar o liquidar en su totalidad el préstamo en cualquier momento, el cliente debe abonar dicho Capital Pendiente más el interés del ${monthlyRate}% correspondiente al período (${formatCurrency(nextInterest)}), siendo el Total Oficial para Liquidar de ${formatCurrency(liquidationTotal)}. Los pagos parciales se aplican prioritariamente a intereses devengados.`;
        const splitMsg = doc.splitTextToSize(noticeMsg, 172);
        doc.text(splitMsg, 19, noticeY + 8);
    } else {
        doc.setFillColor(240, 253, 244);
        doc.setDrawColor(187, 247, 208);
        doc.setLineWidth(0.3);
        doc.roundedRect(15, noticeY, 180, 14, 1.5, 1.5, 'FD');

        doc.setFillColor(22, 101, 52);
        doc.rect(15, noticeY, 1.5, 14, 'F');

        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(22, 101, 52);
        doc.text('ESTADO DEL CRÉDITO: PRÉSTAMO CANCELADO EN SU TOTALIDAD', 19, noticeY + 5);

        doc.setFontSize(5.8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(21, 128, 61);
        doc.text('Este documento digital certifica formalmente que no existen importes ni intereses pendientes por este préstamo.', 19, noticeY + 9.5);
    }

    // Optional user note
    if (displayNotes) {
        doc.setFontSize(6);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(148, 163, 184);
        const sn = doc.splitTextToSize(`Nota: ${displayNotes}`, 180);
        doc.text(sn, 15, noticeY + 19);
    }

    // Bottom signatures & acknowledgments
    doc.setFontSize(7.5);
    doc.setTextColor(67, 56, 202);
    doc.setFont('helvetica', 'bold');
    doc.text('Gracias por su confianza y puntualidad.', 195, 102, { align: 'right' });
    
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('Recibo digital oficial B.M CONTIGO - Emitido por sistema.', 15, 102);

    // Bottom Decorative Bar
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 145, 210, 3, 'F');

    // STRICT GUARANTEE: Remove any accidentally created second page so it is ALWAYS exactly 1 single sheet
    while (doc.getNumberOfPages() > 1) {
        doc.deletePage(doc.getNumberOfPages());
    }

    return doc;
};

export const generatePaymentReceipt = (data: ReceiptData, signatureImage?: string) => {
    const doc = generatePaymentReceiptPdf(data, signatureImage);
    const filename = `Recibo_${data.clientName.replace(/\s/g, '_')}_${new Date(data.paymentDate).toISOString().split('T')[0]}.pdf`;
    downloadPdf(doc.output('blob'), filename);
};


export const generateRequestSummaryPDF = (request: LoanRequest) => {
    const doc = new jsPDF();
    
    // --- PAGE 1: SUMMARY ---

    // Title
    doc.setFontSize(18);
    doc.text(`Resumen de Solicitud`, 105, 20, { align: 'center' });
    doc.setFontSize(11);
    doc.text(`Fecha de Solicitud: ${new Date(request.requestDate).toLocaleString('es-ES')}`, 15, 30);
    doc.text(`Estado: ${request.status}`, 195, 30, { align: 'right' });
    doc.setLineWidth(0.5);
    doc.line(15, 35, 195, 35);

    // Client Data Section
    doc.setFontSize(14);
    doc.text('Datos del Solicitante', 15, 45);
    (doc as any).autoTable({
        startY: 50,
        head: [['Concepto', 'Información']],
        body: [
            ['Nombre Completo', request.fullName],
            ['DNI/NIE', request.idNumber],
            ['Dirección', request.address],
            ['Teléfono', request.phone],
            ['Email', request.email || 'No proporcionado'],
        ],
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] },
    });

    // Loan Details Section
    let lastY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(14);
    doc.text('Detalles del Préstamo', 15, lastY + 15);
    const loanDetailsBody = [
        ['Monto Solicitado', formatCurrency(request.loanAmount)],
        ['Motivo', request.loanReason],
        ['Situación Laboral', request.employmentStatus],
    ];
    if (request.contractType) {
        loanDetailsBody.push(['Tipo de Contrato', request.contractType]);
    }
    (doc as any).autoTable({
        startY: lastY + 20,
        head: [['Concepto', 'Información']],
        body: loanDetailsBody,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] },
    });
    
    // --- PAGE 2: CONTRACT ---
    doc.addPage();
    
    const contractData = {
        fullName: request.fullName,
        idNumber: request.idNumber,
        address: request.address,
        loanAmount: request.loanAmount,
    };
    const contractText = getContractText(contractData);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Contrato de Préstamo Aceptado", 105, 20, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const splitText = doc.splitTextToSize(contractText, 170);
    doc.text(splitText, 20, 35);

    if (request.signature) {
        const lastTextY = 35 + (splitText.length * 3.5);
        let signatureY = Math.max(lastTextY + 10, 220); 

        // Check for overflow
        if (signatureY > 260) {
            doc.addPage();
            signatureY = 40;
        }

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Firma del Prestatario (Cliente):", 20, signatureY);
        try {
            doc.addImage(request.signature, 'PNG', 20, signatureY + 5, 60, 30);
        } catch (e) {
            console.error("Could not add signature image to PDF:", e);
            doc.text("[Error al cargar la firma]", 20, signatureY + 15);
        }
    }

    downloadPdf(doc.output('blob'), `Solicitud_${request.fullName.replace(/\s/g, '_')}.pdf`);
};

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const generateIdDocumentsPDF = async (request: LoanRequest) => {
    const doc = new jsPDF();

    const addImageToPage = (docInstance: jsPDF, imageData: string, title: string) => {
        const imgProps = docInstance.getImageProperties(imageData);
        const pdfWidth = docInstance.internal.pageSize.getWidth();
        const pdfHeight = docInstance.internal.pageSize.getHeight();
        const margin = 15;
        const maxWidth = pdfWidth - margin * 2;
        const maxHeight = pdfHeight - margin * 2 - 40;

        const ratio = Math.min(maxWidth / imgProps.width, maxHeight / imgProps.height);
        const imgWidth = imgProps.width * ratio;
        const imgHeight = imgProps.height * ratio;

        const x = (pdfWidth - imgWidth) / 2;
        const y = 40;

        docInstance.setFontSize(16);
        docInstance.text(title, pdfWidth / 2, 20, { align: 'center' });
        docInstance.addImage(imageData, imgProps.fileType, x, y, imgWidth, imgHeight);
    };

    try {
        const [frontResponse, backResponse] = await Promise.all([
            fetch(request.frontIdUrl),
            fetch(request.backIdUrl)
        ]);

        if (!frontResponse.ok || !backResponse.ok) {
            throw new Error('Failed to fetch one or both ID images.');
        }

        const [frontBlob, backBlob] = await Promise.all([
            frontResponse.blob(),
            backResponse.blob()
        ]);
        
        const [frontBase64, backBase64] = await Promise.all([
            blobToBase64(frontBlob),
            blobToBase64(backBlob)
        ]);
        
        addImageToPage(doc, frontBase64, `Documento de Identidad (Anverso) - ${request.fullName}`);

        doc.addPage();
        addImageToPage(doc, backBase64, `Documento de Identidad (Reverso) - ${request.fullName}`);

        downloadPdf(doc.output('blob'), `DNI_${request.fullName.replace(/\s/g, '_')}.pdf`);
    } catch (error) {
        console.error("Error generating ID PDF:", error);
        throw new Error("Could not fetch images to generate PDF.");
    }
};

export const generateLoanHistoryPDF = (loan: Loan, showInterestCovered: boolean = false) => {
    const doc = new jsPDF();

    // Header
    const headerTitle = showInterestCovered ? "Historial de Pagos (Interés Cubierto)" : "Historial de Pagos";
    
    doc.setFillColor(30, 41, 59); // Slate 800
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("B.M CONTIGO", 14, 18);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(headerTitle, 195, 18, { align: 'right' });

    // Loan Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Cliente: ${loan.clientName}`, 14, 40);
    doc.text(`ID Préstamo: ${loan.id}`, 14, 46);
    doc.text(`Fecha Inicio: ${new Date(loan.startDate).toLocaleDateString()}`, 14, 52);
    
    doc.text(`Monto Inicial: ${formatCurrency(loan.initialCapital || loan.amount)}`, 130, 40);
    doc.text(`Total Interés Pagado: ${showInterestCovered ? 'Interés Cubierto' : formatCurrency(loan.totalInterestPaid)}`, 130, 46);
    doc.setFont("helvetica", "bold");
    doc.text(`Saldo Pendiente: ${formatCurrency(loan.remainingCapital)}`, 130, 52);

    // Payments Table
    const history = [...(loan.paymentHistory || [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    (doc as any).autoTable({
        startY: 60,
        head: [['Fecha', 'Monto Pagado', 'Interés', 'Capital', 'Nuevo Saldo', 'Notas']],
        body: history.map(p => [
            new Date(p.date).toLocaleDateString(),
            formatCurrency(p.amount),
            showInterestCovered ? 'Interés Cubierto' : formatCurrency(p.interestPaid),
            formatCurrency(p.capitalPaid),
            formatCurrency(p.remainingCapitalAfter),
            p.notes || '-'
        ]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }, // Blue header
        styles: { fontSize: 9 },
        columnStyles: {
            4: { fontStyle: 'bold' }
        }
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Generado el ${new Date().toLocaleString()}`, 14, 290);
        doc.text(`Página ${i} de ${pageCount}`, 195, 290, { align: 'right' });
    }

    downloadPdf(doc.output('blob'), `Historial_${loan.clientName.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generateDebtReportPDF = (loan: Loan, client: Client, mode: 'download' | 'share' = 'download') => {
    const doc = new jsPDF();
    const generationDate = new Date().toLocaleDateString('es-ES', { 
        day: 'numeric', month: 'long', year: 'numeric' 
    });

    const overdueItems = (loan.overdueHistory || []).filter(h => h.status === 'pendiente');
    const totalOverdue = overdueItems.reduce((acc, curr) => acc + curr.amount, 0);

    // Header
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.rect(0, 0, 210, 45, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("B.M CONTIGO", 20, 25);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text("ESTADO DE CUENTA Y REPORTE DE DEUDA", 20, 35);
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(`Fecha de Emisión: ${generationDate}`, 190, 25, { align: 'right' });

    // Client section
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("DATOS DEL CLIENTE", 20, 60);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Nombre: ${client.name}`, 20, 68);
    doc.text(`Identificación: ${client.idNumber || 'N/A'}`, 20, 74);
    doc.text(`Dirección: ${client.address || 'N/A'}`, 20, 80);
    doc.text(`Teléfono: ${client.phone || 'N/A'}`, 20, 86);

    // Financial Summary
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(20, 95, 170, 40, 3, 3, 'FD');

    doc.setFont("helvetica", "bold");
    doc.text("RESUMEN DE SALDOS", 25, 105);
    
    doc.setFont("helvetica", "normal");
    doc.text("Capital Pendiente:", 25, 115);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(loan.remainingCapital), 185, 115, { align: 'right' });
    
    doc.setFont("helvetica", "normal");
    doc.text("Intereses en Mora / Pendientes:", 25, 122);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 38, 38); // Red
    doc.text(formatCurrency(totalOverdue), 185, 122, { align: 'right' });

    doc.setFillColor(15, 23, 42);
    doc.rect(25, 127, 160, 0.2, 'F');

    doc.setTextColor(15, 23, 42);
    doc.text("TOTAL PARA LIQUIDAR:", 25, 133);
    doc.setFontSize(14);
    doc.text(formatCurrency(loan.remainingCapital + totalOverdue), 185, 133, { align: 'right' });

    // Detailed Table if overdue exists
    if (overdueItems.length > 0) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("DETALLE DE INTERESES PENDIENTES", 20, 150);

        (doc as any).autoTable({
            startY: 155,
            head: [['Periodo (Mes/Año)', 'Concepto', 'Monto de Interés']],
            body: overdueItems.map(item => [
                `${item.monthName} ${item.year}`,
                'Interés Mensual Vencido',
                formatCurrency(item.amount)
            ]),
            theme: 'striped',
            headStyles: { fillColor: [15, 23, 42], textColor: 255 },
            styles: { fontSize: 10, cellPadding: 4 }
        });
    } else {
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(71, 85, 105);
        doc.text("Su cuenta se encuentra al día con los intereses informativos.", 20, 150);
    }

    // Footer
    const lastY = (doc as any).lastAutoTable?.finalY || 160;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    const footerText = "Por favor, contacta con nosotros para cualquier duda o para registrar su pago. Gracias por su confianza.";
    const splitFooter = doc.splitTextToSize(footerText, 170);
    doc.text(splitFooter, 20, lastY + 20);

    doc.setFontSize(8);
    doc.text(`Documento generado electrónicamente por B.M Contigo - ${generationDate}`, 105, 285, { align: 'center' });

    const filename = `Reporte_Deuda_${client.name.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    const blob = doc.output('blob');

    if (mode === 'share') {
        sharePdf(blob, filename);
    } else {
        downloadPdf(blob, filename);
    }
};
