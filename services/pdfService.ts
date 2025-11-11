import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Loan, Client, LoanRequest } from '../types';
import { LOCAL_STORAGE_KEYS } from '../constants';
import { formatCurrency } from './utils';
import { INTEREST_RATE_CONFIG } from '../config';

interface ContractData {
    fullName: string;
    idNumber: string;
    address: string;
    loanAmount: number;
}

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

    doc.setFontSize(16);
    doc.text("Contrato de Préstamo Aceptado", 105, 20, { align: 'center' });

    doc.setFontSize(10);
    const splitText = doc.splitTextToSize(contractText, 180);
    doc.text(splitText, 15, 35);

    if (request.signature) {
        const lastTextY = 35 + (splitText.length * 4.5); // Adjust line height factor for font size 10
        const signatureY = Math.max(lastTextY + 10, 240); // Ensure signature is at the bottom
        doc.setFontSize(12);
        doc.text("Firma del Prestatario:", 15, signatureY);
        try {
            doc.addImage(request.signature, 'PNG', 15, signatureY + 5, 60, 30);
        } catch (e) {
            console.error("Could not add signature image to PDF:", e);
            doc.text("[Error al cargar la firma]", 15, signatureY + 15);
        }
    }

    doc.save(`Solicitud_${request.fullName.replace(/\s/g, '_')}.pdf`);
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
        // Fetch images in parallel for efficiency
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

        doc.save(`DNI_${request.fullName.replace(/\s/g, '_')}.pdf`);
    } catch (error) {
        console.error("Error generating ID PDF:", error);
        throw new Error("Could not fetch images to generate PDF.");
    }
};