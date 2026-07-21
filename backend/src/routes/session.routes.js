import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import Session from '../models/Session.js';
import User from '../models/User.js';

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
    const sessions = await Session.find({ userId: req.user.userId })
      .select('-messages')
      .sort({ createdAt: -1 });

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
    const session = new Session({
      userId: req.user.userId,
      title: req.body.title || 'New Session',
      messages: [],
    });

    await session.save();
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
    const session = await Session.findOne({
      _id: req.params.id,
      userId: req.user.userId,
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
 * PUT /api/sessions/:id
 * Update session (title, tags, etc.)
 */
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { title, tags, description } = req.body;

    const session = await Session.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      {
        ...(title && { title }),
        ...(tags && { tags }),
        ...(description && { description }),
      },
      { new: true }
    );

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
    const session = await Session.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { status: 'deleted' },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ message: 'Session deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
