import React, { useState, useMemo } from 'react';
import { Calculator, Calendar, Percent, DollarSign, Share2, FileDown, RefreshCw, ArrowLeft, Table, PieChart, Settings, AlertTriangle, CheckCircle2, Link as LinkIcon, Search, X } from 'lucide-react';
import { formatCurrency } from '../services/utils';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useAppContext } from '../contexts/AppContext';
import { useDataContext } from '../contexts/DataContext';
import { InputField } from './FormFields';
import { DEFAULT_ANNUAL_INTEREST_RATE } from '../config';
import { Loan, LoanStatus } from '../types';

const LoanCalculator: React.FC = () => {
    const { setCurrentView, showToast } = useAppContext();
    const { loans, clients } = useDataContext();
    
    const [amount, setAmount] = useState<string>('1000');
    const [interestRate, setInterestRate] = useState<string>((DEFAULT_ANNUAL_INTEREST_RATE / 12).toString()); // Monthly rate
    const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [desiredPayment, setDesiredPayment] = useState<string>('');
    const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);

    // Filter active loans for selection
    const activeLoans = useMemo(() => {
        if (!loans || !clients) return [];
        return loans.filter(loan => {
            return loan.status === LoanStatus.PENDING || loan.status === LoanStatus.OVERDUE;
        }).map(loan => {
            const client = clients.find(c => c.id === loan.clientId);
            return {
                ...loan,
                clientName: client?.name || 'Cliente Desconocido'
            };
        });
    }, [loans, clients]);

    const handleSelectLoan = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const loanId = e.target.value;
        setSelectedLoanId(loanId);
        
        if (loanId) {
            const loan = activeLoans.find(l => l.id === loanId);
            if (loan) {
                setAmount(loan.remainingCapital.toString());
                // The calculator expects a Monthly rate, but loan.interestRate is typically Annual.
                // We divide by 12 to convert it.
                const monthlyRate = loan.interestRate / 12;
                setInterestRate(Number.isInteger(monthlyRate) ? monthlyRate.toString() : monthlyRate.toFixed(2));
                
                setStartDate(new Date().toISOString().split('T')[0]);
                showToast(`Datos cargados del préstamo de ${loan.clientName}`, 'success');
            }
        }
    };

    // Calculation Logic
    const results = useMemo(() => {
        const principal = parseFloat(amount) || 0;
        const monthlyRate = (parseFloat(interestRate) || 0) / 100;
        const targetPayment = parseFloat(desiredPayment) || 0;
        
        if (principal <= 0 || targetPayment <= 0) return null;

        // Validation: Payment must cover interest
        const firstMonthInterest = principal * monthlyRate;
        if (targetPayment <= firstMonthInterest) {
            return { error: "La cuota es muy baja, no cubre los intereses generados." };
        }

        const schedule: any[] = [];
        let currentBalance = principal;
        let totalInterest = 0;
        let totalPayment = 0;
        let months = 0;
        
        // Safety limit
        const MAX_MONTHS = 360; 

        while (currentBalance > 0.01 && months < MAX_MONTHS) {
            months++;
            
            // Calculate date for this month
            const date = new Date(startDate);
            date.setMonth(date.getMonth() + months);

            const interest = currentBalance * monthlyRate;
            let payment = targetPayment;
            let principalPayment = payment - interest;

            // Check if this is the last payment (or if balance is small enough)
            // Logic: If remaining balance + interest is less than or equal to target payment, close it.
            // Or if the remaining balance is very small.
            if ((currentBalance + interest) <= targetPayment + 0.01) {
                payment = currentBalance + interest;
                principalPayment = currentBalance;
                currentBalance = 0;
            } else {
                currentBalance -= principalPayment;
            }

            // Rounding for display/storage consistency in the schedule
            // We keep internal precision but schedule usually shows 2 decimals.
            // However, to "eliminate cents" visually for the user's main quotas, we rely on targetPayment being clean.
            
            totalInterest += interest;
            totalPayment += payment;

            schedule.push({
                month: months,
                date: date,
                payment: payment,
                interest: interest,
                principal: principalPayment,
                balance: Math.max(0, currentBalance)
            });
        }

        return {
            monthlyPayment: targetPayment,
            lastPayment: schedule[schedule.length - 1].payment,
            totalPayment,
            totalInterest,
            schedule,
            calculatedTerm: months,
            isCleanSchedule: Math.abs(targetPayment - schedule[schedule.length - 1].payment) < 0.1
        };
    }, [amount, interestRate, startDate, desiredPayment]);

    const handleSharePDF = (useShareApi: boolean = false) => {
        if (!results || results.error) return;

        const doc = new jsPDF();

        // Header
        doc.setFillColor(30, 41, 59); // Slate 800
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("B.M CONTIGO", 15, 25);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Simulación de Préstamo", 150, 25);

        // Loan Details Box
        doc.setDrawColor(200, 200, 200);
        doc.setFillColor(250, 250, 250);
        doc.roundedRect(15, 50, 180, 35, 3, 3, 'FD');

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("Detalles del Préstamo", 20, 60);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Monto Solicitado: ${formatCurrency(parseFloat(amount))}`, 20, 70);
        doc.text(`Tasa de Interés: ${interestRate}% Mensual`, 20, 76);
        
        doc.text(`Plazo Calculado: ${results.calculatedTerm} Meses`, 110, 70);
        doc.text(`Fecha de Inicio: ${new Date(startDate).toLocaleDateString()}`, 110, 76);

        // Results Summary
        doc.setFillColor(240, 240, 240);
        doc.rect(15, 95, 180, 25, 'F');

        doc.setFontSize(10);
        doc.text("Plazo Estimado", 20, 105);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(37, 99, 235); // Blue
        
        doc.text(`${results.calculatedTerm} Meses`, 20, 115);

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Total Intereses", 110, 105);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(formatCurrency(results.totalInterest), 110, 115);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Total a Pagar", 160, 105);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(formatCurrency(results.totalPayment), 160, 115);

        // Amortization Table
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.text("Tabla de Amortización", 15, 135);

        const tableBody = results.schedule.map(row => [
            row.month,
            row.date.toLocaleDateString(),
            formatCurrency(row.payment),
            formatCurrency(row.interest),
            formatCurrency(row.principal),
            formatCurrency(row.balance)
        ]);

        (doc as any).autoTable({
            startY: 140,
            head: [['Mes', 'Fecha', 'Cuota', 'Interés', 'Capital', 'Saldo']],
            body: tableBody,
            theme: 'striped',
            headStyles: { fillColor: [30, 41, 59] },
            styles: { fontSize: 9, cellPadding: 3 },
            columnStyles: {
                5: { fontStyle: 'bold' }
            }
        });

        // Footer
        const pageCount = doc.getNumberOfPages();
        for(let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Generado el ${new Date().toLocaleString()}`, 15, 290);
            doc.text(`Página ${i} de ${pageCount}`, 195, 290, { align: 'right' });
        }

        const fileName = `Simulacion_Prestamo_${new Date().toISOString().split('T')[0]}.pdf`;
        
        // Share or Download
        if (useShareApi && navigator.share) {
            const pdfBlob = doc.output('blob');
            const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
            navigator.share({
                title: 'Simulación de Préstamo',
                text: 'Aquí tienes la simulación de cuotas del préstamo.',
                files: [file]
            }).catch(console.error);
        } else {
            doc.save(fileName);
            showToast('PDF descargado correctamente', 'success');
        }
    };

    const getSummaryText = () => {
        if (!results || results.error) return '';
        const totalStr = formatCurrency(results.totalPayment);
        const termStr = `${results.calculatedTerm} Meses`;
        
        let paymentStr = `${formatCurrency(results.monthlyPayment)}`;
        if (!results.isCleanSchedule) {
            paymentStr += ` (Última: ${formatCurrency(results.lastPayment)})`;
        }
            
        return `*Simulación de Préstamo - B.M Contigo*\n\n` +
               `💰 *Monto:* ${formatCurrency(parseFloat(amount))}\n` +
               `📅 *Plazo:* ${termStr}\n` +
               `📉 *Tasa:* ${interestRate}% Mensual\n\n` +
               `💵 *Cuota Base:* ${formatCurrency(results.monthlyPayment)}\n` +
               (!results.isCleanSchedule ? `🏁 *Cuota Final:* ${formatCurrency(results.lastPayment)}\n` : '') +
               `📊 *Total a Pagar:* ${totalStr}\n\n` +
               `Generado el ${new Date().toLocaleDateString()}`;
    };

    const handleShareWhatsApp = () => {
        const text = encodeURIComponent(getSummaryText());
        window.open(`https://wa.me/?text=${text}`, '_blank');
    };

    const handleShareTelegram = () => {
        const text = encodeURIComponent(getSummaryText());
        window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${text}`, '_blank');
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-20 relative">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                        <Calculator size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-heading font-bold text-slate-100">Calculadora de Plazos</h1>
                        <p className="text-slate-400 text-sm">Optimiza tus cuotas sin centavos molestos</p>
                    </div>
                </div>
                <button 
                    onClick={() => setCurrentView('dashboard')}
                    className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Input Panel */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Settings size={18} className="text-slate-400" /> Parámetros
                            </h2>
                        </div>
                        
                        <div className="space-y-4">
                            {activeLoans.length > 0 && (
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                                        Cargar Préstamo Activo
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                            <LinkIcon size={16} />
                                        </div>
                                        <select
                                            value={selectedLoanId || ''}
                                            onChange={handleSelectLoan}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer hover:bg-slate-900/80 transition-colors"
                                        >
                                            <option value="">-- Seleccionar Préstamo --</option>
                                            {activeLoans.map(loan => (
                                                <option key={loan.id} value={loan.id}>
                                                    {loan.clientName} - {formatCurrency(loan.remainingCapital)}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                                            <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                                                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <InputField 
                                label="Monto del Préstamo (Saldo)" 
                                name="amount" 
                                type="number" 
                                value={amount} 
                                onChange={(e) => {
                                    setAmount(e.target.value);
                                    if (selectedLoanId) setSelectedLoanId(null); // Clear selection if manually edited
                                }} 
                                icon={<DollarSign size={16} />}
                            />

                            <InputField 
                                label="Cuota Mensual Deseada" 
                                name="desiredPayment" 
                                type="number" 
                                value={desiredPayment} 
                                onChange={(e) => setDesiredPayment(e.target.value)} 
                                icon={<DollarSign size={16} />}
                                placeholder="Ej: 200 (Sin centavos)"
                            />
                            <p className="text-[10px] text-slate-400 -mt-2">
                                Tip: Usa números enteros para evitar centavos en las cuotas.
                            </p>

                            <InputField 
                                label="Tasa Mensual (%)" 
                                name="interestRate" 
                                type="number" 
                                value={interestRate} 
                                onChange={(e) => setInterestRate(e.target.value)} 
                                icon={<Percent size={16} />}
                            />

                            <InputField 
                                label="Fecha de Inicio (Simulación)" 
                                name="startDate" 
                                type="date" 
                                value={startDate} 
                                onChange={(e) => setStartDate(e.target.value)} 
                            />
                        </div>
                    </div>

                    {/* Summary Card (Mobile/Desktop) */}
                    {results && !results.error && (
                        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 rounded-2xl shadow-lg text-white">
                            <h3 className="text-sm font-medium text-indigo-100 uppercase tracking-wider mb-1">
                                Plazo Estimado
                            </h3>
                            <div className="text-4xl font-bold font-heading mb-4">
                                {results.calculatedTerm} Meses
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                                <div>
                                    <p className="text-xs text-indigo-200">Total Intereses</p>
                                    <p className="font-bold text-lg">{formatCurrency(results.totalInterest)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-indigo-200">Total a Pagar</p>
                                    <p className="font-bold text-lg">{formatCurrency(results.totalPayment)}</p>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-white/10">
                                <p className="text-xs text-indigo-200 mb-1">Estructura de Pagos</p>
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-xl">{formatCurrency(results.monthlyPayment)}</span>
                                    <span className="text-sm opacity-80">x {results.calculatedTerm - 1}</span>
                                </div>
                                {!results.isCleanSchedule && (
                                    <div className="flex items-center justify-between mt-1 text-indigo-200">
                                        <span className="font-bold">{formatCurrency(results.lastPayment)}</span>
                                        <span className="text-xs">Cuota Final</span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3 mt-6">
                                <button 
                                    onClick={() => handleSharePDF(false)}
                                    className="w-full bg-white text-indigo-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-50 transition-colors shadow-lg"
                                >
                                    <FileDown size={18} /> Descargar PDF
                                </button>

                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        onClick={handleShareWhatsApp}
                                        className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold bg-[#25D366] text-white hover:bg-[#20bd5a] transition-colors shadow-lg"
                                        title="Enviar resumen por WhatsApp"
                                    >
                                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                                        WhatsApp
                                    </button>
                                    <button 
                                        onClick={handleShareTelegram}
                                        className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold bg-[#0088cc] text-white hover:bg-[#0077b5] transition-colors shadow-lg"
                                        title="Enviar resumen por Telegram"
                                    >
                                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 11.944 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.638z"/></svg>
                                        Telegram
                                    </button>
                                </div>
                                
                                {navigator.share && (
                                    <button 
                                        onClick={() => handleSharePDF(true)}
                                        className="w-full bg-slate-700 text-slate-200 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-600 transition-colors border border-slate-600"
                                    >
                                        <Share2 size={18} /> Compartir Archivo
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Results Panel */}
                <div className="lg:col-span-2 space-y-6">
                    {results ? (
                        results.error ? (
                            <div className="bg-red-900/20 border border-red-500/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center h-full">
                                <AlertTriangle size={48} className="text-red-400 mb-4" />
                                <h3 className="text-xl font-bold text-red-200 mb-2">Error en el Cálculo</h3>
                                <p className="text-red-300">{results.error}</p>
                                <p className="text-sm text-red-400 mt-2">Intenta aumentar la cuota mensual.</p>
                            </div>
                        ) : (
                            <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden flex flex-col h-full">
                                <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                                    <h3 className="font-bold text-white flex items-center gap-2">
                                        <Table size={18} className="text-slate-400" /> Tabla de Amortización
                                    </h3>
                                    <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
                                        {results.calculatedTerm} Cuotas
                                    </span>
                                </div>
                                
                                <div className="overflow-x-auto flex-1">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-900 text-slate-400 uppercase font-bold text-xs sticky top-0 z-10">
                                            <tr>
                                                <th className="px-4 py-3 text-center w-16">Mes</th>
                                                <th className="px-4 py-3">Fecha</th>
                                                <th className="px-4 py-3 text-right">Cuota</th>
                                                <th className="px-4 py-3 text-right text-amber-400">Interés</th>
                                                <th className="px-4 py-3 text-right text-emerald-400">Capital</th>
                                                <th className="px-4 py-3 text-right">Saldo</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-700">
                                            {results.schedule.map((row) => (
                                                <tr key={row.month} className="hover:bg-slate-700/30 transition-colors">
                                                    <td className="px-4 py-3 text-center font-mono text-slate-500">{row.month}</td>
                                                    <td className="px-4 py-3 text-slate-300">{row.date.toLocaleDateString()}</td>
                                                    <td className="px-4 py-3 text-right font-bold text-white">{formatCurrency(row.payment)}</td>
                                                    <td className="px-4 py-3 text-right text-amber-300/80 font-mono">{formatCurrency(row.interest)}</td>
                                                    <td className="px-4 py-3 text-right text-emerald-300/80 font-mono">{formatCurrency(row.principal)}</td>
                                                    <td className="px-4 py-3 text-right font-bold text-slate-200">{formatCurrency(row.balance)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 p-10 border-2 border-dashed border-slate-700 rounded-2xl bg-slate-800/30">
                            <PieChart size={48} className="mb-4 opacity-50" />
                            <p className="text-lg font-medium">Ingresa los datos para calcular</p>
                            <p className="text-sm mt-2 max-w-xs text-center">Define el monto y cuánto puede pagar el cliente para ver el plazo estimado.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoanCalculator;
