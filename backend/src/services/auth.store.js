import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import { randomUUID } from 'crypto';
import User from '../models/User.js';

const inMemoryUsers = new Map();

const isMongoReady = () => mongoose.connection?.readyState === 1;

const toPublicUser = (user) => {
  const {
    passwordHash,
    password,
    ...safeUser
  } = user;

  return safeUser;
};

const buildMemoryUser = async ({ email, password }) => {
  const now = new Date();
  const passwordHash = await bcryptjs.hash(password, 10);

  return {
    _id: randomUUID(),
    email: email.toLowerCase(),
    passwordHash,
    displayName: null,
    avatar: null,
    onboardingComplete: false,
    preferences: {
      timezone: undefined,
      language: 'en',
      notificationsEnabled: true,
    },
    subscription: {
      status: 'free',
      sessionsUsed: 0,
      nextResetDate: undefined,
      lastPaymentDate: undefined,
    },
    isActive: true,
    lastLoginAt: undefined,
    createdAt: now,
    updatedAt: now,
  };
};

export const findUserByEmail = async (email) => {
  const normalizedEmail = email.toLowerCase();

  if (isMongoReady()) {
    return User.findOne({ email: normalizedEmail });
  }

  const user = inMemoryUsers.get(normalizedEmail);
  return user ? { ...user } : null;
};

export const createUser = async ({ email, password }) => {
  const normalizedEmail = email.toLowerCase();

  if (isMongoReady()) {
    const user = new User({ email: normalizedEmail, password });
    await user.save();
    return user;
  }

  const user = await buildMemoryUser({ email: normalizedEmail, password });
  inMemoryUsers.set(normalizedEmail, user);
  return { ...user };
};

export const verifyUserPassword = async (user, plainPassword) => {
  if (isMongoReady() && typeof user?.comparePassword === 'function') {
    return user.comparePassword(plainPassword);
  }

  return bcryptjs.compare(plainPassword, user.passwordHash);
};

export const touchLastLogin = async (user) => {
  const now = new Date();

  if (isMongoReady()) {
    user.lastLoginAt = now;
    await user.save();
    return user;
  }

  const stored = inMemoryUsers.get(user.email);
  if (stored) {
    stored.lastLoginAt = now;
    stored.updatedAt = now;
    inMemoryUsers.set(stored.email, stored);
    return { ...stored };
  }

  return user;
};

export const getUserById = async (userId) => {
  if (isMongoReady()) {
    return User.findById(userId);
  }

  for (const user of inMemoryUsers.values()) {
    if (user._id === userId) {
      return { ...user };
    }
  }

  return null;
};

export const updateUserProfile = async (userId, { displayName, avatar, preferences }) => {
  if (isMongoReady()) {
    return User.findByIdAndUpdate(
      userId,
      {
        ...(displayName && { displayName }),
        ...(avatar && { avatar }),
        ...(preferences && { preferences }),
      },
      { new: true }
    );
  }

  for (const [email, user] of inMemoryUsers.entries()) {
    if (user._id === userId) {
      const updated = {
        ...user,
        ...(displayName ? { displayName } : {}),
        ...(avatar ? { avatar } : {}),
        ...(preferences ? { preferences: { ...user.preferences, ...preferences } } : {}),
        updatedAt: new Date(),
      };

      inMemoryUsers.set(email, updated);
      return { ...updated };
    }
  }

  return null;
};

export const toUserResponse = (user) => {
  if (!user) return null;

  if (typeof user.toJSON === 'function') {
    return user.toJSON();
  }

  return toPublicUser(user);
};

export const updateUserSubscription = async (userId, subscriptionPatch) => {
  if (isMongoReady()) {
    return User.findByIdAndUpdate(
      userId,
      {
        ...(subscriptionPatch?.status ? { 'subscription.status': subscriptionPatch.status } : {}),
        ...(subscriptionPatch?.lastPaymentDate ? { 'subscription.lastPaymentDate': subscriptionPatch.lastPaymentDate } : {}),
      },
      { new: true }
    );
  }

  for (const [email, user] of inMemoryUsers.entries()) {
    if (user._id === userId) {
      const updated = {
        ...user,
        subscription: {
          ...user.subscription,
          ...subscriptionPatch,
        },
        updatedAt: new Date(),
      };
      inMemoryUsers.set(email, updated);
      return { ...updated };
    }
  }

  return null;
};