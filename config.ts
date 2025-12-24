
// Centralized configuration for business logic

// All interest rates are defined as annual percentage rates (APR)
export const DEFAULT_ANNUAL_INTEREST_RATE = 96; // 8% monthly * 12 months

export const INTEREST_RATE_CONFIG = {
    ANNUAL: DEFAULT_ANNUAL_INTEREST_RATE,
    MONTHLY: DEFAULT_ANNUAL_INTEREST_RATE / 12, // For display and simpler calculations
};

/**
 * Calcula los detalles de un préstamo basado en la configuración centralizada.
 * @param amount Capital prestado
 * @param term Plazo en meses
 * @param annualRate Tasa anual (por defecto la configurada globalmente)
 */
export const calculateLoanParameters = (amount: number, term: number, annualRate: number = DEFAULT_ANNUAL_INTEREST_RATE) => {
    if (isNaN(amount) || isNaN(term) || amount <= 0 || term <= 0) {
        return {
            monthlyPayment: 0,
            totalRepayment: 0,
            monthlyRate: 0,
            monthlyRatePercentage: 0
        };
    }

    const monthlyRatePercentage = annualRate / 12;
    const monthlyRateDecimal = monthlyRatePercentage / 100;
    
    // Fórmula de amortización (Cuota fija) o interés simple según regla de negocio. 
    // Basado en el código original: (Monto * TasaMensual) / (1 - (1 + TasaMensual)^-Plazo)
    const monthlyPayment = (amount * monthlyRateDecimal) / (1 - Math.pow(1 + monthlyRateDecimal, -term));
    const totalRepayment = monthlyPayment * term;

    return {
        monthlyPayment: isFinite(monthlyPayment) ? monthlyPayment : 0,
        totalRepayment: isFinite(totalRepayment) ? totalRepayment : 0,
        monthlyRate: monthlyRateDecimal,
        monthlyRatePercentage
    };
};

/**
 * Calcula el interés devengado entre dos fechas.
 * @param capital Capital pendiente actual
 * @param lastDate Fecha del último pago (o inicio del préstamo)
 * @param currentDate Fecha del pago actual
 * @param annualRate Tasa anual (por defecto la configurada globalmente)
 */
export const calculateAccruedInterest = (
    capital: number, 
    lastDate: string | Date, 
    currentDate: string | Date, 
    annualRate: number = DEFAULT_ANNUAL_INTEREST_RATE
) => {
    const start = new Date(lastDate);
    const end = new Date(currentDate);
    
    // Diferencia en milisegundos
    const diffTime = Math.abs(end.getTime() - start.getTime());
    // Diferencia en días (redondeado hacia arriba para cobrar al menos 1 día si pasó tiempo)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    // Evitar cálculos negativos si las fechas están invertidas por error
    const daysElapsed = Math.max(0, diffDays);

    // Tasa diaria = Tasa Anual / 360 (Año comercial estándar)
    // 96% Anual -> 0.96 / 360 = 0.00266 por día
    const dailyRate = (annualRate / 100) / 360;
    
    const interest = capital * dailyRate * daysElapsed;

    return {
        interest: isFinite(interest) ? interest : 0,
        daysElapsed
    };
};
