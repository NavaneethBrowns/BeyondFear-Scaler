import express from 'express';
import axios from 'axios';
import { authMiddleware } from '../middleware/auth.js';
import Session from '../models/Session.js';
import User from '../models/User.js';

const router = express.Router();

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-3-sonnet-20240229';

// System prompt for Claude - guides AI behavior with safety + action messaging
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

Important: You are NOT a replacement for professional mental health care. If someone mentions crisis/self-harm, respond with empathy and encourage them to contact a mental health professional immediately.`;

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
    const session = await Session.findOne({
      _id: sessionId,
      userId: req.user.userId,
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check free session limit
    const user = await User.findById(req.user.userId);
    if (user.subscription.status === 'free' && user.subscription.sessionsUsed >= 3) {
      return res.status(402).json({
        error: 'Session limit reached. Please upgrade to premium.',
        sessionsUsed: user.subscription.sessionsUsed,
        limit: 3,
      });
    }

    // Add user message to session
    session.messages.push({
      role: 'user',
      content: message,
    });

    // Prepare messages for Claude API (last 10 messages for context)
    const conversationHistory = session.messages.slice(-10).map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    try {
      // Call Claude API
      const response = await axios.post(
        CLAUDE_API_URL,
        {
          model: CLAUDE_MODEL,
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages: conversationHistory,
        },
        {
          headers: {
            'x-api-key': process.env.CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01',
          },
        }
      );

      const aiMessage = response.data.content[0].text;

      // Add AI response to session
      session.messages.push({
        role: 'assistant',
        content: aiMessage,
      });

      // Save session
      await session.save();

      res.json({
        message: aiMessage,
        sessionId: session._id,
        messagesCount: session.messages.length,
      });
    } catch (apiError) {
      console.error('Claude API error:', apiError.response?.data || apiError.message);

      // Return mock response for development/testing
      const mockResponse = `I hear you. That sounds like a challenging situation. 

Could you tell me more about what triggered this feeling? Sometimes understanding the root can help us identify patterns.

For today, try this: Write down one specific moment that made you feel this way. Then share it when you're ready.`;

      session.messages.push({
        role: 'assistant',
        content: mockResponse,
      });

      await session.save();

      res.json({
        message: mockResponse,
        sessionId: session._id,
        messagesCount: session.messages.length,
        isDevelopmentMode: true,
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

    const session = await Session.findOne({
      _id: sessionId,
      userId: req.user.userId,
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Add user message
    session.messages.push({ role: 'user', content: message });

    // Mock response based on keywords
    const mockResponses = {
      fear: `I hear you. Fear often shows up when we're facing the unknown or past experiences. Let's explore this: What specifically are you afraid of? Once we understand the root, we can take small steps to move through it.`,
      anxiety: `Anxiety is your system trying to protect you, but it can sometimes be overprotective. Let's break this down: What situation triggered this feeling? Once we identify the pattern, we can practice one small coping technique today.`,
      decision: `Making decisions can feel paralyzing, especially when the stakes feel high. Let's make it simpler: What's the smallest step you could take to gather more information about this choice?`,
      default: `I'm here to listen and help you move from awareness to action. What's on your mind today? Share as much or as little as you'd like.`,
    };

    const keyword = Object.keys(mockResponses).find(key => message.toLowerCase().includes(key));
    const aiMessage = mockResponses[keyword] || mockResponses.default;

    session.messages.push({ role: 'assistant', content: aiMessage });
    await session.save();

    res.json({
      message: aiMessage,
      sessionId: session._id,
      messagesCount: session.messages.length,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
