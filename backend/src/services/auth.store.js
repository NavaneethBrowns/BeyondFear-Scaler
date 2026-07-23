import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import User from '../models/User.js';

const isMongoReady = () => mongoose.connection?.readyState === 1;

const toPublicUser = (user) => {
  const {
    passwordHash,
    password,
    ...safeUser
  } = user;

  return safeUser;
};

const assertMongoReady = () => {
  if (!isMongoReady()) {
    throw new Error('MongoDB connection is not ready');
  }
};

export const findUserByEmail = async (email) => {
  assertMongoReady();
  const normalizedEmail = email.toLowerCase();
  return User.findOne({ email: normalizedEmail });
};

export const createUser = async ({ email, password }) => {
  assertMongoReady();
  const normalizedEmail = email.toLowerCase();
  const user = new User({ email: normalizedEmail, password });
  await user.save();
  return user;
};

export const verifyUserPassword = async (user, plainPassword) => {
  assertMongoReady();
  if (typeof user?.comparePassword === 'function') {
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
  return User.findById(userId);
};

export const updateUserProfile = async (userId, { displayName, avatar, preferences }) => {
  assertMongoReady();
  return User.findByIdAndUpdate(
    userId,
    {
      ...(displayName && { displayName }),
      ...(avatar && { avatar }),
      ...(preferences && { preferences }),
    },
    { new: true }
  );
};

export const toUserResponse = (user) => {
  if (!user) return null;

  if (typeof user.toJSON === 'function') {
    return user.toJSON();
  }

  return toPublicUser(user);
};

export const updateUserSubscription = async (userId, subscriptionPatch) => {
  assertMongoReady();
  const update = {
    ...(subscriptionPatch?.status ? { 'subscription.status': subscriptionPatch.status } : {}),
    ...(subscriptionPatch?.planType ? { 'subscription.planType': subscriptionPatch.planType } : {}),
    ...(typeof subscriptionPatch?.freeSessionsUsed === 'number' ? { 'subscription.freeSessions.used': subscriptionPatch.freeSessionsUsed } : {}),
    ...(typeof subscriptionPatch?.freeSessionsTotal === 'number' ? { 'subscription.freeSessions.total': subscriptionPatch.freeSessionsTotal } : {}),
    ...(subscriptionPatch?.lastPaymentDate ? { 'subscription.lastPaymentDate': subscriptionPatch.lastPaymentDate } : {}),
    ...(subscriptionPatch?.nextResetDate ? { 'subscription.nextResetDate': subscriptionPatch.nextResetDate } : {}),
  };

  return User.findByIdAndUpdate(
    userId,
    update,
    { new: true }
  );
};