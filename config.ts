
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
    
    // Fórmula de amortización (Cuota fija)
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
 * Calcula el interés mensual fijo basado en el capital pendiente.
 * Regla de negocio: 8% mensual sobre el capital adeudado, sin prorrateo por días.
 * 
 * @param capital Capital pendiente actual
 * @param annualRate Tasa anual (por defecto 96% -> 8% mensual)
 */
export const calculateMonthlyInterest = (
    capital: number, 
    annualRate: number = DEFAULT_ANNUAL_INTEREST_RATE
) => {
    // 96% Anual -> 8% Mensual -> 0.08
    const monthlyRateDecimal = (annualRate / 12) / 100;
    
    const interest = capital * monthlyRateDecimal;

    return {
        interest: isFinite(interest) ? interest : 0,
        rateUsed: monthlyRateDecimal
    };
};
