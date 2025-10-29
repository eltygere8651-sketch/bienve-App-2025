
import { LoyaltyStatus } from './types';

// constants.ts
export const LOCAL_STORAGE_KEYS = {
    CREDENTIALS: 'bmContigoCredentials',
    FINANCIAL_TIP: 'financialTip',
    THEME: 'theme',
    CONTRACT_TEMPLATE: 'bmContigoContractTemplate',
};

export const SESSION_STORAGE_KEYS = {
    IS_ADMIN: 'isAdmin',
};

// FIX: Added LOYALTY_TIERS constant for the loyalty program feature.
export const LOYALTY_TIERS = {
    [LoyaltyStatus.BRONZE]: {
        name: LoyaltyStatus.BRONZE,
        pointsRequired: 0,
        interestRateModifier: 0,
    },
    [LoyaltyStatus.SILVER]: {
        name: LoyaltyStatus.SILVER,
        pointsRequired: 100,
        interestRateModifier: -0.01,
    },
    [LoyaltyStatus.GOLD]: {
        name: LoyaltyStatus.GOLD,
        pointsRequired: 250,
        interestRateModifier: -0.02,
    },
};
