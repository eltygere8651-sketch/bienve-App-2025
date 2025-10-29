// Centralized configuration for business logic

// All interest rates are defined as annual percentage rates (APR)
const ANNUAL_INTEREST_RATE = 96; // 8% monthly * 12 months

export const INTEREST_RATE_CONFIG = {
    ANNUAL: ANNUAL_INTEREST_RATE,
    MONTHLY: ANNUAL_INTEREST_RATE / 12, // For display and simpler calculations
};
