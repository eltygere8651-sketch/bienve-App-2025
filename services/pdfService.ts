import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Loan, Client } from '../types';
import { INTEREST_RATE_CONFIG } from '../config';

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

export const getContractText = (data: ContractData) => {
    const today = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    const interestRate = INTEREST_RATE_CONFIG.MONTHLY;

    return `CONTRATO DE PRÉSTAMO DE DINERO

En la fecha de ${today}, entre:

PRESTAMISTA: B.M Contigo, en adelante "EL PRESTAMISTA".

PRESTATARIO:
Nombre: ${data.fullName}
DNI/NIE: ${data.idNumber}
Dirección: ${data.address}
en adelante, "EL PRESTATARIO".

CLÁUSULAS:

1. OBJETO DEL CONTRATO: EL PRESTAMISTA entrega a EL PRESTATARIO la suma de ${data.loanAmount.toLocaleString('es-ES')} EUROS (€), en calidad de préstamo.

2. INTERESES: El préstamo devengará un interés fijo del ${interestRate}% mensual capitalizable.

3. PLAZO Y DEVOLUCIÓN: EL PRESTATARIO se compromete a devolver el capital más los intereses generados en cuotas mensuales, según el plan de pagos que se establecerá al momento de la aprobación final del préstamo.

4. INCUMPLIMIENTO: La falta de pago de una de las cuotas en la fecha pactada dará lugar a la aplicación de intereses de demora y facultará a EL PRESTAMISTA a exigir la devolución total del saldo pendiente.

5. ACEPTACIÓN: EL PRESTATARIO declara haber leído y comprendido todas las cláusulas del presente contrato, y lo acepta de plena conformidad, comprometiéndose a su estricto cumplimiento. La aceptación digital de este documento tiene la misma validez que una firma manuscrita.
`;
};


export const generateContractPDF = async (data: ContractData, signatureText: string): Promise<Blob> => {
    const doc = new jsPDF();
    const contractText = getContractText(data);

    doc.setFontSize(16);
    doc.text("Contrato de Préstamo", 105, 20, { align: 'center' });

    doc.setFontSize(11);
    const splitText = doc.splitTextToSize(contractText, 180);
    doc.text(splitText, 15, 35);

    const lastTextY = 35 + (splitText.length * 5.5); // Approximate position after text
    const signatureY = Math.max(lastTextY + 15, 220); // Ensure signature is not too high

    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text("Aceptación Digital:", 15, signatureY);
    
    doc.setFont('courier', 'normal');
    const signatureLines = doc.splitTextToSize(signatureText, 180);
    doc.text(signatureLines, 15, signatureY + 6);
    

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
    doc.text(`Informe de Cliente: ${client.name}`, 14, 22);
    doc.setFontSize(11);
    doc.text(`ID Cliente: ${client.id}`, 14, 30);
    doc.text(`Fecha de Alta: ${new Date(client.joinDate).toLocaleDateString()}`, 14, 36);

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

export const generateIdPdf = async (frontIdBlob: Blob, backIdBlob: Blob) => {
    const doc = new jsPDF();
    const frontUrl = await blobToDataURL(frontIdBlob);
    const backUrl = await blobToDataURL(backIdBlob);

    doc.setFontSize(16);
    doc.text(`Documento de Identidad`, 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text('Anverso', 15, 40);
    doc.addImage(frontUrl, 'PNG', 15, 45, 90, 55);
    
    doc.text('Reverso', 15, 115);
    doc.addImage(backUrl, 'PNG', 15, 120, 90, 55);
    
    // Open in new tab instead of forcing download
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
    // No need to revoke immediately if window.open is used
};
