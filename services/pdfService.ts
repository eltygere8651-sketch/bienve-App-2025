import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Loan, Client } from '../types';
import { INTEREST_RATE_CONFIG } from '../config';
import { LOCAL_STORAGE_KEYS } from '../constants';

interface ContractData {
    fullName: string;
    idNumber: string;
    address: string;
    loanAmount: number;
}

const blobToDataURL = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target?.result as string);
        reader.onerror = e => reject(reader.error);
        reader.readAsDataURL(blob);
    });

export const DEFAULT_CONTRACT_TEMPLATE = `CONTRATO DE PRÉSTAMO DE DINERO

En la fecha de \${today}, entre:

PRESTAMISTA: Bienvenido Neftali feliz tolentino con DNI 18476199T, en adelante "EL PRESTAMISTA".

PRESTATARIO:
Nombre: \${fullName}
DNI/NIE: \${idNumber}
Dirección: \${address}
en adelante, "EL PRESTATARIO".

CLÁUSULAS:

1. OBJETO DEL CONTRATO: EL PRESTAMISTA entrega a EL PRESTATARIO la suma de \${loanAmount} EUROS (€), en calidad de préstamo.

2. INTERESES: El préstamo devengará un interés fijo del \${interestRate}% mensual capitalizable.

3. PLAZO Y DEVOLUCIÓN: EL PRESTATARIO se compromete a devolver el capital más los intereses generados en cuotas mensuales, según el plan de pagos que se establecerá al momento de la aprobación final del préstamo.

4. INCUMPLIMIENTO: La falta de pago de una de las cuotas en la fecha pactada dará lugar a la aplicación de intereses de demora y facultará a EL PRESTAMISTA a exigir la devolución total del saldo pendiente.

5. ACEPTACIÓN: EL PRESTATARIO declara haber leído y comprendido todas las cláusulas del presente contrato, y lo acepta de plena conformidad, comprometiéndose a su estricto cumplimiento. La aceptación digital de este documento tiene la misma validez que una firma manuscrita.
`;

export const getContractText = (data: ContractData) => {
    const template = localStorage.getItem(LOCAL_STORAGE_KEYS.CONTRACT_TEMPLATE) || DEFAULT_CONTRACT_TEMPLATE;
    const today = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    const interestRate = INTEREST_RATE_CONFIG.MONTHLY;

    return template
        .replace(/\$\{fullName\}/g, data.fullName)
        .replace(/\$\{idNumber\}/g, data.idNumber)
        .replace(/\$\{address\}/g, data.address)
        .replace(/\$\{loanAmount\}/g, data.loanAmount.toLocaleString('es-ES'))
        .replace(/\$\{today\}/g, today)
        .replace(/\$\{interestRate\}/g, interestRate.toString());
};


export const generateContractPDF = async (data: ContractData, signatureImage: string | null): Promise<Blob> => {
    const doc = new jsPDF();
    const contractText = getContractText(data);

    doc.setFontSize(16);
    doc.text("Contrato de Préstamo", 105, 20, { align: 'center' });

    doc.setFontSize(11);
    const splitText = doc.splitTextToSize(contractText, 180);
    doc.text(splitText, 15, 35);

    if (signatureImage) {
        const lastTextY = 35 + (splitText.length * 5.5);
        const signatureY = Math.max(lastTextY + 15, 220);
        doc.text("Firma del Prestatario:", 15, signatureY);
        doc.addImage(signatureImage, 'PNG', 15, signatureY + 5, 60, 30);
    }

    return doc.output('blob');
};

export const downloadPdf = (pdfBlob: Blob, filename: string) => {
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export const generateClientReport = (client: Client, loans: Loan[]) => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text(`Informe de Cliente: ${client.name}`, 105, 20, { align: 'center' });
    doc.setFontSize(11);
    doc.text(`ID Cliente: ${client.id}`, 15, 30);
    doc.text(`Fecha de Alta: ${new Date(client.joinDate).toLocaleDateString()}`, 15, 36);

    (doc as any).autoTable({
        startY: 50,
        head: [['ID Préstamo', 'Fecha Inicio', 'Monto (€)', 'Plazo (m)', 'Estado', 'Pagos']],
        body: loans.map(l => [
            l.id.substring(l.id.length - 6),
            new Date(l.startDate).toLocaleDateString(),
            l.amount.toLocaleString('es-ES'),
            l.term,
            l.status,
            `${l.paymentsMade}/${l.term}`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] },
    });
    
    doc.save(`Informe_${client.name.replace(/\s/g, '_')}.pdf`);
};

export const generateIdPdf = async (frontIdBlob: Blob, backIdBlob: Blob, clientName: string) => {
    const doc = new jsPDF();
    const frontUrl = await blobToDataURL(frontIdBlob);
    const backUrl = await blobToDataURL(backIdBlob);

    doc.setFontSize(16);
    doc.text(`Documento de Identidad - ${clientName}`, 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text('Anverso', 15, 40);
    doc.addImage(frontUrl, 'PNG', 15, 45, 90, 55);
    
    doc.text('Reverso', 15, 115);
    doc.addImage(backUrl, 'PNG', 15, 120, 90, 55);
    
    doc.save(`DNI_${clientName.replace(/\s/g, '_')}.pdf`);
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
}

export const generatePaymentReceipt = (data: ReceiptData, signatureImage?: string) => {
    const doc = new jsPDF();
    const receiptId = `BM-${Date.now()}`;
    const generationDate = new Date().toLocaleString('es-ES');
    const amountString = data.paymentAmount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });


    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('B.M Contigo', 105, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Recibo de Pago', 105, 34, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.line(15, 38, 195, 38);

    // Receipt Info
    doc.setFontSize(10);
    doc.text(`Fecha de Emisión: ${generationDate}`, 195, 45, { align: 'right' });
    doc.text(`Nº de Recibo: ${receiptId}`, 15, 45);

    // Body
    doc.setFontSize(12);
    doc.text('Recibí de:', 15, 60);
    doc.setFont('helvetica', 'bold');
    doc.text(data.clientName, 40, 60);

    doc.setFont('helvetica', 'normal');
    doc.text('La cantidad de:', 15, 70);
    doc.setFont('helvetica', 'bold');
    doc.text(amountString, 45, 70);

    doc.setFont('helvetica', 'normal');
    doc.text('Por concepto de:', 15, 80);
    doc.setFont('helvetica', 'bold');
    doc.text(data.paymentType, 48, 80);

    doc.setLineWidth(0.2);
    doc.line(15, 90, 195, 90);
    
    // Details Table
    const tableBody = [
        ['ID Préstamo / Referencia:', data.loanId],
        ['Fecha del Pago Aplicado:', new Date(data.paymentDate).toLocaleDateString('es-ES')],
        ['Saldo Anterior:', data.previousBalance.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })],
        ['Monto del Pago:', amountString],
        ['Nuevo Saldo Pendiente:', data.newBalance.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })],
    ];
    
    if (data.notes) {
        tableBody.push(['Notas Adicionales:', data.notes]);
    }

    (doc as any).autoTable({
        startY: 95,
        body: tableBody,
        theme: 'plain',
        styles: { fontSize: 11, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold' } },
        didParseCell: function(data: any) {
            if (data.row.index >= 2 && data.row.index <= 4) { // Balance rows
                data.cell.styles.fontStyle = 'bold';
            }
            if (data.row.index === 3) { // Payment Amount row
                 data.cell.styles.textColor = [0, 150, 0]; // Green
            }
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY;

    // Signature
    if (signatureImage) {
        doc.addImage(signatureImage, 'PNG', 75, finalY + 15, 60, 30);
    } else {
        doc.line(45, finalY + 30, 165, finalY + 30);
        doc.text('Firma del Prestamista', 105, finalY + 35, { align: 'center' });
    }

    // Footer
    doc.line(15, 280, 195, 280);
    doc.setFontSize(9);
    doc.text('Gracias por su confianza.', 105, 285, { align: 'center' });
    doc.text('Este es un recibo generado por sistema.', 105, 290, { align: 'center' });


    doc.save(`Recibo_${data.clientName.replace(/\s/g, '_')}_${new Date(data.paymentDate).toISOString().split('T')[0]}.pdf`);
};