import { createAuthToken } from '../utils/authTokens.js';
import {
  findUserByEmail,
  createUser,
  verifyUserPassword,
  touchLastLogin,
  toUserResponse,
  getUserById,
  updateUserProfile,
} from './auth.store.js';

export const signup = async ({ email, password }) => {
  // Check if user exists
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw { statusCode: 409, message: 'Email already registered' };
  }

  // Create new user
  const user = await createUser({ email, password });

  // Generate token
  const { token, expiresAt } = createAuthToken(user._id);

  return { user: toUserResponse(user), token, expiresAt };
};

export const login = async ({ email, password }) => {
  // Find user
  const user = await findUserByEmail(email);
  if (!user) {
    throw { statusCode: 401, message: 'Invalid email or password' };
  }

  // Verify password
  const isValidPassword = await verifyUserPassword(user, password);
  if (!isValidPassword) {
    throw { statusCode: 401, message: 'Invalid email or password' };
  }

  // Update last login
  const updatedUser = await touchLastLogin(user);

  // Generate token
  const { token, expiresAt } = createAuthToken(updatedUser._id);

  return { user: toUserResponse(updatedUser), token, expiresAt };
};

export const getCurrentUser = async (userId) => {
  const user = await getUserById(userId);
  return toUserResponse(user);
};

export const updateCurrentUserProfile = async (userId, payload) => {
  const user = await updateUserProfile(userId, payload);
  return toUserResponse(user);
};
