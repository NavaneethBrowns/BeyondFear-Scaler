import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { authMiddleware } from "../middleware/auth.js";
import { getSessionForUser } from "../services/session.store.js";
import {
  createActionLogRecord,
  getActionLogForUserAndSession,
  listActionLogsForSession,
  updateActionLogStatus,
} from "../services/actionLog.store.js";

const router = express.Router();
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  return new GoogleGenerativeAI(apiKey);
};

const parseValidationPayload = (text) => {
  if (!text) return null;

  const candidate = String(text)
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(candidate);
    if (parsed && typeof parsed === "object") {
      return {
        isValid: Boolean(parsed.isValid),
        feedback:
          typeof parsed.feedback === "string" && parsed.feedback.trim()
            ? parsed.feedback.trim()
            : "Please add a bit more detail so I can verify this step properly.",
        confidence:
          typeof parsed.confidence === "number"
            ? Math.max(0, Math.min(1, parsed.confidence))
            : undefined,
      };
    }
  } catch {
    return null;
  }

  return null;
};

const fallbackValidation = (responseText) => {
  const text = String(responseText || "").trim();
  const meaningful =
    text.length >= 20 &&
    /\b(i|my|when|felt|did|tried|because|learned)\b/i.test(text);

  return {
    isValid: meaningful,
    feedback: meaningful
      ? "This response shows a concrete attempt. Marking it complete."
      : "Please share what you actually tried, felt, or learned in 1-2 sentences before completing this step.",
    confidence: meaningful ? 0.6 : 0.3,
  };
};

router.get(
  "/sessions/:sessionId/action-logs",
  authMiddleware,
  async (req, res, next) => {
    try {
      const session = await getSessionForUser(
        req.params.sessionId,
        req.user.userId,
      );

      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      const actionLogs = await listActionLogsForSession(req.params.sessionId);
      res.json({ actionLogs });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/sessions/:sessionId/action-logs",
  authMiddleware,
  async (req, res, next) => {
    try {
      const session = await getSessionForUser(
        req.params.sessionId,
        req.user.userId,
      );

      if (!session) {
        return res.status(404).json({ error: "Session not found" });
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
  },
);

router.patch(
  "/sessions/:sessionId/action-logs/:actionLogId",
  authMiddleware,
  async (req, res, next) => {
    try {
      const session = await getSessionForUser(
        req.params.sessionId,
        req.user.userId,
      );

      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      if (req.body?.status === "completed" || req.body?.completedAt) {
        return res.status(400).json({
          error:
            "Manual completion is not allowed. Use validate-completion endpoint so AI can confirm the step.",
        });
      }

      const actionLog = await updateActionLogStatus(
        req.params.actionLogId,
        req.user.userId,
        req.body,
      );

      if (!actionLog) {
        return res.status(404).json({ error: "Action log not found" });
      }

      res.json({ actionLog });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/sessions/:sessionId/action-logs/:actionLogId/validate-completion",
  authMiddleware,
  async (req, res, next) => {
    try {
      const session = await getSessionForUser(
        req.params.sessionId,
        req.user.userId,
      );

      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      const actionLog = await getActionLogForUserAndSession(
        req.params.actionLogId,
        req.user.userId,
        req.params.sessionId,
      );

      if (!actionLog) {
        return res.status(404).json({ error: "Action log not found" });
      }

      const responseText = String(req.body?.responseText || "").trim();
      if (!responseText) {
        return res
          .status(400)
          .json({ error: "responseText is required for validation" });
      }

      let validation;

      try {
        const genAI = getGeminiClient();
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

        const prompt = `You validate if a user completed a therapeutic action step.
Action title: ${actionLog.title}
Action description: ${actionLog.description || "No description"}
User response: ${responseText}

Rules:
- Mark valid only if user response shows concrete attempt, reflection, or outcome tied to the action.
- Reject vague responses like "done", "ok", "yes" without details.
- Be supportive, concise, and actionable in feedback.

Return JSON only:
{
  "isValid": true or false,
  "feedback": "one short sentence",
  "confidence": 0 to 1
}`;

        const result = await model.generateContent(prompt);
        const aiText = result.response.text();
        validation =
          parseValidationPayload(aiText) || fallbackValidation(responseText);
      } catch {
        validation = fallbackValidation(responseText);
      }

      const patch = {
        attempts: (actionLog.attempts || 0) + 1,
        completionNotes: responseText,
        ...(validation.isValid
          ? {
              status: "completed",
              completedAt: new Date(),
              skippedAt: null,
            }
          : {
              status:
                actionLog.status === "completed"
                  ? "in-progress"
                  : actionLog.status,
            }),
      };

      const updated = await updateActionLogStatus(
        req.params.actionLogId,
        req.user.userId,
        patch,
      );

      res.json({
        actionLog: updated,
        validation,
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
