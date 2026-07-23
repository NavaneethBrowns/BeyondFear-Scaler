import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getSessionForUser } from '../services/session.store.js';
import {
  createActionLogRecord,
  listActionLogsForSession,
  updateActionLogStatus,
} from '../services/actionLog.store.js';

const router = express.Router();

router.get('/sessions/:sessionId/action-logs', authMiddleware, async (req, res, next) => {
  try {
    const session = await getSessionForUser(req.params.sessionId, req.user.userId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const actionLogs = await listActionLogsForSession(req.params.sessionId);
    res.json({ actionLogs });
  } catch (error) {
    next(error);
  }
});

router.post('/sessions/:sessionId/action-logs', authMiddleware, async (req, res, next) => {
  try {
    const session = await getSessionForUser(req.params.sessionId, req.user.userId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const actionLog = await createActionLogRecord({
      userId: req.user.userId,
      sessionId: req.params.sessionId,
      title: req.body.title,
      description: req.body.description,
      actionType: req.body.actionType,
      status: req.body.status,
      dueDate: req.body.dueDate,
      priority: req.body.priority,
      difficulty: req.body.difficulty,
    });

    res.status(201).json({ actionLog });
  } catch (error) {
    next(error);
  }
});

router.patch('/sessions/:sessionId/action-logs/:actionLogId', authMiddleware, async (req, res, next) => {
  try {
    const session = await getSessionForUser(req.params.sessionId, req.user.userId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const actionLog = await updateActionLogStatus(req.params.actionLogId, req.user.userId, req.body);

    if (!actionLog) {
      return res.status(404).json({ error: 'Action log not found' });
    }

    res.json({ actionLog });
  } catch (error) {
    next(error);
  }
});

export default router;