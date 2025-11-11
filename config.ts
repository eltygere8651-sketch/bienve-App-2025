// Centralized configuration for business logic

// All interest rates are defined as annual percentage rates (APR)
export const DEFAULT_ANNUAL_INTEREST_RATE = 96; // 8% monthly * 12 months

export const INTEREST_RATE_CONFIG = {
    ANNUAL: DEFAULT_ANNUAL_INTEREST_RATE,
    MONTHLY: DEFAULT_ANNUAL_INTEREST_RATE / 12, // For display and simpler calculations
};
