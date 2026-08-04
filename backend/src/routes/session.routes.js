import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  completeSessionForUser,
  createSessionRecord,
  deleteSessionForUser,
  getSessionForUser,
  listSessionsForUser,
  updateSessionForUser,
  updateFearIntensity,
} from "../services/session.store.js";
import {
  getUserById,
  releaseFreeSessionSlot,
  reserveFreeSessionSlot,
} from "../services/auth.store.js";
import {
  canCreateSession,
  getSessionsRemaining,
  getCurrentSubscriptionStatus,
  SUBSCRIPTION_STATUS,
} from "../config/pricing.js";

const requirePremiumForSessionAction = (user) => {
  if (!user) {
    return { allowed: false, reason: "User not found" };
  }

  const subscriptionStatus = user.subscription?.status;
  if (subscriptionStatus === "premium") {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: "Upgrade to premium to rename or delete chats.",
    requiresSubscription: true,
    planType: "premium",
  };
};

const router = express.Router();

// ==========================================
// PROTECTED ROUTES - All require authentication
// ==========================================

/**
 * GET /api/sessions
 * Get all sessions for the user
 */
router.get("/", authMiddleware, async (req, res, next) => {
  try {
    const sessions = await listSessionsForUser(req.user.userId);

    res.json({ sessions });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/sessions
 * Create new session with subscription limit enforcement
 */
router.post("/", authMiddleware, async (req, res, next) => {
  try {
    const user = await getUserById(req.user.userId);
    let reservedFreeSlot = false;

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isIncognitoRequest = Boolean(req.body?.incognito);
    const currentSubscriptionStatus = getCurrentSubscriptionStatus(
      user.subscription,
    );
    if (
      isIncognitoRequest &&
      currentSubscriptionStatus !== SUBSCRIPTION_STATUS.PREMIUM
    ) {
      return res.status(402).json({
        success: false,
        error: "Incognito chat is available for premium members only.",
        message: "Upgrade to premium to use incognito chat.",
        requiresSubscription: true,
        planType: "premium",
        sessionLimit: getSessionsRemaining(user),
      });
    }

    if (currentSubscriptionStatus !== SUBSCRIPTION_STATUS.PREMIUM) {
      const existingSessions = await listSessionsForUser(req.user.userId);
      if (existingSessions.length > 0) {
        return res.status(402).json({
          success: false,
          error:
            "Free users can continue in one existing session. Upgrade to premium for additional chats.",
          message:
            "Upgrade to premium to continue chatting beyond one active free session.",
          requiresSubscription: true,
          planType: "premium",
          sessionLimit: getSessionsRemaining(user),
        });
      }

      const reservation = await reserveFreeSessionSlot(req.user.userId);
      if (!reservation) {
        return res.status(402).json({
          success: false,
          error:
            "Free users can continue in one existing session. Upgrade to premium for additional chats.",
          message:
            "Upgrade to premium to continue chatting beyond one active free session.",
          requiresSubscription: true,
          planType: "premium",
          sessionLimit: getSessionsRemaining(user),
        });
      }
      reservedFreeSlot = true;
    }

    // Check if user can create a session
    const sessionCheckResult = canCreateSession(user);

    if (!sessionCheckResult.allowed) {
      return res.status(402).json({
        success: false,
        error: sessionCheckResult.reason,
        message:
          "Upgrade to premium to continue chatting beyond the free tier.",
        requiresSubscription: true,
        planType: "premium",
        sessionLimit: getSessionsRemaining(user),
      });
    }

    // Create session
    const fearIntensityInitial =
      typeof req.body.fearIntensity === "number"
        ? req.body.fearIntensity
        : undefined;

    let session;
    try {
      session = await createSessionRecord({
        userId: req.user.userId,
        title: req.body.title || req.body.fearTitle || "New Session",
        description: req.body.description || req.body.fearDescription,
        tags: req.body.tags || req.body.fearCategory,
        fearIntensityInitial,
      });
    } catch (creationError) {
      if (reservedFreeSlot) {
        await releaseFreeSessionSlot(req.user.userId);
      }
      throw creationError;
    }

    res.status(201).json({
      success: true,
      session,
      sessionsRemaining: getSessionsRemaining(user),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sessions/:id
 * Get session by ID
 */
router.get("/:id", authMiddleware, async (req, res, next) => {
  try {
    const session = await getSessionForUser(req.params.id, req.user.userId);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json({ session });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/sessions/:id
 * Update session (title, tags, etc.)
 */
router.put("/:id", authMiddleware, async (req, res, next) => {
  try {
    const { title, tags, description } = req.body;

    const session = await updateSessionForUser(req.params.id, req.user.userId, {
      title,
      tags,
      description,
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json({ session });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/sessions/:id
 * Delete/archive session
 */
router.delete("/:id", authMiddleware, async (req, res, next) => {
  try {
    const user = await getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const accessCheck = requirePremiumForSessionAction(user);
    if (!accessCheck.allowed) {
      return res.status(402).json({
        success: false,
        error: accessCheck.reason,
        message: "Upgrade to premium to delete chats.",
        requiresSubscription: true,
        planType: "premium",
      });
    }

    const session = await deleteSessionForUser(req.params.id, req.user.userId);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json({ message: "Session deleted" });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/sessions/:id/complete
 * Mark session complete
 */
router.patch("/:id/complete", authMiddleware, async (req, res, next) => {
  try {
    const fearIntensityFinal =
      typeof req.body.fearIntensity === "number"
        ? req.body.fearIntensity
        : undefined;
    const session = await completeSessionForUser(
      req.params.id,
      req.user.userId,
      fearIntensityFinal,
    );

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json({ session });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/sessions/:id/intensity
 * Update fear intensity score (1-10) at any point in the session
 */
router.patch("/:id/intensity", authMiddleware, async (req, res, next) => {
  try {
    const { initialScore, finalScore } = req.body;

    if (
      initialScore !== undefined &&
      (typeof initialScore !== "number" ||
        initialScore < 1 ||
        initialScore > 10)
    ) {
      return res
        .status(400)
        .json({ error: "initialScore must be a number between 1 and 10" });
    }
    if (
      finalScore !== undefined &&
      (typeof finalScore !== "number" || finalScore < 1 || finalScore > 10)
    ) {
      return res
        .status(400)
        .json({ error: "finalScore must be a number between 1 and 10" });
    }

    const session = await updateFearIntensity(req.params.id, req.user.userId, {
      initialScore,
      finalScore,
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json({ session });
  } catch (error) {
    next(error);
  }
});

export default router;
