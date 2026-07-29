import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authMiddleware } from '../middleware/auth.js';
import { appendMessageToSession, getSessionForUser, addKeyInsightsToSession } from '../services/session.store.js';
import { createActionLogRecord } from '../services/actionLog.store.js';

const router = express.Router();

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');
  return new GoogleGenerativeAI(apiKey);
};

// System prompt - guides AI behavior with safety + action messaging
const SYSTEM_PROMPT = `You are BeyondFear, a supportive AI companion designed to help people identify fear-based patterns and turn awareness into action.

Your core purpose:
1. CREATE SAFETY: Be empathetic, non-judgmental, and confidential
2. DRIVE ACTION: Move conversations from insight to small, executable next steps

Guidelines:
- Listen deeply without judgment
- Validate the person's feelings as legitimate
- Ask clarifying questions to understand fear patterns
- Help identify root causes (beliefs, past experiences, etc.)
- Suggest 1-3 small, doable action steps (things they can do TODAY or this week)
- Keep responses under 200 words for clarity
- Use plain language (no clinical jargon)
- Always end with a concrete action suggestion or reflection question

Important: You are NOT a replacement for professional mental health care. If someone mentions crisis/self-harm, respond with empathy and encourage them to contact a mental health professional immediately.

Return valid JSON only in this shape:
{
  "reply": "short empathetic response",
  "keyInsights": ["optional insight"],
  "actionItems": [
    {
      "title": "small action step",
      "description": "one-sentence detail",
      "actionType": "reflection",
      "priority": "medium",
      "difficulty": "easy",
      "dueDate": "ISO-8601 date string or null"
    }
  ]
}

If you cannot suggest an action, return an empty actionItems array.`;

const DEFAULT_ACTION_ITEM = {
  title: 'Write down one fear trigger',
  description: 'Capture the specific moment or thought that made the fear feel strongest today.',
  actionType: 'reflection',
  priority: 'medium',
  difficulty: 'easy',
};

const parseAssistantPayload = (text) => {
  if (!text) {
    return { reply: '', keyInsights: [], actionItems: [] };
  }

  const cleanedText = text.trim();
  const jsonCandidate = cleanedText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '');

  try {
    const parsed = JSON.parse(jsonCandidate);

    if (parsed && typeof parsed === 'object') {
      return {
        reply: typeof parsed.reply === 'string' ? parsed.reply : cleanedText,
        keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights.filter(Boolean) : [],
        actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems.filter(Boolean) : [],
      };
    }
  } catch (error) {
    // Fall through to text response.
  }

  return {
    reply: cleanedText,
    keyInsights: [],
    actionItems: [],
  };
};

const normalizeActionItems = (actionItems) => {
  if (!Array.isArray(actionItems) || actionItems.length === 0) {
    return [DEFAULT_ACTION_ITEM];
  }

  return actionItems.map((item) => ({
    title: item.title || DEFAULT_ACTION_ITEM.title,
    description: item.description || DEFAULT_ACTION_ITEM.description,
    actionType: item.actionType || DEFAULT_ACTION_ITEM.actionType,
    priority: item.priority || DEFAULT_ACTION_ITEM.priority,
    difficulty: item.difficulty || DEFAULT_ACTION_ITEM.difficulty,
    dueDate: item.dueDate || null,
  }));
};

const persistActionLogs = async (sessionId, userId, actionItems) => {
  const createdActionLogs = [];

  for (const actionItem of actionItems) {
    const actionLog = await createActionLogRecord({
      userId,
      sessionId,
      title: actionItem.title,
      description: actionItem.description,
      actionType: actionItem.actionType,
      status: 'pending',
      dueDate: actionItem.dueDate ? new Date(actionItem.dueDate) : undefined,
      priority: actionItem.priority,
      difficulty: actionItem.difficulty,
    });

    if (actionLog) {
      createdActionLogs.push(actionLog);
    }
  }

  return createdActionLogs;
};

/**
 * POST /api/messages/send
 * Send message to Claude and get response
 */
router.post('/send', authMiddleware, async (req, res, next) => {
  try {
    const { sessionId, message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    // Get session
    const session = await getSessionForUser(sessionId, req.user.userId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Add user message to session
    const sessionAfterUserMessage = await appendMessageToSession(sessionId, req.user.userId, {
      role: 'user',
      content: message,
      timestamp: new Date(),
    });

    // Prepare messages for Claude API (last 10 messages for context)
    const conversationHistory = sessionAfterUserMessage.messages.slice(-10).map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    try {
      // Call Gemini API
      const genAI = getGeminiClient();
      const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        systemInstruction: SYSTEM_PROMPT,
      });

      // Gemini uses alternating user/model roles (no system in history)
      const geminiHistory = conversationHistory.slice(0, -1).map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      const chat = model.startChat({
        history: geminiHistory,
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.7,
        },
      });

      const lastMessage = conversationHistory[conversationHistory.length - 1].content;
      const result = await chat.sendMessage(lastMessage);
      const aiMessageText = result.response.text();
      const parsedPayload = parseAssistantPayload(aiMessageText);
      const replyText = parsedPayload.reply || 'I hear you. Let us work through this together.';
      const actionItems = normalizeActionItems(parsedPayload.actionItems);

      // Add AI response to session
      const sessionAfterAssistantMessage = await appendMessageToSession(sessionId, req.user.userId, {
        role: 'assistant',
        content: replyText,
        timestamp: new Date(),
      });

      const createdActionLogs = await persistActionLogs(sessionId, req.user.userId, actionItems);

      if (parsedPayload.keyInsights.length > 0) {
        await addKeyInsightsToSession(sessionId, req.user.userId, parsedPayload.keyInsights);
      }

      res.json({
        message: replyText,
        sessionId,
        messagesCount: sessionAfterAssistantMessage.messages.length,
        keyInsights: parsedPayload.keyInsights,
        actionItems,
        actionLogs: createdActionLogs,
      });
    } catch (apiError) {
      console.error('Gemini API error:', apiError.message || apiError);

      // Return mock response for development/testing
      const mockResponse = `I hear you. That sounds like a challenging situation. Could you tell me more about what triggered this feeling?`;

      const sessionAfterAssistantMessage = await appendMessageToSession(sessionId, req.user.userId, {
        role: 'assistant',
        content: mockResponse,
        timestamp: new Date(),
      });

      const createdActionLogs = await persistActionLogs(sessionId, req.user.userId, [DEFAULT_ACTION_ITEM]);

      res.json({
        message: mockResponse,
        sessionId,
        messagesCount: sessionAfterAssistantMessage.messages.length,
        isDevelopmentMode: true,
        keyInsights: [],
        actionItems: [DEFAULT_ACTION_ITEM],
        actionLogs: createdActionLogs,
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/messages/mock
 * Get mock response (for development/testing without Claude API key)
 */
router.post('/mock', authMiddleware, async (req, res, next) => {
  try {
    const { sessionId, message } = req.body;

    const session = await getSessionForUser(sessionId, req.user.userId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Add user message
    await appendMessageToSession(sessionId, req.user.userId, {
      role: 'user',
      content: message,
      timestamp: new Date(),
    });

    // Mock response based on keywords
    const mockResponses = {
      fear: `I hear you. Fear often shows up when we're facing the unknown or past experiences. Let's explore this: What specifically are you afraid of? Once we understand the root, we can take small steps to move through it.`,
      anxiety: `Anxiety is your system trying to protect you, but it can sometimes be overprotective. Let's break this down: What situation triggered this feeling? Once we identify the pattern, we can practice one small coping technique today.`,
      decision: `Making decisions can feel paralyzing, especially when the stakes feel high. Let's make it simpler: What's the smallest step you could take to gather more information about this choice?`,
      default: `I'm here to listen and help you move from awareness to action. What's on your mind today? Share as much or as little as you'd like.`,
    };

    const keyword = Object.keys(mockResponses).find((key) => message.toLowerCase().includes(key));
    const aiMessage = mockResponses[keyword] || mockResponses.default;

    const sessionAfterAssistantMessage = await appendMessageToSession(sessionId, req.user.userId, {
      role: 'assistant',
      content: aiMessage,
      timestamp: new Date(),
    });

    const createdActionLogs = await persistActionLogs(sessionId, req.user.userId, [DEFAULT_ACTION_ITEM]);

    res.json({
      message: aiMessage,
      sessionId,
      messagesCount: sessionAfterAssistantMessage.messages.length,
      actionItems: [DEFAULT_ACTION_ITEM],
      actionLogs: createdActionLogs,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
