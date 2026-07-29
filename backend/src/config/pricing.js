// ==========================================
// Payment & Subscription Constants
// ==========================================

export const PRICING_TIERS = {
  monthly: {
    planType: 'monthly',
    name: 'Monthly Plan',
    amount: 19900, // ₹199 in paise
    currency: 'INR',
    durationDays: 30,
    sessionsLimit: -1, // unlimited
    description: 'Unlimited sessions for 30 days',
  },
  quarterly: {
    planType: 'quarterly',
    name: 'Quarterly Plan',
    amount: 49900, // ₹499 in paise
    currency: 'INR',
    durationDays: 90,
    sessionsLimit: -1, // unlimited
    description: 'Unlimited sessions for 90 days (Best Value)',
    discount: '17%',
  },
  annual: {
    planType: 'annual',
    name: 'Annual Plan',
    amount: 79900, // ₹799 in paise
    currency: 'INR',
    durationDays: 365,
    sessionsLimit: -1, // unlimited
    description: 'Unlimited sessions for 365 days',
    discount: '67%',
  },
};

// Free tier: 1 free session per month
export const FREE_TIER_LIMITS = {
  sessionsPerMonth: 1,
  freeSessions: 1,
};

// Session limits for free tier
export const SESSION_LIMITS = {
  free: {
    totalSessions: FREE_TIER_LIMITS.freeSessions,
    resetFrequency: 'monthly', // Reset every 30 days
  },
  premium: {
    totalSessions: -1, // unlimited
    resetFrequency: 'never',
  },
};

// Subscription statuses
export const SUBSCRIPTION_STATUS = {
  FREE: 'free',
  PREMIUM: 'premium',
  EXPIRED: 'expired',
};

// Plan types
export const PLAN_TYPES = {
  FREE: 'free',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  ANNUAL: 'annual',
  LIFETIME: 'lifetime',
};

// Payment statuses
export const PAYMENT_STATUS = {
  CREATED: 'created',
  ATTEMPTED: 'attempted',
  CAPTURED: 'captured',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

/**
 * Get pricing tier info
 * @param {string} planType - 'monthly' | 'quarterly' | 'annual'
 * @returns {Object} Pricing tier object
 */
export const getPricingTier = (planType) => {
  return PRICING_TIERS[planType] || null;
};

/**
 * Validate plan type
 * @param {string} planType
 * @returns {boolean}
 */
export const isValidPlanType = (planType) => {
  return Object.keys(PRICING_TIERS).includes(planType);
};

/**
 * Calculate subscription expiry date
 * @param {string} planType - 'monthly' | 'quarterly' | 'annual'
 * @param {Date} startDate - Start date (defaults to now)
 * @returns {Date} Expiry date
 */
export const calculateExpiryDate = (planType, startDate = new Date()) => {
  const tier = getPricingTier(planType);
  if (!tier) throw new Error(`Invalid plan type: ${planType}`);

  const expiryDate = new Date(startDate);
  expiryDate.setDate(expiryDate.getDate() + tier.durationDays);
  return expiryDate;
};

/**
 * Check if subscription is expired
 * @param {Date} expiryDate
 * @returns {boolean}
 */
export const isSubscriptionExpired = (expiryDate) => {
  if (!expiryDate) return false;
  return new Date() > new Date(expiryDate);
};

/**
 * Get current subscription status
 * @param {Object} subscriptionObj - User subscription object
 * @returns {string} 'free' | 'premium' | 'expired'
 */
export const getCurrentSubscriptionStatus = (subscriptionObj) => {
  if (!subscriptionObj) return SUBSCRIPTION_STATUS.FREE;

  const { status, expiresAt } = subscriptionObj;

  if (status === SUBSCRIPTION_STATUS.FREE) {
    return SUBSCRIPTION_STATUS.FREE;
  }

  if (status === SUBSCRIPTION_STATUS.PREMIUM) {
    if (expiresAt && isSubscriptionExpired(expiresAt)) {
      return SUBSCRIPTION_STATUS.EXPIRED;
    }
    return SUBSCRIPTION_STATUS.PREMIUM;
  }

  return SUBSCRIPTION_STATUS.FREE;
};

/**
 * Get sessions remaining for user
 * @param {Object} user - User object with subscription info
 * @returns {Object} { used, total, remaining, isUnlimited }
 */
export const getSessionsRemaining = (user) => {
  if (!user || !user.subscription) {
    return {
      used: 0,
      total: FREE_TIER_LIMITS.freeSessions,
      remaining: FREE_TIER_LIMITS.freeSessions,
      isUnlimited: false,
    };
  }

  const status = getCurrentSubscriptionStatus(user.subscription);

  if (status === SUBSCRIPTION_STATUS.PREMIUM) {
    return {
      used: 0,
      total: -1,
      remaining: -1,
      isUnlimited: true,
    };
  }

  // Free tier
  const { used = 0, total = FREE_TIER_LIMITS.freeSessions } = user.subscription.freeSessions || {};
  return {
    used,
    total,
    remaining: Math.max(0, total - used),
    isUnlimited: false,
  };
};

/**
 * Check if user can create a session
 * @param {Object} user - User object
 * @returns {Object} { allowed: boolean, reason?: string }
 */
export const canCreateSession = (user) => {
  if (!user) {
    return { allowed: false, reason: 'User not found' };
  }

  const status = getCurrentSubscriptionStatus(user.subscription);

  if (status === SUBSCRIPTION_STATUS.PREMIUM) {
    return { allowed: true };
  }

  if (status === SUBSCRIPTION_STATUS.EXPIRED) {
    return { allowed: false, reason: 'Subscription expired. Please renew to continue.' };
  }

  // Free tier: check sessions limit
  const sessions = getSessionsRemaining(user);
  if (sessions.remaining <= 0) {
    return {
      allowed: false,
      reason: `Free tier limit reached. Used ${sessions.used}/${sessions.total} sessions. Upgrade to premium for unlimited access.`,
    };
  }

  return { allowed: true };
};

/**
 * Reset free sessions for monthly users
 * Used by a cron job or manual task
 * @param {Date} lastResetDate
 * @returns {boolean} Whether reset is needed
 */
export const shouldResetFreeSessions = (lastResetDate) => {
  if (!lastResetDate) return true;

  const now = new Date();
  const daysSinceReset = Math.floor(
    (now - new Date(lastResetDate)) / (1000 * 60 * 60 * 24)
  );

  return daysSinceReset >= 30;
};
