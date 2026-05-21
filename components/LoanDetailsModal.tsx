import React, { useState, useEffect, useMemo } from "react";
import { Loan, Client, LoanStatus } from "../types";
import {
  X,
  Banknote,
  Calendar,
  Percent,
  Clock,
  AlertTriangle,
  Edit,
  Trash2,
  Save,
  Loader2,
  TrendingDown,
  Infinity as InfinityIcon,
  User,
  MapPin,
  Phone,
  Mail,
  FileText,
  Check,
  Copy,
  Lock,
  RotateCcw,
  FileDown,
  CreditCard,
  Share2,
  Send,
  MessageCircle,
  ChevronLeft,
} from "lucide-react";
import {
  formatCurrency,
  calculateLoanProgress,
  formatPhone,
} from "../services/utils";
import PaymentHistory from "./PaymentHistory";
import { useDataContext } from "../contexts/DataContext";
import { useAppContext } from "../contexts/AppContext";
import { InputField, MoneyInput } from "./FormFields";
import { calculateMonthlyInterest } from "../config";
import { generateLoanHistoryPDF } from "../services/pdfService";

interface LoanDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan | null;
  client: Client | null;
  initialTab?: "details" | "payment" | "history" | "edit";
}

// Subcomponente para datos estáticos
const InfoRow = ({
  icon: Icon,
  label,
  value,
  onCopy,
}: {
  icon: any;
  label: string;
  value: string | undefined;
  onCopy?: boolean;
}) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (value) {
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="flex items-start gap-3 py-2 border-b border-slate-700/50 last:border-0">
      <div className="mt-0.5 text-slate-500">
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-0.5">
          {label}
        </p>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-slate-200 truncate">
            {value || "No especificado"}
          </p>
          {onCopy && value && (
            <button
              onClick={handleCopy}
              className="text-slate-600 hover:text-primary-400 transition-colors"
            >
              {copied ? (
                <Check size={12} className="text-green-500" />
              ) : (
                <Copy size={12} />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const LoanDetailsModal: React.FC<LoanDetailsModalProps> = ({
  isOpen,
  onClose,
  loan,
  client,
  initialTab = "details",
}) => {
  const {
    handleUpdateLoan,
    handleUpdateClient,
    handleDeleteLoan,
    handleRegisterPayment,
    handleBalanceCorrection,
    handleToggleOverdueStatus,
    suggestedOverdues,
    handleConfirmOverdue,
    handleManualAddOverdue,
    handleDeleteOverdueMonth,
    handleClearOverdueHistory,
    handleCleanDeleteClient,
  } = useDataContext();
  const { showConfirmModal, showToast } = useAppContext();
  const [activeTab, setActiveTab] = useState<
    "details" | "payment" | "history" | "edit" | "security"
  >(initialTab as any);

  const currentSuggestion = suggestedOverdues.find((s) => s.loanId === loan.id);

  const totalOverdueInterest = useMemo(() => {
    if (!loan?.overdueHistory) return 0;
    return loan.overdueHistory
      .filter((h) => h.status === "pendiente")
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [loan?.overdueHistory]);

  const totalLiquidationAmount =
    (loan?.remainingCapital || 0) +
    (loan?.pendingInterest || 0) +
    totalOverdueInterest;

  // States for Edit Forms
  const [loanFormData, setLoanFormData] = useState<Partial<Loan>>({});
  const [clientFormData, setClientFormData] = useState<Partial<Client>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCleanDeleteConfirm, setShowCleanDeleteConfirm] = useState(false);
  const [cleanDeletePassword, setCleanDeletePassword] = useState("");

  // Overdue Manual Entry State
  const [showManualOverdue, setShowManualOverdue] = useState(false);
  const [manualOverdueMonth, setManualOverdueMonth] = useState("");
  const [manualOverdueYear, setManualOverdueYear] = useState(
    new Date().getFullYear(),
  );
  const [manualOverdueAmount, setManualOverdueAmount] = useState("");

  // Message Type State
  const [msgType, setMsgType] = useState<"recommended" | "direct" | "premium">(
    "recommended",
  );

  // Balance Correction State
  const [showCorrectionInput, setShowCorrectionInput] = useState(false);
  const [correctionBalance, setCorrectionBalance] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");

  // Capital Condonation State
  const [showCondonationPanel, setShowCondonationPanel] = useState(false);
  const [condonationPercent, setCondonationPercent] = useState<number | "custom">(100);
  const [customCondonationPercent, setCustomCondonationPercent] = useState("");
  const [condonationNotes, setCondonationNotes] = useState("");

  // Payment Form State
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"Efectivo" | "Banco">(
    "Efectivo",
  );
  const [showInterestCovered, setShowInterestCovered] = useState(false);

  useEffect(() => {
    if (loan && client) {
      setLoanFormData({
        initialCapital: loan.initialCapital || loan.amount,
        amount: loan.amount,
        remainingCapital: loan.remainingCapital,
        pendingInterest: loan.pendingInterest || 0,
        pendingInterestDetails: loan.pendingInterestDetails || "",
        term: loan.term,
        interestRate: loan.interestRate,
        startDate: new Date(loan.startDate).toISOString().split("T")[0],
        status: loan.status,
        notes: loan.notes || "",
      });
      setClientFormData({
        name: client.name,
        idNumber: client.idNumber,
        phone: client.phone,
        address: client.address,
        email: client.email,
      });

      setActiveTab(initialTab);
      setPaymentAmount("");
      setPaymentNotes("");
      setPaymentMethod("Efectivo");
      setShowCorrectionInput(false);
    }
  }, [loan, client, isOpen, initialTab]);

  const paymentPreview = useMemo(() => {
    if (!loan || !paymentAmount) return null;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return null;

    const monthlyInterest = calculateMonthlyInterest(
      loan.remainingCapital,
      loan.interestRate,
    ).interest;
    const pendingInt = loan.pendingInterest || 0;

    const payOffPending = Math.min(amount, pendingInt);
    const amountAfterPending = amount - payOffPending;

    const payOffRegular = Math.min(amountAfterPending, monthlyInterest);
    const amountAfterRegular = amountAfterPending - payOffRegular;

    const totalInterestPaid = payOffPending + payOffRegular;

    const capitalPart = Math.max(0, amountAfterRegular);
    const newBalance = Math.max(0, loan.remainingCapital - capitalPart);

    return {
      interestPart: totalInterestPaid,
      regularInterestPaid: payOffRegular,
      capitalPart,
      newBalance,
      pendingInterestPaid: payOffPending,
    };
  }, [loan, paymentAmount]);

  const interestDueDisplay = useMemo(() => {
    if (!loan) return 0;
    return calculateMonthlyInterest(loan.remainingCapital, loan.interestRate)
      .interest;
  }, [loan]);

  const pendingInterestDisplay = loan?.pendingInterest || 0;

  useEffect(() => {
    if (isOpen) {
      window.history.pushState({ modalOpen: true }, "");

      const handlePopState = () => {
        onClose();
      };

      window.addEventListener("popstate", handlePopState);
      document.body.style.overflow = "hidden";

      return () => {
        window.removeEventListener("popstate", handlePopState);
        document.body.style.overflow = "auto";
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen || !loan || !client) return null;

  const isIndefinite = loan.term === 0;
  const hasHistory = loan.paymentsMade > 0;

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Update Loan
      const updatedLoan = { ...loanFormData };
      // Ensure consistency: if amount changed, sync initialCapital
      if (updatedLoan.amount) {
        updatedLoan.initialCapital = updatedLoan.amount;
      } else if (updatedLoan.initialCapital) {
        updatedLoan.amount = updatedLoan.initialCapital;
      }

      // Removing dangerous manual edits for remainingCapital from this specific submit to avoid history desync
      // (Remaining capital is now handled via handleCorrectionSubmit)
      delete updatedLoan.remainingCapital;

      await Promise.all([
        handleUpdateLoan(loan.id, updatedLoan),
        handleUpdateClient(client.id, clientFormData),
      ]);

      setActiveTab("details");
      showToast("Datos actualizados correctamente", "success");
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCorrectionSubmit = async () => {
    const newBalance = parseFloat(correctionBalance);
    if (isNaN(newBalance) || newBalance < 0) {
      showToast("Introduce un saldo válido.", "error");
      return;
    }
    setIsSubmitting(true);
    try {
      await handleBalanceCorrection(
        loan.id,
        newBalance,
        correctionReason || "Ajuste manual",
      );
      setShowCorrectionInput(false);
      setCorrectionBalance("");
      setCorrectionReason("");
      setLoanFormData((prev) => ({ ...prev, remainingCapital: newBalance })); // UI Update
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCondonationSubmit = async () => {
    const currentCapital = loan.remainingCapital;
    if (currentCapital <= 0) {
      showToast("El préstamo ya no tiene capital pendiente para condonar.", "error");
      return;
    }

    let percent = 0;
    if (condonationPercent === "custom") {
      percent = parseFloat(customCondonationPercent);
    } else {
      percent = condonationPercent;
    }

    if (isNaN(percent) || percent <= 0 || percent > 100) {
      showToast("Por favor, introduce un porcentaje válido entre 1% y 100%.", "error");
      return;
    }

    const valueToForgive = (currentCapital * percent) / 100;
    const newBalance = Math.max(0, currentCapital - valueToForgive);

    setIsSubmitting(true);
    try {
      const reason = `CONDONACIÓN DE CAPITAL (${percent}%): ${condonationNotes || "Amortización voluntaria por gracia"}`;
      
      await handleBalanceCorrection(
        loan.id,
        newBalance,
        reason,
      );

      setShowCondonationPanel(false);
      setCondonationNotes("");
      setCustomCondonationPercent("");
      setLoanFormData((prev) => ({ ...prev, remainingCapital: newBalance })); // UI Update
      showToast(
        `Condonación de €${valueToForgive.toFixed(2)} (${percent}%) completada con éxito.`,
        "success"
      );
    } catch (error) {
      console.error(error);
      showToast("Error al realizar la condonación.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount) return;
    setIsSubmitting(true);
    try {
      await handleRegisterPayment(
        loan.id,
        parseFloat(paymentAmount),
        paymentDate,
        paymentNotes,
        paymentMethod,
      );
      setPaymentAmount("");
      setPaymentNotes("");
      setPaymentMethod("Efectivo");
      showToast("Pago registrado exitosamente", "success");

      // MEJORA: Auto-detección de recuperación de mora
      if (loan.status === LoanStatus.OVERDUE) {
        setTimeout(() => {
          showConfirmModal({
            title: "¿Normalizar Estado?",
            message:
              'Este préstamo estaba en mora. ¿Deseas cambiar su estado a "Pendiente/Al día" después de este pago para reducir el índice de morosidad global?',
            onConfirm: async () => {
              await handleUpdateLoan(loan.id, { status: LoanStatus.PENDING });
              showToast(
                "Estado normalizado. La morosidad ha bajado.",
                "success",
              );
            },
            type: "info",
            // @ts-ignore
            confirmText: "Sí, normalizar",
            // @ts-ignore
            cancelText: "Mantener mora",
          });
        }, 500);
      }
    } catch (e) {
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDelete = () => {
    showConfirmModal({
      title: "Cerrar Préstamo Permanentemente",
      message: `¿Eliminar préstamo de ${formatCurrency(loan.amount)}?`,
      onConfirm: async () => {
        await handleDeleteLoan(loan.id, client.name);
        onClose();
      },
      type: "warning",
    });
  };

  const onCleanDelete = async () => {
    if (cleanDeletePassword !== "bn8237") {
      showToast("Contraseña incorrecta", "error");
      return;
    }

    showConfirmModal({
      title: 'Borrado "Clean" (Pruebas)',
      message: `ATENCIÓN: Este borrado eliminará a ${client.name} y TODOS sus préstamos. Además, REVERTIRÁ los movimientos contables (reintegrará los capitales prestados y restará los cobros realizados). Usa esto SOLAMENTE si el registro fue una prueba.`,
      onConfirm: async () => {
        await handleCleanDeleteClient(client.id);
        onClose();
        showToast(
          "Cliente y préstamos eliminados (Movimientos revertidos)",
          "success",
        );
      },
      type: "danger",
    });
  };

  const setQuickAmount = (type: "interest" | "full") => {
    if (type === "interest")
      setPaymentAmount(
        (pendingInterestDisplay + totalOverdueInterest).toFixed(2),
      );
    if (type === "full") setPaymentAmount(totalLiquidationAmount.toFixed(2));
  };

  const getShareMessage = (
    type: "recommended" | "direct" | "premium" = "recommended",
  ) => {
    if (!client || !loan) return "";

    const overdueItems = (loan.overdueHistory || []).filter(
      (h) => h.status === "pendiente",
    );
    const totalOverdue = overdueItems.reduce(
      (acc, curr) => acc + curr.amount,
      0,
    );

    const firstName = client.name.split(" ")[0];

    if (overdueItems.length === 0) {
      return `¡Hola *${firstName}*! 👋\n\nPaso por aquí para saludarte y comentarte que tu cuenta está totalmente al día. ¡Muchas gracias por tu excelente puntualidad! Seguimos adelante. 🚀`;
    }

    if (type === "direct") {
      let msg = `Hola *${firstName}*, ¿cómo estás? Te envío el detalle de los intereses pendientes a la fecha:\n\n`;
      overdueItems.forEach((item) => {
        msg += `📍 *${item.monthName} ${item.year}:* ${formatCurrency(item.amount)}\n`;
      });
      msg += `\n💵 *Total:* ${formatCurrency(totalOverdue)}\n\nQuedamos atentos a tu confirmación. ¡Saludos!`;
      return msg;
    }

    if (type === "premium") {
      let msg = `Estimado(a) *${firstName}*, es un gusto saludarte. Espero que estés teniendo una excelente semana.\n\n`;
      msg += `Como parte de nuestro seguimiento de cortesía, te compartimos el estado actual de los compromisos de tu cuenta:\n\n`;
      overdueItems.forEach((item) => {
        msg += `📍 *${item.monthName} ${item.year}:* ${formatCurrency(item.amount)}\n`;
      });
      msg += `\n🏛️ *Saldo pendiente:* ${formatCurrency(totalOverdue)}\n\n`;
      msg += `Nuestro compromiso es brindarte la mejor experiencia y asegurar la salud de tu cuenta con nosotros. Si necesitas asistencia, estamos a tu disposición.\n\nUn cordial saludo.`;
      return msg;
    }

    // Recommended
    let message = `¡Hola *${firstName}*! 👋 ¿Cómo estás? Espero que todo vaya excelente.\n\n`;
    message += `Te paso por aquí este recordatorio de los intereses que tenemos pendientes por regularizar:\n\n`;

    overdueItems.forEach((item) => {
      message += `📍 *${item.monthName} ${item.year}:* ${formatCurrency(item.amount)}\n`;
    });

    message += `\n💰 *Total pendiente:* ${formatCurrency(totalOverdue)}\n\n`;
    message += `Valoramos mucho tu confianza y queremos que tu cuenta siga marchando en orden para que sigamos creciendo juntos. Por favor, cuando tengas un momento nos avisas para coordinar.\n\n`;
    message += `¡Cualquier duda quedo a tu orden! Un gran abrazo.`;

    return message;
  };

  const handleCopyReport = () => {
    const message = getShareMessage(msgType);
    if (!message) return;
    navigator.clipboard.writeText(message);
    showToast("Reporte copiado al portapapeles", "success");
  };

  const handleClose = () => {
    // If the modal was opened normally, it pushed a state.
    // If we close manually, we should pop it to keep history clean
    if (window.history.state?.modalOpen) {
      window.history.back();
    } else {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/95 backdrop-blur-xl flex justify-center items-center z-50 animate-modal-backdrop sm:p-4"
      onClick={handleClose}
    >
      {/* Modal Card - Fixed Max Height on Desktop, Full on Mobile */}
      <div
        className="bg-slate-900 w-full h-full sm:h-auto sm:max-h-[95vh] sm:max-w-6xl rounded-none sm:rounded-3xl shadow-2xl flex flex-col border border-slate-700/50 overflow-hidden animate-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Header Global - SAFE AREA OPTIMIZED FOR IOS/ANDROID */}
        <div className="px-4 pb-4 sm:pt-4 pt-12 bg-slate-800/80 border-b border-slate-700 flex justify-between items-center shrink-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={handleClose}
              className="sm:hidden -ml-1 p-2 rounded-full text-primary-400 active:scale-90 transition-transform"
              aria-label="Volver"
            >
              <ChevronLeft size={26} strokeWidth={2.5} />
            </button>
            <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 bg-gradient-to-br from-primary-600 to-indigo-700 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary-900/50">
              {client.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-xl font-heading font-bold text-white leading-tight truncate">
                {client.name}
              </h2>
              <div className="flex items-center gap-2 text-[10px] sm:text-sm text-slate-400">
                <span className="font-mono bg-slate-700/50 px-1.2 rounded truncate max-w-[80px] sm:max-w-none">
                  {client.idNumber || "Sin ID"}
                </span>
                <span className="w-1 h-1 bg-slate-600 rounded-full shrink-0"></span>
                <span
                  className={`font-bold shrink-0 ${loan.status === LoanStatus.OVERDUE ? "text-red-400" : "text-emerald-400"}`}
                >
                  {loan.status}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 sm:p-2.5 rounded-full hover:bg-slate-700 text-slate-400 transition-colors shrink-0 bg-slate-800/50 border border-slate-700 sm:border-transparent ml-2"
          >
            <X size={20} className="sm:hidden" />
            <X size={24} className="hidden sm:block" />
          </button>
        </div>

        {/* Body Wrapper */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
          {/* 2. Sidebar: Detalles del Cliente (Estilo Expediente) */}
          <div className="lg:w-80 bg-slate-800/30 border-r border-slate-700 overflow-y-auto p-6 hidden lg:block shrink-0">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <User size={14} /> Ficha del Cliente
            </h3>

            <div className="space-y-1 mb-6">
              <InfoRow icon={MapPin} label="Dirección" value={client.address} />
              <InfoRow
                icon={Phone}
                label="Teléfono"
                value={formatPhone(client.phone || "")}
                onCopy
              />
              <InfoRow icon={Mail} label="Email" value={client.email} onCopy />
              <InfoRow
                icon={Calendar}
                label="Cliente Desde"
                value={new Date(client.joinDate).toLocaleDateString()}
              />
            </div>

            <div className="bg-primary-900/20 rounded-xl p-4 border border-primary-500/20">
              <p className="text-[10px] text-primary-300 font-bold uppercase mb-1">
                Préstamo Actual
              </p>
              <p className="text-2xl font-bold text-white mb-2">
                {formatCurrency(loan.remainingCapital)}
              </p>
              <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500"
                  style={{ width: `${calculateLoanProgress(loan)}%` }}
                ></div>
              </div>
              <p className="text-xs text-right text-primary-400 mt-1">
                {calculateLoanProgress(loan).toFixed(0)}% Pagado
              </p>
            </div>
          </div>

          {/* 3. Main Content: Tabs y Vistas */}
          <div className="flex-1 flex flex-col bg-slate-900/50 min-w-0 min-h-0">
            {/* Tabs Navigation */}
            <div className="flex border-b border-slate-700 bg-slate-800/50 text-sm shrink-0 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab("details")}
                className={`flex-1 min-w-[90px] py-3 border-b-2 font-medium transition-colors ${activeTab === "details" ? "border-primary-500 text-primary-400 bg-primary-500/5" : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5"}`}
              >
                Gestión
              </button>
              <button
                onClick={() => setActiveTab("payment")}
                className={`flex-1 min-w-[90px] py-3 border-b-2 font-medium transition-colors ${activeTab === "payment" ? "border-primary-500 text-primary-400 bg-primary-500/5" : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5"}`}
              >
                Cobrar
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`flex-1 min-w-[90px] py-3 border-b-2 font-medium transition-colors ${activeTab === "history" ? "border-primary-500 text-primary-400 bg-primary-500/5" : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5"}`}
              >
                Historial
              </button>
              <button
                onClick={() => setActiveTab("edit")}
                className={`flex-1 min-w-[90px] py-3 border-b-2 font-medium transition-colors ${activeTab === "edit" ? "border-primary-500 text-primary-400 bg-primary-500/5" : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5"}`}
              >
                Editar
              </button>
              <button
                onClick={() => setActiveTab("security")}
                className={`flex-1 min-w-[90px] py-3 border-b-2 font-medium transition-colors ${activeTab === "security" ? "border-primary-500 text-red-400 bg-red-500/5" : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5"}`}
              >
                Seguridad
              </button>
            </div>

            {/* Scrollable Container with Fixes */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 scroll-smooth pb-32 touch-pan-y min-h-0">
              {/* TAB: GESTIÓN (Dashboard) */}
              {activeTab === "details" && (
                <div className="space-y-6 animate-fade-in">
                  {/* Mobile Client Info */}
                  <div className="lg:hidden bg-slate-800 p-4 rounded-xl border border-slate-700 mb-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3 text-sm text-slate-300">
                        <Phone size={16} className="text-slate-500" />{" "}
                        <a
                          href={`tel:${client.phone}`}
                          className="hover:text-primary-400 transition-colors"
                        >
                          {formatPhone(client.phone || "")}
                        </a>
                      </div>
                      {client.address && (
                        <div className="flex items-center gap-3 text-sm text-slate-300">
                          <MapPin size={16} className="text-slate-500" />{" "}
                          <span className="truncate">{client.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                      <p className="text-xs text-slate-400 uppercase">
                        Capital Inicial
                      </p>
                      <p className="text-lg font-bold text-white mt-1">
                        {formatCurrency(loan.initialCapital)}
                      </p>
                      {loan.source && (
                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
                          Origen: {loan.source}
                        </p>
                      )}
                    </div>
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 relative overflow-hidden">
                      <div className="absolute right-0 top-0 p-2 opacity-10">
                        <Banknote size={40} />
                      </div>
                      <p className="text-xs text-primary-400 font-bold uppercase">
                        Capital Pendiente
                      </p>
                      <p className="text-2xl font-bold text-white mt-1">
                        {formatCurrency(loan.remainingCapital)}
                      </p>
                    </div>
                    <div
                      className={`bg-slate-800 p-4 rounded-xl border border-slate-700`}
                    >
                      <p className="text-xs text-slate-400 font-bold uppercase">
                        Meses en Mora
                      </p>
                      <p className={`text-lg font-bold mt-1 text-slate-200`}>
                        {
                          (loan.overdueHistory || []).filter(
                            (h) => h.status === "pendiente",
                          ).length
                        }
                      </p>
                      <p className="text-[10px] text-slate-500 leading-tight mt-1">
                        Registros pendientes de cobro informativo
                      </p>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                      <p className="text-xs text-slate-400 uppercase">
                        Interés Generado
                      </p>
                      <p className="text-lg font-bold text-green-400 mt-1">
                        {formatCurrency(loan.totalInterestPaid)}
                      </p>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                      <p className="text-xs text-slate-400 uppercase">Plazo</p>
                      <p className="text-lg font-bold text-white mt-1 flex items-center gap-2">
                        {isIndefinite ? <InfinityIcon size={20} /> : loan.term}
                        <span className="text-xs font-normal text-slate-500">
                          {isIndefinite ? "Indefinido" : "Meses"}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Liquidación Total Card */}
                  <div className="bg-gradient-to-r from-indigo-900/40 to-slate-800 border border-indigo-500/30 rounded-xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h4 className="text-indigo-400 font-bold flex items-center gap-2 text-lg">
                        <Check size={20} /> Liquidación Total
                      </h4>
                      <p className="text-sm text-slate-400 mt-1">
                        Monto total para cancelar la deuda completa (Capital +
                        Intereses).
                      </p>
                    </div>
                    <div className="text-left sm:text-right w-full sm:w-auto bg-slate-900/50 sm:bg-transparent p-3 sm:p-0 rounded-lg border border-slate-700/50 sm:border-none">
                      <p className="text-xs text-slate-500 uppercase font-bold mb-1 sm:hidden">
                        Total a Pagar
                      </p>
                      <p className="text-3xl font-bold text-white font-mono">
                        {formatCurrency(totalLiquidationAmount)}
                      </p>
                      <button
                        onClick={() => {
                          setActiveTab("payment");
                          setQuickAmount("full");
                        }}
                        className="mt-2 w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-lg shadow-indigo-900/20"
                      >
                        Liquidar Préstamo
                      </button>
                    </div>
                  </div>

                  {/* Nueva Sección: Historial de Mora Informativo */}
                  <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                      <div>
                        <h4 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                          <Clock size={16} className="text-amber-400" />{" "}
                          Historial de Mora Informativo
                        </h4>
                        <p className="text-[10px] text-slate-500 uppercase font-bold mt-1">
                          Registro de meses no abonados (No afecta saldo
                          contable)
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        <div className="flex flex-1 sm:flex-none items-center bg-slate-700/50 rounded-lg border border-slate-600 overflow-hidden shadow-lg">
                          <select
                            value={msgType}
                            onChange={(e) => setMsgType(e.target.value as any)}
                            className="bg-transparent px-3 py-2 text-[10px] font-bold text-slate-300 outline-none border-r border-slate-600 cursor-pointer hover:bg-slate-700 transition-colors"
                          >
                            <option value="recommended">Recomendado</option>
                            <option value="direct">Directo</option>
                            <option value="premium">Premium</option>
                          </select>
                          <button
                            onClick={handleCopyReport}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 active:scale-95"
                            title="Copiar Recordatorio de Mora"
                          >
                            <Copy size={14} /> Copiar
                          </button>
                        </div>
                        <button
                          onClick={() => {
                            const nextStatus =
                              loan.status === LoanStatus.OVERDUE
                                ? LoanStatus.PENDING
                                : LoanStatus.OVERDUE;
                            handleUpdateLoan(loan.id, { status: nextStatus });
                            showToast(
                              `Estado del préstamo cambiado a ${nextStatus}`,
                              "info",
                            );
                          }}
                          className={`flex-1 sm:flex-none px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-all border ${
                            loan.status === LoanStatus.OVERDUE
                              ? "bg-emerald-900/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-900/40"
                              : "bg-amber-900/20 text-amber-400 border-amber-500/30 hover:bg-amber-900/40"
                          }`}
                        >
                          {loan.status === LoanStatus.OVERDUE
                            ? "Quitar Vencido"
                            : "Marcar Vencido"}
                        </button>
                        <button
                          onClick={() =>
                            setShowManualOverdue(!showManualOverdue)
                          }
                          className="flex-1 sm:flex-none px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px] font-bold rounded uppercase border border-slate-600 transition-colors"
                        >
                          {showManualOverdue ? "Cerrar" : "+ Añadir Registro"}
                        </button>
                        {loan.overdueHistory &&
                          loan.overdueHistory.length > 0 && (
                            <button
                              onClick={() => {
                                showConfirmModal({
                                  title: "Limpiar Historial de Mora",
                                  message:
                                    "¿Estás seguro de que deseas borrar TODO el historial informativo de mora? Esta acción no se puede deshacer.",
                                  onConfirm: () =>
                                    handleClearOverdueHistory(loan.id),
                                  type: "danger",
                                });
                              }}
                              className="flex-1 sm:flex-none px-3 py-1.5 bg-red-900/20 hover:bg-red-900/40 text-red-400 text-[10px] font-bold rounded uppercase border border-red-500/30 transition-colors"
                            >
                              Limpiar Todo
                            </button>
                          )}
                      </div>
                    </div>

                    {showManualOverdue && (
                      <div className="mb-6 p-4 bg-slate-900/50 border border-slate-700 rounded-xl space-y-4 animate-fade-in-down">
                        <h5 className="text-xs font-bold text-slate-300 uppercase">
                          Registrar interés vencido manualmente
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <InputField
                            label="Mes"
                            name="month"
                            placeholder="Ej: Mayo"
                            value={manualOverdueMonth}
                            onChange={(e) =>
                              setManualOverdueMonth(e.target.value)
                            }
                          />
                          <InputField
                            label="Año"
                            name="year"
                            type="number"
                            value={String(manualOverdueYear)}
                            onChange={(e) =>
                              setManualOverdueYear(parseInt(e.target.value))
                            }
                          />
                          <InputField
                            label="Monto (€)"
                            name="amount"
                            type="number"
                            value={manualOverdueAmount}
                            onChange={(e) =>
                              setManualOverdueAmount(e.target.value)
                            }
                          />
                        </div>
                        <button
                          onClick={async () => {
                            const amount = parseFloat(manualOverdueAmount);
                            if (!manualOverdueMonth || isNaN(amount)) {
                              showToast(
                                "Complete los campos correctamente",
                                "error",
                              );
                              return;
                            }
                            await handleManualAddOverdue(
                              loan.id,
                              manualOverdueMonth,
                              manualOverdueYear,
                              amount,
                            );
                            setManualOverdueMonth("");
                            setManualOverdueAmount("");
                            setShowManualOverdue(false);
                          }}
                          className="w-full bg-primary-600 hover:bg-primary-500 text-white text-[10px] font-bold py-2 rounded uppercase transition-colors"
                        >
                          Confirmar registro manual
                        </button>
                      </div>
                    )}

                    {currentSuggestion && (
                      <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl animate-pulse-slow">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-amber-500/20 rounded-full text-amber-500">
                            <AlertTriangle size={18} />
                          </div>
                          <div>
                            <h5 className="text-sm font-bold text-amber-200">
                              Mora detectada (+35 días)
                            </h5>
                            <p className="text-xs text-amber-400/80">
                              Periodo sugerido: {currentSuggestion.monthName}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            handleConfirmOverdue(loan.id, currentSuggestion)
                          }
                          className="w-full bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold py-2.5 rounded-lg transition-all shadow-lg shadow-amber-900/20 flex items-center justify-center gap-2"
                        >
                          <Check size={16} /> Confirmar Interés Vencido
                          Informativo
                        </button>
                      </div>
                    )}

                    {!loan.overdueHistory ||
                    loan.overdueHistory.length === 0 ? (
                      <div className="text-center py-6 bg-slate-900/30 rounded-lg border border-dashed border-slate-700">
                        <p className="text-xs text-slate-500 italic">
                          No hay registros de mora para este préstamo.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {loan.overdueHistory.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`p-1.5 rounded-full ${
                                  item.status === "pendiente"
                                    ? "bg-red-500/10 text-red-500"
                                    : item.status === "reclamado"
                                      ? "bg-emerald-500/10 text-emerald-500"
                                      : "bg-slate-700 text-slate-400"
                                }`}
                              >
                                {item.status === "pendiente" ? (
                                  <AlertTriangle size={14} />
                                ) : item.status === "reclamado" ? (
                                  <Check size={14} />
                                ) : (
                                  <X size={14} />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-bold text-slate-200">
                                    {item.monthName} {item.year}
                                  </p>
                                  <span
                                    className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                                      item.status === "pendiente"
                                        ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                        : item.status === "reclamado"
                                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                          : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                    }`}
                                  >
                                    {item.status === "pendiente"
                                      ? "Deuda de Mora"
                                      : item.status === "reclamado"
                                        ? "Mora Cobrada"
                                        : "Mora Perdonada / Anulada"}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  Importe:{" "}
                                  <span className="font-extrabold text-slate-300">
                                    {formatCurrency(item.amount)}
                                  </span>
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              <button
                                onClick={() =>
                                  handleToggleOverdueStatus(
                                    loan.id,
                                    item.id,
                                    "pendiente",
                                  )
                                }
                                title="Marcar este mes como Mora Pendiente"
                                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-colors ${
                                  item.status === "pendiente"
                                    ? "bg-red-500 text-white font-extrabold"
                                    : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                                }`}
                              >
                                Mora
                              </button>
                              <button
                                onClick={() =>
                                  handleToggleOverdueStatus(
                                    loan.id,
                                    item.id,
                                    "reclamado",
                                  )
                                }
                                title="Marcar este interés como cobrado con éxito"
                                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-colors ${
                                  item.status === "reclamado"
                                    ? "bg-emerald-600 text-white font-extrabold"
                                    : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                                }`}
                              >
                                Cobrado
                              </button>
                              <button
                                onClick={() =>
                                  handleToggleOverdueStatus(
                                    loan.id,
                                    item.id,
                                    "anulado",
                                  )
                                }
                                title="Perdonar mora al deudor inmediatamente (se resta de su saldo de interés de forma transparente sin generar registros contables ni alterar fondos)"
                                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all flex items-center gap-1 ${
                                  item.status === "anulado"
                                    ? "bg-amber-600 hover:bg-amber-500 text-stone-950 font-extrabold shadow-sm"
                                    : "bg-amber-950/45 text-amber-400 hover:bg-amber-900/40 border border-amber-500/20"
                                }`}
                              >
                                🤝 Perdonar Mora
                              </button>
                              <button
                                onClick={() => {
                                  showConfirmModal({
                                    title: "Eliminar Registro de Mora",
                                    message: `¿Eliminar completamente el registro de ${item.monthName} ${item.year}?`,
                                    onConfirm: () =>
                                      handleDeleteOverdueMonth(
                                        loan.id,
                                        item.id,
                                      ),
                                    type: "warning",
                                  });
                                }}
                                title="Eliminar registro"
                                className="p-1 rounded bg-red-900/20 text-red-400 hover:bg-red-900/30 transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* Explicación de impacto contable - Limpio y visible */}
                        <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3.5 text-left mt-2">
                          <p className="text-[10px] text-amber-400/95 leading-relaxed font-sans">
                            💡 <strong>EFECTO CONTABLE DEL PERDÓN:</strong> Al
                            seleccionar{" "}
                            <span className="font-extrabold text-[#f59e0b]">
                              "🤝 Perdonar Mora"
                            </span>
                            , el sistema resta el importe del interés pendiente
                            del cliente de forma inmediata para que no deba esa
                            cantidad. Al hacerlo con este botón se garantiza una
                            remisión totalmente limpia que{" "}
                            <strong>
                              no genera flujos de dinero ficticios en la caja ni
                              altera la contabilidad general de la empresa
                            </strong>
                            .
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 h-full">
                      <h4 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
                        <FileText size={16} /> Notas del Préstamo
                      </h4>
                      <div className="bg-slate-900/50 p-3 rounded-lg min-h-[100px] text-sm text-slate-400 italic border border-slate-700/50">
                        {loan.notes ||
                          "No hay notas registradas para este préstamo."}
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-slate-800 to-slate-800 p-5 rounded-xl border border-slate-700 flex flex-col justify-center items-center text-center">
                      <div className="mb-3 p-3 bg-green-500/10 rounded-full text-green-400">
                        <Banknote size={32} />
                      </div>
                      <h4 className="font-bold text-white mb-1">
                        Acción Rápida
                      </h4>
                      <p className="text-xs text-slate-400 mb-4">
                        Registrar un nuevo cobro para este cliente.
                      </p>
                      <button
                        onClick={() => setActiveTab("payment")}
                        className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg shadow-lg transition-all transform hover:scale-105"
                      >
                        Ir a Pagos
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: PAGOS */}
              {activeTab === "payment" && (
                <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
                  <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                      <Banknote className="text-green-400" /> Registrar Nuevo
                      Cobro
                    </h3>

                    <div className="flex gap-2 mb-6">
                      <button
                        onClick={() => setQuickAmount("interest")}
                        className="flex-1 py-3 px-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-[10px] sm:text-xs font-bold text-slate-300 transition-colors border border-slate-600"
                      >
                        Intereses Pendientes (
                        {formatCurrency(
                          pendingInterestDisplay + totalOverdueInterest,
                        )}
                        )
                      </button>
                      <button
                        onClick={() => setQuickAmount("full")}
                        className="flex-1 py-3 px-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-[10px] sm:text-xs font-bold text-slate-300 transition-colors border border-slate-600"
                      >
                        Liquidar Total ({formatCurrency(totalLiquidationAmount)}
                        )
                      </button>
                    </div>

                    <form onSubmit={handlePaymentSubmit} className="space-y-6">
                      <MoneyInput
                        label="Monto Recibido"
                        value={paymentAmount}
                        onChange={setPaymentAmount}
                        autoFocus
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                            Método de Pago
                          </label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setPaymentMethod("Efectivo")}
                              className={`flex-1 py-2 px-1 rounded-lg text-xs font-bold flex flex-col items-center gap-1 border ${paymentMethod === "Efectivo" ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/50" : "bg-slate-700 text-slate-400 border-slate-600"}`}
                            >
                              <Banknote size={16} /> Efectivo
                            </button>
                            <button
                              type="button"
                              onClick={() => setPaymentMethod("Banco")}
                              className={`flex-1 py-2 px-1 rounded-lg text-xs font-bold flex flex-col items-center gap-1 border ${paymentMethod === "Banco" ? "bg-blue-600/20 text-blue-400 border-blue-500/50" : "bg-slate-700 text-slate-400 border-slate-600"}`}
                            >
                              <CreditCard size={16} /> Banco
                            </button>
                          </div>
                        </div>
                        <InputField
                          label="Fecha"
                          name="date"
                          type="date"
                          value={paymentDate}
                          onChange={(e) => setPaymentDate(e.target.value)}
                        />
                      </div>

                      <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-600/50">
                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">
                          Nuevo Saldo
                        </p>
                        <p className="text-lg font-bold text-white font-mono">
                          {formatCurrency(
                            paymentPreview?.newBalance || loan.remainingCapital,
                          )}
                        </p>
                      </div>

                      {paymentPreview && (
                        <div className="text-xs space-y-1 px-2">
                          {paymentPreview.regularInterestPaid > 0 && (
                            <div className="flex justify-between text-amber-400 font-bold bg-amber-400/5 px-2 py-1 rounded">
                              <span>
                                Cobro Interés Mensual ({loan.interestRate}%):
                              </span>
                              <span className="font-mono">
                                -
                                {formatCurrency(
                                  paymentPreview.regularInterestPaid,
                                )}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between text-slate-400">
                            <span>Aplica a Capital:</span>
                            <span className="text-blue-400 font-mono">
                              {formatCurrency(paymentPreview.capitalPart)}
                            </span>
                          </div>
                        </div>
                      )}

                      <textarea
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        placeholder="Notas opcionales del pago..."
                        rows={2}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 text-sm resize-none focus:ring-2 focus:ring-primary-500 outline-none"
                      />

                      <button
                        type="submit"
                        disabled={!paymentAmount || isSubmitting}
                        className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg transition-transform active:scale-95"
                      >
                        {isSubmitting ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <Check />
                        )}
                        CONFIRMAR COBRO
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {activeTab === "history" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                    <h3 className="font-bold text-slate-200">
                      Historial de Transacciones
                    </h3>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() =>
                          setShowInterestCovered(!showInterestCovered)
                        }
                        className={`flex items-center gap-2 px-3 py-1.5 rounded bg-slate-800 border transition-all ${
                          showInterestCovered
                            ? "border-amber-500/50 text-amber-400"
                            : "border-slate-700 text-slate-400 hover:border-slate-600"
                        }`}
                      >
                        <div
                          className={`w-8 h-4 rounded-full relative transition-colors ${showInterestCovered ? "bg-amber-500" : "bg-slate-600"}`}
                        >
                          <div
                            className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${showInterestCovered ? "left-4.5" : "left-0.5"}`}
                          />
                        </div>
                        <span className="text-[10px] font-bold uppercase">
                          Interés Cubierto
                        </span>
                      </button>
                      <button
                        onClick={() =>
                          generateLoanHistoryPDF(loan, showInterestCovered)
                        }
                        className="text-xs flex items-center gap-1 bg-slate-700 px-3 py-1.5 rounded hover:bg-slate-600 text-white transition-colors"
                      >
                        <FileDown size={14} /> Exportar PDF
                      </button>
                    </div>
                  </div>
                  <PaymentHistory loan={loan} />
                </div>
              )}

              {activeTab === "edit" && (
                <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-10">
                  <div className="bg-red-900/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-red-200 font-bold mb-1">
                        Modo Edición Avanzada
                      </p>
                      <p className="text-xs text-red-300/80">
                        Ten cuidado al modificar estos datos. Los ajustes de
                        saldo generan automáticamente un registro en el
                        historial para mantener la contabilidad.
                      </p>
                    </div>
                  </div>

                  {/* Unified Form for better submission handling */}
                  <form onSubmit={handleUpdateSubmit} className="space-y-6">
                    {/* SECCIÓN 1: DATOS DEL PRÉSTAMO */}
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-4">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-700 pb-2">
                        <Banknote size={20} className="text-green-400" />
                        Datos del Préstamo
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="relative">
                          <InputField
                            label="Capital Inicial (€)"
                            name="amount"
                            type="number"
                            value={String(loanFormData.amount || "")}
                            onChange={(e) =>
                              setLoanFormData({
                                ...loanFormData,
                                amount: Number(e.target.value),
                              })
                            }
                            step="0.01"
                          />
                          {hasHistory && (
                            <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center rounded border border-slate-600 cursor-not-allowed">
                              <span className="text-xs text-slate-300 flex items-center gap-1 font-bold bg-slate-900 px-2 py-1 rounded-full border border-slate-700">
                                <Lock size={12} /> Bloqueado por Historial
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Safe Balance Adjustment */}
                        <div className="relative">
                          <label className="block text-sm font-medium text-slate-300 mb-1">
                            Capital Pendiente (€)
                          </label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <input
                                type="number"
                                value={String(
                                  loanFormData.remainingCapital || "",
                                )}
                                readOnly
                                className="w-full px-3 py-2 border border-slate-600 rounded-lg shadow-sm bg-slate-900/50 text-slate-400 cursor-not-allowed font-mono"
                              />
                              <Lock
                                size={16}
                                className="absolute right-3 top-3 text-slate-500"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setShowCorrectionInput(!showCorrectionInput);
                                setShowCondonationPanel(false);
                              }}
                              className={`px-3 py-2 rounded-lg border transition-all ${
                                showCorrectionInput
                                  ? "bg-slate-600 text-white border-white"
                                  : "bg-slate-700 hover:bg-slate-600 text-slate-300 border-slate-600"
                              }`}
                              title="Corregir Capital Manualmente"
                            >
                              <RotateCcw size={18} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowCondonationPanel(!showCondonationPanel);
                                setShowCorrectionInput(false);
                              }}
                              className={`px-3 py-2 text-xs font-extrabold rounded-lg border flex items-center gap-1.5 transition-all ${
                                showCondonationPanel
                                  ? "bg-amber-600 hover:bg-amber-500 text-stone-950 border-amber-400 font-extrabold shadow-sm animate-pulse"
                                  : "bg-amber-950/45 text-amber-400 hover:bg-amber-900/40 border-amber-500/20"
                              }`}
                              title="Perdonar (Condonar) Capital de Deuda por % o Total"
                            >
                              🤝 Condonar Capital
                            </button>
                          </div>
                        </div>

                        {showCorrectionInput && (
                          <div className="sm:col-span-2 bg-slate-900/50 p-4 rounded-lg border border-slate-600 animate-fade-in-down">
                            <h4 className="text-sm font-bold text-slate-200 mb-3">
                              Corrección de Saldo Segura
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                              <InputField
                                label="Nuevo Saldo Real (€)"
                                name="newBalance"
                                type="number"
                                value={correctionBalance}
                                onChange={(e) =>
                                  setCorrectionBalance(e.target.value)
                                }
                              />
                              <InputField
                                label="Motivo del Ajuste"
                                name="reason"
                                type="text"
                                value={correctionReason}
                                onChange={(e) =>
                                  setCorrectionReason(e.target.value)
                                }
                                placeholder="Ej: Error de cálculo, Descuento..."
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setShowCorrectionInput(false)}
                                className="px-3 py-2 text-xs font-bold text-slate-400 hover:text-white"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={handleCorrectionSubmit}
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg flex items-center gap-2"
                              >
                                {isSubmitting ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <Save size={12} />
                                )}{" "}
                                Aplicar Corrección
                              </button>
                            </div>
                          </div>
                        )}

                        {showCondonationPanel && (
                          <div className="sm:col-span-2 bg-slate-900/50 p-5 rounded-xl border border-amber-500/25 animate-fade-in-down space-y-4">
                            <div className="flex items-start gap-2 border-b border-slate-800 pb-2">
                              <span className="text-xl">🤝</span>
                              <div>
                                <h4 className="text-sm font-black text-amber-400 font-heading">
                                  Condonación Directa de Capital (Opción C)
                                </h4>
                                <p className="text-[10px] text-slate-400">
                                  Configura el porcentaje o cantidad de capital a perdonar formalmente de forma no contable.
                                </p>
                              </div>
                            </div>

                            {/* Info warning box */}
                            <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-3">
                              <p className="text-[10px] text-amber-400 leading-relaxed font-sans">
                                💡 <strong>PROTECCIÓN CONTABLE DEL COBRO:</strong> El descuento se deduce
                                de manera directa en el saldo deudor del cliente. El sistema creará un ajuste de
                                amortización con <strong>importe cobrado de €0</strong>, garantizando que{" "}
                                <strong>no se altere el dinero real de caja</strong> ni se registren flujos ficticios de entrada.
                              </p>
                            </div>

                            {/* Condonation percentage options */}
                            <div>
                              <label className="block text-2xs uppercase tracking-wider font-extrabold text-slate-400 mb-1.5 font-mono">
                                Selecciona el Porcentaje a Condonar
                              </label>
                              <div className="grid grid-cols-4 gap-2 mb-3">
                                {[10, 25, 50, 100].map((pct) => (
                                  <button
                                    key={pct}
                                    type="button"
                                    onClick={() => setCondonationPercent(pct)}
                                    className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                                      condonationPercent === pct
                                        ? "bg-amber-500/25 text-amber-400 border-amber-500/40 font-extrabold"
                                        : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-750"
                                    }`}
                                  >
                                    {pct}% {pct === 100 ? "(Total)" : ""}
                                  </button>
                                ))}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-2xs uppercase tracking-wider font-extrabold text-slate-400 mb-1.5 font-mono">
                                    Porcentaje Personalizado (%)
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    placeholder="Ej: 15"
                                    value={condonationPercent === "custom" ? customCondonationPercent : ""}
                                    onChange={(e) => {
                                      setCondonationPercent("custom");
                                      setCustomCondonationPercent(e.target.value);
                                    }}
                                    className="w-full px-3 py-2 border border-slate-600 rounded-lg shadow-sm bg-slate-900/50 text-slate-200 text-xs font-mono"
                                  />
                                </div>

                                {/* Preview box */}
                                <div className="bg-[#1c1816]/30 border border-amber-500/10 p-3 rounded-lg flex flex-col justify-center">
                                  <span className="text-[10px] text-slate-400 block tracking-tight">Cantidad a perdonar:</span>
                                  <span className="text-sm font-black text-amber-500 font-mono mt-0.5">
                                    {(() => {
                                      const pctValue = condonationPercent === "custom" ? parseFloat(customCondonationPercent) : condonationPercent;
                                      if (isNaN(pctValue as number) || (pctValue as number) <= 0 || (pctValue as number) > 100) return formatCurrency(0);
                                      return formatCurrency((loan.remainingCapital * (pctValue as number)) / 100);
                                    })()}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block tracking-tight mt-1">Nuevo capital pendiente final:</span>
                                  <span className="text-xs font-bold text-slate-300 font-mono mt-0.5 animate-pulse">
                                    {(() => {
                                      const pctValue = condonationPercent === "custom" ? parseFloat(customCondonationPercent) : condonationPercent;
                                      if (isNaN(pctValue as number) || (pctValue as number) <= 0 || (pctValue as number) > 100) return formatCurrency(loan.remainingCapital);
                                      const condoned = (loan.remainingCapital * (pctValue as number)) / 100;
                                      return formatCurrency(Math.max(0, loan.remainingCapital - condoned));
                                    })()}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Condonation Notes */}
                            <div>
                              <label className="block text-2xs uppercase tracking-wider font-extrabold text-slate-400 mb-1 font-mono">
                                Justificante o Motivo
                              </label>
                              <input
                                type="text"
                                placeholder="Ej: Acuerdo mutuo de condonación, liquidación voluntaria..."
                                value={condonationNotes}
                                onChange={(e) => setCondonationNotes(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-600 rounded-lg shadow-sm bg-slate-900/50 text-slate-200 text-xs"
                              />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                              <button
                                type="button"
                                onClick={() => setShowCondonationPanel(false)}
                                className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={handleCondonationSubmit}
                                className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-450 text-stone-950 rounded-lg shadow transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                {isSubmitting ? (
                                  <>
                                    <Loader2 size={12} className="animate-spin" /> Procesando...
                                  </>
                                ) : (
                                  <>
                                    <Save size={12} /> Confirmar Condonación
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        <InputField
                          label="Tasa Interés Anual (%)"
                          name="interestRate"
                          type="number"
                          value={String(loanFormData.interestRate || "")}
                          onChange={(e) =>
                            setLoanFormData({
                              ...loanFormData,
                              interestRate: Number(e.target.value),
                            })
                          }
                          step="0.01"
                        />
                        <InputField
                          label="Plazo (Meses)"
                          name="term"
                          type="number"
                          value={String(loanFormData.term || "")}
                          onChange={(e) =>
                            setLoanFormData({
                              ...loanFormData,
                              term: Number(e.target.value),
                            })
                          }
                        />
                        <InputField
                          label="Fecha Inicio"
                          name="startDate"
                          type="date"
                          value={String(loanFormData.startDate || "")}
                          onChange={(e) =>
                            setLoanFormData({
                              ...loanFormData,
                              startDate: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    {/* SECCIÓN 2: DATOS DEL CLIENTE */}
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-4">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-700 pb-2">
                        <User size={20} className="text-blue-400" />
                        Datos del Cliente
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="sm:col-span-2">
                          <InputField
                            label="Nombre Completo"
                            name="name"
                            type="text"
                            value={clientFormData.name || ""}
                            onChange={(e) =>
                              setClientFormData({
                                ...clientFormData,
                                name: e.target.value,
                              })
                            }
                          />
                        </div>
                        <InputField
                          label="DNI / NIE"
                          name="idNumber"
                          type="text"
                          value={clientFormData.idNumber || ""}
                          onChange={(e) =>
                            setClientFormData({
                              ...clientFormData,
                              idNumber: e.target.value,
                            })
                          }
                        />
                        <InputField
                          label="Teléfono"
                          name="phone"
                          type="text"
                          value={clientFormData.phone || ""}
                          onChange={(e) =>
                            setClientFormData({
                              ...clientFormData,
                              phone: e.target.value,
                            })
                          }
                        />
                        <div className="sm:col-span-2">
                          <InputField
                            label="Dirección"
                            name="address"
                            type="text"
                            value={clientFormData.address || ""}
                            onChange={(e) =>
                              setClientFormData({
                                ...clientFormData,
                                address: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="pt-4 flex flex-col sm:flex-row justify-between items-center border-t border-slate-700 mt-4 gap-4 pb-2">
                        <button
                          type="button"
                          onClick={onDelete}
                          className="text-red-400 text-sm flex items-center gap-2 hover:bg-red-500/10 px-3 py-2 rounded transition-colors w-full sm:w-auto justify-center"
                        >
                          <Trash2 size={16} /> Cerrar/Eliminar Préstamo
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="px-8 py-3 bg-primary-600 text-white font-bold rounded-lg hover:bg-primary-500 shadow-lg w-full sm:w-auto flex items-center justify-center gap-2"
                        >
                          {isSubmitting ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            <Save />
                          )}
                          Guardar Cambios
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB: SEGURIDAD (Zona de Peligro) */}
              {activeTab === "security" && (
                <div className="space-y-6 animate-fade-in p-2">
                  <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                      <Lock size={24} className="text-red-500" />
                      Seguridad y Borrado Crítico
                    </h3>

                    <div className="p-6 bg-red-950/20 border border-red-500/20 rounded-2xl">
                      <div className="flex items-start gap-4 mb-6">
                        <div className="p-3 bg-red-500/20 text-red-500 rounded-xl">
                          <Trash2 size={24} />
                        </div>
                        <div>
                          <h4 className="text-red-400 font-bold uppercase tracking-widest text-sm mb-1">
                            Borrado Clean
                          </h4>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Opción restringida con contraseña (
                            <span className="font-mono text-white select-all">
                              bn8237
                            </span>
                            ). Elimina al cliente y revierte todos sus préstamos
                            y pagos de la contabilidad global. Úsalo solo para
                            registros de prueba.
                          </p>
                        </div>
                      </div>

                      {showCleanDeleteConfirm ? (
                        <div className="space-y-4 animate-fade-in-down py-4 border-t border-red-500/10">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">
                              Contraseña de Seguridad
                            </label>
                            <div className="relative">
                              <input
                                type="password"
                                placeholder="Ingrese la contraseña"
                                value={cleanDeletePassword}
                                onChange={(e) =>
                                  setCleanDeletePassword(e.target.value)
                                }
                                className="w-full bg-slate-900 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-red-500 outline-none"
                                autoFocus
                              />
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                setShowCleanDeleteConfirm(false);
                                setCleanDeletePassword("");
                              }}
                              className="flex-1 py-3 text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors uppercase"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={onCleanDelete}
                              className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-colors uppercase shadow-lg shadow-red-900/40"
                            >
                              Confirmar Borrado
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowCleanDeleteConfirm(true)}
                          className="w-full px-6 py-4 border border-red-500/30 text-red-500 hover:bg-red-500/10 rounded-2xl text-xs font-bold uppercase transition-all"
                        >
                          Activar Borrado Clean
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoanDetailsModal;
