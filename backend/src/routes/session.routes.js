import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  completeSessionForUser,
  createSessionRecord,
  deleteSessionForUser,
  getSessionForUser,
  listSessionsForUser,
  updateSessionForUser,
  updateFearIntensity,
} from '../services/session.store.js';
import { getUserById, updateUserSubscription } from '../services/auth.store.js';

const router = express.Router();

// ==========================================
// PROTECTED ROUTES - All require authentication
// ==========================================

/**
 * GET /api/sessions
 * Get all sessions for the user
 */
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const sessions = await listSessionsForUser(req.user.userId);

    res.json({ sessions });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/sessions
 * Create new session
 */
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const user = await getUserById(req.user.userId);
    const freeSessionUsage = user?.subscription?.freeSessions?.used || 0;
    const freeSessionLimit = user?.subscription?.freeSessions?.total || 1;

    if (user?.subscription?.status === 'free' && freeSessionUsage >= freeSessionLimit) {
      return res.status(402).json({
        error: 'Free session limit reached. Please subscribe to create more sessions.',
        sessionsUsed: freeSessionUsage,
        limit: freeSessionLimit,
      });
    }

    const fearIntensityInitial = typeof req.body.fearIntensity === 'number' ? req.body.fearIntensity : undefined;

    const session = await createSessionRecord({
      userId: req.user.userId,
      title: req.body.title || req.body.fearTitle || 'New Session',
      description: req.body.description || req.body.fearDescription,
      tags: req.body.tags || req.body.fearCategory,
      fearIntensityInitial,
    });

    if (user?.subscription?.status === 'free') {
      await updateUserSubscription(req.user.userId, {
        status: 'free',
        planType: 'free',
        freeSessionsUsed: freeSessionUsage + 1,
        freeSessionsTotal: freeSessionLimit,
      });
    }

    res.status(201).json({ session });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sessions/:id
 * Get session by ID
 */
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const session = await getSessionForUser(req.params.id, req.user.userId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
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
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { title, tags, description } = req.body;

    const session = await updateSessionForUser(req.params.id, req.user.userId, {
      title,
      tags,
      description,
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
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
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const session = await deleteSessionForUser(req.params.id, req.user.userId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ message: 'Session deleted' });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/sessions/:id/complete
 * Mark session complete
 */
router.patch('/:id/complete', authMiddleware, async (req, res, next) => {
  try {
    const fearIntensityFinal = typeof req.body.fearIntensity === 'number' ? req.body.fearIntensity : undefined;
    const session = await completeSessionForUser(req.params.id, req.user.userId, fearIntensityFinal);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
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
router.patch('/:id/intensity', authMiddleware, async (req, res, next) => {
  try {
    const { initialScore, finalScore } = req.body;

    if (initialScore !== undefined && (typeof initialScore !== 'number' || initialScore < 1 || initialScore > 10)) {
      return res.status(400).json({ error: 'initialScore must be a number between 1 and 10' });
    }
    if (finalScore !== undefined && (typeof finalScore !== 'number' || finalScore < 1 || finalScore > 10)) {
      return res.status(400).json({ error: 'finalScore must be a number between 1 and 10' });
    }

    const session = await updateFearIntensity(req.params.id, req.user.userId, { initialScore, finalScore });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ session });
  } catch (error) {
    next(error);
  }
});

export default router;
