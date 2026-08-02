import express from "express";
import Joi from "joi";
import rateLimit from "express-rate-limit";
import {
  signup,
  login,
  getCurrentUser,
  updateCurrentUserProfile,
} from "../services/auth.service.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation schemas
const signupSchema = Joi.object({
  displayName: Joi.string().trim().min(2).max(60).optional(),
  email: Joi.string().trim().lowercase().email().required(),
  password: Joi.string().min(8).max(128).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
  password: Joi.string().required(),
});

// ==========================================
// PUBLIC ROUTES
// ==========================================

/**
 * POST /api/auth/signup
 * Register a new user
 */
router.post("/signup", authLimiter, async (req, res, next) => {
  try {
    // Validate
    const { error, value } = signupSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Signup
    const result = await signup(value);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post("/login", authLimiter, async (req, res, next) => {
  try {
    // Validate
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Login
    const result = await login(value);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// PROTECTED ROUTES
// ==========================================

/**
 * GET /api/auth/me
 * Get current user
 */
router.get("/me", authMiddleware, async (req, res, next) => {
  try {
    const user = await getCurrentUser(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put("/profile", authMiddleware, async (req, res, next) => {
  try {
    const { displayName, avatar, preferences } = req.body;

    const user = await updateCurrentUserProfile(req.user.userId, {
      ...(displayName && { displayName }),
      ...(avatar && { avatar }),
      ...(preferences && { preferences }),
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Logout user (mainly for frontend state clearing)
 */
router.post("/logout", authMiddleware, (req, res) => {
  // Token becomes invalid on frontend side
  res.json({ message: "Logged out successfully" });
});

export default router;
