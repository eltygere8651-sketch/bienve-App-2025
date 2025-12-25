
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

export const DEFAULT_CONTRACT_TEMPLATE = `CONTRATO DE PRÉSTAMO DE DINERO CON INTERESES ENTRE PARTICULARES

En Madrid, a \${today}.

REUNIDOS

De una parte, como PRESTAMISTA (Acreedor):
D. BIENVENIDO NEFTALI FELIZ TOLENTINO, mayor de edad, con D.N.I. nº 18476199T, con domicilio a efectos de este contrato en Madrid.

Y de otra parte, como PRESTATARIO (Deudor):
D./Dña. \${fullName}, mayor de edad, con DNI/NIE \${idNumber} y domicilio a efectos de notificaciones en \${address}.

Ambas partes intervienen en su propio nombre y derecho, reconociéndose mutuamente la capacidad legal necesaria para formalizar el presente CONTRATO DE PRÉSTAMO, y a tal efecto,

EXPONEN

I. Que el PRESTAMISTA entrega en este acto al PRESTATARIO la cantidad de \${loanAmount} EUROS (€), mediante transferencia bancaria o efectivo.

II. Que el PRESTATARIO reconoce haber recibido dicha cantidad a su entera satisfacción, obligándose a su devolución junto con los intereses pactados, con sujeción a las siguientes:

CLÁUSULAS

PRIMERA. OBJETO DEL CONTRATO.
El Prestamista presta al Prestatario la cantidad de \${loanAmount} €, que ingresan en este acto en el patrimonio del deudor. Este documento sirve como eficaz carta de pago y reconocimiento de deuda por el importe mencionado.

SEGUNDA. INTERESES REMUNERATORIOS.
El capital prestado devengará un interés fijo pactado del \${interestRate}% MENSUAL. El Prestatario acepta expresamente este tipo de interés, declarando conocer y asumir el coste financiero de la operación, el cual no considera desproporcionado dadas las características del préstamo y el riesgo asumido.

TERCERA. FORMA DE DEVOLUCIÓN (AMORTIZACIÓN).
El Prestatario devolverá el capital más los intereses mediante el pago de cuotas mensuales consecutivas. El pago se realizará preferiblemente mediante transferencia bancaria a la cuenta que designe el Prestamista o en efectivo contra recibo. El impago de cualquier cuota generará mora automática.

CUARTA. VENCIMIENTO ANTICIPADO.
De conformidad con lo establecido en la legislación vigente, el Prestamista se reserva la facultad de dar por vencido anticipadamente el préstamo y exigir judicialmente la devolución de la TOTALIDAD del capital pendiente más los intereses devengados hasta la fecha, si el Prestatario dejara de pagar UNA SOLA de las cuotas a su vencimiento.

QUINTA. INTERESES DE DEMORA.
En caso de impago a su vencimiento, la cantidad adeudada devengará, de forma automática y sin necesidad de requerimiento previo, un interés de demora adicional equivalente al tipo de interés legal del dinero vigente incrementado en 10 puntos porcentuales.

SEXTA. GASTOS Y COSTAS JUDICIALES.
Serán de cuenta exclusiva del Prestatario todos los gastos derivados del presente contrato. En caso de incumplimiento, el Prestatario asume expresamente el pago de todos los gastos judiciales y extrajudiciales (incluyendo honorarios de Abogado y Procurador, burofaxes y gastos de gestión de cobro) que el Prestamista deba realizar para recuperar su dinero.

SÉPTIMA. OBLIGACIONES FISCALES.
Las partes declaran conocer la obligación de presentar este contrato ante la oficina liquidadora competente del Impuesto sobre Transmisiones Patrimuidas y Actos Jurídicos Documentados (Modelo 600), siendo dicha gestión responsabilidad del Prestatario si así se acordase o fuese requerido.

OCTAVA. PROTECCIÓN DE DATOS.
Los datos personales del Prestatario se incorporan a un fichero responsabilidad del Prestamista con la única finalidad de gestionar la relación contractual y el cobro de la deuda. El Prestatario autoriza el tratamiento de sus datos y de la copia de su documento de identidad para estos fines.

NOVENA. JURISDICCIÓN.
Para la resolución de cualquier controversia, las partes, con renuncia a su propio fuero, se someten expresamente a los Juzgados y Tribunales de la ciudad de MADRID (o del domicilio del Prestamista).

Y en prueba de conformidad, firman el presente por duplicado y a un solo efecto.

EL PRESTAMISTA:                            EL PRESTATARIO:
                                            
Fdo: Bienvenido N. Feliz T.                Fdo: \${fullName}
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

    // Título
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("CONTRATO DE PRÉSTAMO ENTRE PARTICULARES", 105, 20, { align: 'center' });

    // Texto del contrato
    doc.setFontSize(9); // Texto compacto para que quepa todo
    doc.setFont("helvetica", "normal");
    
    // Ajuste de márgenes y ancho de texto
    const splitText = doc.splitTextToSize(contractText, 170);
    doc.text(splitText, 20, 35);

    // Gestión de Firmas
    if (signatureImage) {
        // Calcular posición Y basada en la longitud del texto
        const lastTextY = 35 + (splitText.length * 3.5); // 3.5 es el interlineado aprox para font size 9
        // Asegurar que las firmas no se solapen con el texto, mínimo en Y=220
        const signatureY = Math.max(lastTextY + 15, 210);
        
        // Si el texto es muy largo y empuja las firmas fuera de la página, añadir página
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
        // Espacio para firma manual
        const lastTextY = 35 + (splitText.length * 3.5);
        const signatureY = Math.max(lastTextY + 20, 220);
        
        doc.line(20, signatureY + 20, 80, signatureY + 20);
        doc.text("Firma del Prestatario", 20, signatureY + 25);
        
        doc.line(120, signatureY + 20, 180, signatureY + 20);
        doc.text("Firma del Prestamista", 120, signatureY + 25);
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
        head: [['ID Préstamo', 'Fecha Inicio', 'Monto (€)', 'Plazo', 'Estado', 'Pagos']],
        body: loans.map(l => [
            l.id.substring(l.id.length - 6),
            new Date(l.startDate).toLocaleDateString(),
            l.amount.toLocaleString('es-ES'),
            l.term === 0 ? 'Indefinido' : `${l.term} meses`,
            l.status,
            l.term === 0 ? l.paymentsMade : `${l.paymentsMade}/${l.term}`
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
    interestPaid?: number; // Optional: Desglose explícito de interés
    capitalPaid?: number;  // Optional: Desglose explícito de capital
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
    ];

    // Añadir desglose si existe (para recibos "inteligentes")
    if (data.interestPaid !== undefined && data.capitalPaid !== undefined) {
        tableBody.push(['(+) Pago Total Recibido:', amountString]);
        tableBody.push(['(-) Intereses Cubiertos:', data.interestPaid.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })]);
        tableBody.push(['(-) Capital Amortizado:', data.capitalPaid.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })]);
    } else {
        tableBody.push(['Monto del Pago:', amountString]);
    }

    tableBody.push(['(=) Nuevo Saldo Pendiente:', data.newBalance.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })]);
    
    if (data.notes) {
        tableBody.push(['Notas Adicionales:', data.notes]);
    }

    (doc as any).autoTable({
        startY: 95,
        body: tableBody,
        theme: 'plain',
        styles: { fontSize: 11, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 } }, // Ajustar ancho columna etiquetas
        didParseCell: function(cellData: any) {
            const rowIdx = cellData.row.index;
            const label = cellData.row.cells[0].raw; // Obtener texto de la etiqueta
            
            // Negrita para saldos
            if (label.includes('Saldo')) {
                cellData.cell.styles.fontStyle = 'bold';
            }
            // Colores para el desglose
            if (label.includes('Pago Total') || label.includes('Monto del Pago')) {
                 cellData.cell.styles.textColor = [0, 100, 0]; // Dark Green
                 cellData.cell.styles.fontStyle = 'bold';
            }
            if (label.includes('Capital Amortizado')) {
                 cellData.cell.styles.textColor = [0, 0, 200]; // Dark Blue
            }
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY;

    // Signature Logic
    if (signatureImage) {
        doc.addImage(signatureImage, 'PNG', 75, finalY + 15, 60, 30);
    } else {
        // SUSTITUCIÓN: Sello digital en lugar de línea vacía
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(200, 200, 200); // Marca de agua gris claro
        doc.text('B.M CONTIGO', 105, finalY + 30, { align: 'center' });
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('Recibo Generado Digitalmente', 105, finalY + 35, { align: 'center' });
        doc.setTextColor(0, 0, 0); // Reset a negro
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
