/**
 * Subscription Management Utilities
 * Handles subscription renewal, reset logic, and expiry checks
 */

import {
  shouldResetFreeSessions,
  FREE_TIER_LIMITS,
} from "../config/pricing.js";

/**
 * Reset free sessions for a user
 * Called monthly for free tier users
 * @param {Object} subscription - User subscription object
 * @returns {Object} Updated subscription object
 */
export const resetFreeSessions = (subscription) => {
  if (!subscription) {
    return {
      status: "free",
      planType: "free",
      freeSessions: {
        used: 0,
        total: FREE_TIER_LIMITS.freeSessions,
      },
      freeSessionsLastResetDate: new Date(),
    };
  }

  const needsReset = shouldResetFreeSessions(
    subscription.freeSessionsLastResetDate,
  );

  if (needsReset && subscription.status === "free") {
    return {
      ...subscription,
      freeSessions: {
        used: 0,
        total: FREE_TIER_LIMITS.freeSessions,
      },
      freeSessionsLastResetDate: new Date(),
    };
  }

  return subscription;
};

/**
 * Check if subscription needs renewal (expired)
 * @param {Object} subscription - User subscription object
 * @returns {boolean} True if subscription has expired
 */
export const isSubscriptionExpired = (subscription) => {
  if (!subscription || subscription.status !== "premium") {
    return false;
  }

  if (!subscription.expiresAt) {
    return false;
  }

  return new Date() > new Date(subscription.expiresAt);
};

/**
 * Handle expired subscription
 * Reset user back to free tier if premium subscription expired
 * @param {Object} subscription - User subscription object
 * @returns {Object} Updated subscription object
 */
export const handleExpiredSubscription = (subscription) => {
  if (!subscription) {
    return subscription;
  }

  if (isSubscriptionExpired(subscription)) {
    return {
      status: "free",
      planType: "free",
      freeSessions: {
        used: 0,
        total: FREE_TIER_LIMITS.freeSessions,
      },
      freeSessionsLastResetDate: new Date(),
      expiresAt: null,
      lastPaymentDate: subscription.lastPaymentDate,
    };
  }

  return subscription;
};

/**
 * Apply subscription maintenance (reset free sessions, check expiry)
 * Called whenever user object is loaded
 * @param {Object} user - User object with subscription
 * @returns {Object} Updated user object
 */
export const applySubscriptionMaintenance = (user) => {
  if (!user || !user.subscription) {
    return user;
  }

  const sourceUser =
    typeof user.toObject === "function"
      ? user.toObject()
      : typeof user.toJSON === "function"
        ? user.toJSON()
        : user;

  // Check if expired
  let subscription = handleExpiredSubscription(sourceUser.subscription);

  // Reset free sessions if needed
  subscription = resetFreeSessions(subscription);

  return {
    ...sourceUser,
    subscription,
  };
};

/**
 * Format subscription info for API response
 * @param {Object} subscription - Subscription object
 * @returns {Object} Formatted subscription info
 */
export const formatSubscriptionResponse = (subscription) => {
  if (!subscription) {
    return {
      status: "free",
      planType: "free",
      isActive: false,
      isExpired: false,
      daysRemaining: null,
      expiresAt: null,
    };
  }

  const isExpired = isSubscriptionExpired(subscription);
  const daysRemaining = subscription.expiresAt
    ? Math.max(
        0,
        Math.ceil(
          (new Date(subscription.expiresAt) - new Date()) /
            (1000 * 60 * 60 * 24),
        ),
      )
    : null;

  return {
    status: subscription.status,
    planType: subscription.planType,
    isActive: subscription.status === "premium" && !isExpired,
    isExpired,
    daysRemaining,
    expiresAt: subscription.expiresAt,
    lastPaymentDate: subscription.lastPaymentDate,
    freeSessions: subscription.freeSessions,
  };
};

/**
 * Get subscription status message for user
 * @param {Object} user - User object
 * @returns {string} Status message
 */
export const getSubscriptionStatusMessage = (user) => {
  if (!user || !user.subscription) {
    return "Free tier - 1 session per month";
  }

  const { subscription } = user;

  if (subscription.status === "premium") {
    if (isSubscriptionExpired(subscription)) {
      return `Premium subscription expired on ${new Date(subscription.expiresAt).toDateString()}`;
    }

    const daysLeft = Math.ceil(
      (new Date(subscription.expiresAt) - new Date()) / (1000 * 60 * 60 * 24),
    );

    return `Premium ${subscription.planType} - ${daysLeft} days remaining`;
  }

  return "Free tier - 1 session per month";
};
