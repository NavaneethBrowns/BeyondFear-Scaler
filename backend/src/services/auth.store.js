import mongoose from "mongoose";
import bcryptjs from "bcryptjs";
import User from "../models/User.js";
import { applySubscriptionMaintenance } from "../utils/subscription.js";

const isMongoReady = () => mongoose.connection?.readyState === 1;

const toPublicUser = (user) => {
  const { passwordHash, password, ...safeUser } = user;

  return safeUser;
};

const assertMongoReady = () => {
  if (!isMongoReady()) {
    throw new Error("MongoDB connection is not ready");
  }
};

export const findUserByEmail = async (email) => {
  assertMongoReady();
  const normalizedEmail = email.toLowerCase();
  return User.findOne({ email: normalizedEmail });
};

export const createUser = async ({ displayName, email, password }) => {
  assertMongoReady();
  const normalizedEmail = email.toLowerCase();
  const normalizedDisplayName =
    typeof displayName === "string" && displayName.trim().length > 0
      ? displayName.trim()
      : null;
  const user = new User({
    displayName: normalizedDisplayName,
    email: normalizedEmail,
    password,
  });
  await user.save();
  return user;
};

export const verifyUserPassword = async (user, plainPassword) => {
  assertMongoReady();
  if (typeof user?.comparePassword === "function") {
    return user.comparePassword(plainPassword);
  }

  return bcryptjs.compare(plainPassword, user.password);
};

export const touchLastLogin = async (user) => {
  const now = new Date();

  assertMongoReady();
  user.lastLoginAt = now;
  await user.save();
  return user;
};

export const getUserById = async (userId) => {
  assertMongoReady();
  const user = await User.findById(userId);

  if (user) {
    // Apply subscription maintenance (check expiry, reset free sessions)
    return applySubscriptionMaintenance(user);
  }

  return user;
};

export const updateUserProfile = async (
  userId,
  { displayName, avatar, preferences },
) => {
  assertMongoReady();
  return User.findByIdAndUpdate(
    userId,
    {
      ...(displayName && { displayName }),
      ...(avatar && { avatar }),
      ...(preferences && { preferences }),
    },
    { new: true },
  );
};

export const toUserResponse = (user) => {
  if (!user) return null;

  const raw =
    typeof user.toJSON === "function" ? user.toJSON() : toPublicUser(user);
  const derivedDisplayName =
    raw.displayName ||
    raw.username ||
    raw.name ||
    (typeof raw.email === "string" ? raw.email.split("@")[0] : null) ||
    null;

  return {
    ...raw,
    displayName: derivedDisplayName,
  };
};

/**
 * Update user subscription with full validation
 * @param {string} userId - User ID
 * @param {Object} subscriptionPatch - Subscription updates
 * @returns {Object} Updated user object
 */
export const updateUserSubscription = async (userId, subscriptionPatch) => {
  assertMongoReady();

  if (!subscriptionPatch || Object.keys(subscriptionPatch).length === 0) {
    return User.findById(userId);
  }

  const update = {};

  // Handle top-level subscription fields
  if (subscriptionPatch.status) {
    update["subscription.status"] = subscriptionPatch.status;
  }

  if (subscriptionPatch.planType) {
    update["subscription.planType"] = subscriptionPatch.planType;
  }

  if (subscriptionPatch.expiresAt) {
    update["subscription.expiresAt"] = subscriptionPatch.expiresAt;
  }

  if (subscriptionPatch.lastPaymentDate) {
    update["subscription.lastPaymentDate"] = subscriptionPatch.lastPaymentDate;
  }

  if (subscriptionPatch.nextResetDate) {
    update["subscription.nextResetDate"] = subscriptionPatch.nextResetDate;
  }

  if (subscriptionPatch.freeSessionsLastResetDate) {
    update["subscription.freeSessionsLastResetDate"] =
      subscriptionPatch.freeSessionsLastResetDate;
  }

  // Handle freeSessions object
  if (subscriptionPatch.freeSessions) {
    if (typeof subscriptionPatch.freeSessions.used === "number") {
      update["subscription.freeSessions.used"] =
        subscriptionPatch.freeSessions.used;
    }
    if (typeof subscriptionPatch.freeSessions.total === "number") {
      update["subscription.freeSessions.total"] =
        subscriptionPatch.freeSessions.total;
    }
  }

  // Legacy support for old field names
  if (typeof subscriptionPatch.freeSessionsUsed === "number") {
    update["subscription.freeSessions.used"] =
      subscriptionPatch.freeSessionsUsed;
  }

  if (typeof subscriptionPatch.freeSessionsTotal === "number") {
    update["subscription.freeSessions.total"] =
      subscriptionPatch.freeSessionsTotal;
  }

  const updatedUser = await User.findByIdAndUpdate(userId, update, {
    new: true,
  });

  // Apply subscription maintenance
  return applySubscriptionMaintenance(updatedUser);
};

export const reserveFreeSessionSlot = async (userId) => {
  assertMongoReady();

  return User.findOneAndUpdate(
    {
      _id: userId,
      "subscription.status": "free",
      $expr: {
        $lt: ["$subscription.freeSessions.used", "$subscription.freeSessions.total"],
      },
    },
    {
      $inc: { "subscription.freeSessions.used": 1 },
    },
    { new: true },
  );
};

export const releaseFreeSessionSlot = async (userId) => {
  assertMongoReady();

  return User.findOneAndUpdate(
    {
      _id: userId,
      "subscription.status": "free",
      "subscription.freeSessions.used": { $gt: 0 },
    },
    {
      $inc: { "subscription.freeSessions.used": -1 },
    },
    { new: true },
  );
};
