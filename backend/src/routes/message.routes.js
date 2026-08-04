import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { authMiddleware } from "../middleware/auth.js";
import {
  appendMessageToSession,
  getSessionForUser,
  addKeyInsightsToSession,
  updateFearIntensity,
} from "../services/session.store.js";
import {
  createActionLogRecord,
  listActionLogsForSession,
} from "../services/actionLog.store.js";

const router = express.Router();

const resolveGeminiModel = () => {
  const configuredModel = (process.env.GEMINI_MODEL || "").trim().toLowerCase();

  if (
    configuredModel &&
    ![
      "gemini-1.5-flash",
      "gemini-1.5-flash-latest",
      "gemini-flash-latest",
      "gemini-flash-latest",
      "gemini-2.0-flash",
    ].includes(configuredModel)
  ) {
    return configuredModel;
  }

  return "gemini-flash-latest";
};

const GEMINI_MODEL = resolveGeminiModel();

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  return new GoogleGenerativeAI(apiKey);
};

// System prompt - guides AI behavior with safety + action messaging
const SYSTEM_PROMPT = `You are BeyondFear, a supportive AI companion designed to help people identify fear-based patterns and turn awareness into action.

Core stance:
- Witness, not fixer.
- Calm, grounded, unhurried.
- Direct without coldness.
- Curious, not certain.
- Radically non-judgmental.

Scope:
- You only help with the user's own fear work.
- If the user drifts to unrelated tasks (homework/coding/trivia/general assistant asks), redirect warmly back to fear work.
- Do not explain enforcement logic; just remain in-role.

Stage behavior:
- Stage 1 Self-observation: invite body-level noticing, not analysis.
- Stage 2 Fear diagnosis: make fear concrete and specific.
- Stage 3 Root connection: offer pattern as a question, never as a diagnosis.
- Stage 4a Internal work: reflective prompts, no suppression language.
- Stage 4b External work: tiny safe microactions, evidence over outcome.
- Stage 5 Dissolution: verify reduced response over repeated exposure.

Safety boundaries (hard):
- Never provide operational harmful detail.
- Never help dissolve conscience-fear (fear of consequences of harming others).
- Never do romantic/intimate roleplay.
- Never profile third parties.
- Never suggest dangerous, illegal, or non-consensual actions.

Crisis handling:
- Yellow flag: slow down, ground in present, do not escalate intensity.
- Red flag: pause and stop normal flow; recommend immediate trained human help.

One-fear continuity:
- Focus one fear thread per session.
- If another fear appears before the first thread is complete, acknowledge and park it, then guide back to completing current thread.

Response constraints:
- Keep replies concise (generally <= 180 words).
- Use plain language, no therapy jargon, no false certainty.
- Ask one clarifying question at a time.
- If fear is named but intensity score unknown, ask for 1-10 score before action planning.

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

If you cannot suggest an action, return an empty actionItems array.

Action-step rubric:
- Do not create action items immediately. Wait until the fear/context is clear.
- If the user has named a fear but no intensity score is known yet, ask for a 1-10 intensity score before offering action plans.
- If intensity is 1-3, suggest at most 1 action.
- If intensity is 4-6, suggest 1-2 actions.
- If intensity is 7-8, suggest 2-3 actions.
- If intensity is 9-10, suggest 3-5 actions, split into small sub-steps.
- Keep actions realistic, specific, and safe.
- Prefer progressive exposure, reflection prompts, and practical micro-commitments.`;

const DEFAULT_ACTION_ITEM = {
  title: "Capture one concrete trigger",
  description: "Write one sentence about what happened just before the fear spiked.",
  actionType: "reflection",
  priority: "medium",
  difficulty: "easy",
};

const parseAssistantPayload = (text) => {
  if (!text) {
    return { reply: "", keyInsights: [], actionItems: [] };
  }

  const cleanedText = String(text).trim();

  const candidateBlocks = [];
  const fencedMatch = cleanedText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch && fencedMatch[1]) {
    candidateBlocks.push(fencedMatch[1].trim());
  }

  const objectMatch = cleanedText.match(/(\{[\s\S]*\})/);
  if (objectMatch && objectMatch[1]) {
    candidateBlocks.push(objectMatch[1].trim());
  }

  candidateBlocks.push(cleanedText);

  for (const candidate of candidateBlocks) {
    const normalizedCandidate = candidate
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    try {
      const parsed = JSON.parse(normalizedCandidate);

      if (parsed && typeof parsed === "object") {
        return {
          reply: typeof parsed.reply === "string" ? parsed.reply : cleanedText,
          keyInsights: Array.isArray(parsed.keyInsights)
            ? parsed.keyInsights.filter(Boolean)
            : [],
          actionItems: Array.isArray(parsed.actionItems)
            ? parsed.actionItems.filter(Boolean)
            : [],
        };
      }
    } catch (error) {
      // Try the next candidate.
    }
  }

  return {
    reply: cleanedText,
    keyInsights: [],
    actionItems: [],
  };
};

const shouldRedirectToFearTopic = () => {
  return false;
};

const normalizeActionItems = (actionItems) => {
  if (!Array.isArray(actionItems) || actionItems.length === 0) {
    return [];
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

const ACTION_READINESS_REGEX =
  /(clear|clarity|plan|step|action|decide|decision|next|ready|understand|root cause|pattern|trigger)/i;

const RED_FLAG_REGEX =
  /(want to (?:hurt|kill) myself|end my life|suicid|self harm|can't do this anymore|harm (?:someone|others)|kill (?:someone|them))/i;

const YELLOW_FLAG_REGEX =
  /(nothing will ever change|i don't want to see anyone|numb|leave everything|disappear|hopeless)/i;

const OFF_TOPIC_REGEX =
  /(write (?:code|program)|debug|homework|assignment|math problem|resume|cover letter|news update|recipe|translate this|stock tip|crypto|movie recommendation)/i;

const HARMFUL_OPERATIONAL_REGEX =
  /(how to make (?:a )?bomb|build (?:a )?weapon|poison|overdose|bypass security|hack (?:into|a))/i;

const CONSCIENCE_FEAR_REGEX =
  /(stop feeling guilty|don't want to feel bad|fear of getting caught|avoid consequences|hurt (?:someone|them) and)/i;

const THIRD_PARTY_PROFILE_REGEX =
  /(analy(?:s|z)e (?:my|this) (?:partner|friend|boss|parent)|profile (?:them|someone)|manipulate (?:their|someone's) fear)/i;

const DEPENDENCY_OR_INTIMACY_REGEX =
  /(you are all i have|i only need you|be my girlfriend|be my boyfriend|i love you|marry me|date me)/i;

const SECOND_FEAR_PIVOT_REGEX =
  /(another fear|also afraid|besides that|and i also fear|one more fear)/i;

const ACTION_DANGER_REGEX =
  /(roof ledge|jump|speeding|without consent|stalk|illegal|weapon|drugs|substance|self-harm|harm someone)/i;

const FEAR_TOPIC_REGEX =
  /(fear|afraid|anxious|anxiety|panic|overwhelmed|worr(?:y|ied)|avoid|avoidance|self-doubt|judg(?:e|ment)|uncertain|uncertainty|nervous)/i;

const RECENT_INTENSITY_PROMPT_REGEX =
  /(1\s*(?:-|to)?\s*10|intensity|how heavy|score it)/i;

const isValidIntensity = (value) =>
  typeof value === "number" && value >= 1 && value <= 10;

const resolveKnownIntensity = (session, currentIntensity) => {
  if (isValidIntensity(currentIntensity)) return currentIntensity;
  if (isValidIntensity(session?.fearIntensity?.finalScore)) {
    return session.fearIntensity.finalScore;
  }
  if (isValidIntensity(session?.fearIntensity?.initialScore)) {
    return session.fearIntensity.initialScore;
  }
  return undefined;
};

const extractIntensityFromText = (text) => {
  if (!text || typeof text !== "string") return undefined;

  const normalized = text.trim().toLowerCase();
  if (!normalized) return undefined;

  const plainNumberMatch = normalized.match(/^([1-9]|10)$/);
  if (plainNumberMatch) {
    return Number(plainNumberMatch[1]);
  }

  const outOfTenMatch = normalized.match(/\b(10|[1-9])\s*\/\s*10\b/);
  if (outOfTenMatch) {
    return Number(outOfTenMatch[1]);
  }

  const contextualMatch = normalized.match(
    /\b(?:intensity|score|level|heavy|feels?|feeling|currently|now|today|about|around|at)\b[^\d]{0,20}(10|[1-9])\b/,
  );
  if (contextualMatch) {
    return Number(contextualMatch[1]);
  }

  return undefined;
};

const shouldAskForIntensity = ({ message, conversationHistory, knownIntensity }) => {
  if (isValidIntensity(knownIntensity)) {
    return false;
  }

  if (!FEAR_TOPIC_REGEX.test(message || "")) {
    return false;
  }

  const recentAssistantMessages = conversationHistory
    .filter((entry) => entry.role === "assistant")
    .slice(-2)
    .map((entry) => entry.content || "");

  return !recentAssistantMessages.some((entry) => RECENT_INTENSITY_PROMPT_REGEX.test(entry));
};

const shouldGenerateActionItems = ({ conversationHistory, message, currentIntensity }) => {
  const userMessageCount = conversationHistory.filter((entry) => entry.role === "user").length;
  const hasClaritySignal = ACTION_READINESS_REGEX.test(message || "");
  const highIntensity = typeof currentIntensity === "number" && currentIntensity >= 7;

  return userMessageCount >= 3 || hasClaritySignal || highIntensity;
};

const isFearRelatedMessage = (text = "") => FEAR_TOPIC_REGEX.test(text);

const getRecentUserMessages = (conversationHistory) =>
  conversationHistory
    .filter((entry) => entry.role === "user")
    .map((entry) => entry.content || "");

const getPrimaryFearAnchor = (conversationHistory, session) => {
  const sessionFearTitle = session?.fearTitle || session?.title;
  if (
    typeof sessionFearTitle === "string" &&
    sessionFearTitle.trim() &&
    !/^new session$/i.test(sessionFearTitle.trim()) &&
    !/^my first fear session$/i.test(sessionFearTitle.trim())
  ) {
    return sessionFearTitle.trim();
  }

  const users = getRecentUserMessages(conversationHistory);
  const firstFearMessage = users.find((entry) => isFearRelatedMessage(entry));
  return firstFearMessage ? firstFearMessage.trim().slice(0, 80) : null;
};

const getOffTopicDriftLevel = (conversationHistory, latestMessage) => {
  const recentUserMessages = getRecentUserMessages(conversationHistory).slice(-4);
  const current = String(latestMessage || "");
  const all = [...recentUserMessages, current];
  return all.filter((entry) => OFF_TOPIC_REGEX.test(entry) && !isFearRelatedMessage(entry)).length;
};

const buildHardBoundaryResponse = (message) => ({
  reply: message,
  keyInsights: [],
  actionItems: [],
});

const sanitizeActionItems = (actionItems) =>
  actionItems.filter((item) => {
    const text = `${item?.title || ""} ${item?.description || ""}`;
    return !ACTION_DANGER_REGEX.test(text);
  });

const toIsoDueDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const buildFallbackActionItems = ({ currentIntensity, message }) => {
  const intensity =
    typeof currentIntensity === "number" && currentIntensity >= 1 && currentIntensity <= 10
      ? currentIntensity
      : 5;

  const targetCount = intensity >= 9 ? 4 : intensity >= 7 ? 3 : intensity >= 4 ? 2 : 1;
  const topic = (message || "this fear").trim().slice(0, 70);
  const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const candidates = [
    {
      title: "Name the trigger in one sentence",
      description: `Write one clear sentence describing what about ${topic} feels most threatening right now.`,
      actionType: "reflection",
      priority: intensity >= 7 ? "high" : "medium",
      difficulty: "easy",
      dueDate,
    },
    {
      title: "List evidence for and against the fear",
      description: "Create two short lists: facts that support the fear story and facts that challenge it.",
      actionType: "reflection",
      priority: "medium",
      difficulty: "medium",
      dueDate,
    },
    {
      title: "Take one low-risk exposure step",
      description: "Choose a small action that faces the fear without overwhelming you, then do it within 24 hours.",
      actionType: "behavior-change",
      priority: "high",
      difficulty: intensity >= 8 ? "hard" : "medium",
      dueDate,
    },
    {
      title: "Schedule a follow-up reflection",
      description: "Set a 10-minute check-in to capture what changed in your intensity after the action.",
      actionType: "goal",
      priority: "medium",
      difficulty: "easy",
      dueDate,
    },
  ];

  return candidates.slice(0, targetCount);
};

const buildGeminiHistory = (conversationHistory) => {
  const mappedHistory = conversationHistory
    .map((msg) => {
      if (msg.role === "assistant") {
        return { role: "model", parts: [{ text: msg.content }] };
      }

      if (msg.role === "user") {
        return { role: "user", parts: [{ text: msg.content }] };
      }

      return null;
    })
    .filter(Boolean);

  while (mappedHistory.length > 0 && mappedHistory[0].role !== "user") {
    mappedHistory.shift();
  }

  return mappedHistory.reduce((acc, entry) => {
    if (acc.length > 0 && acc[acc.length - 1].role === entry.role) {
      acc[acc.length - 1].parts.push(...entry.parts);
    } else {
      acc.push(entry);
    }
    return acc;
  }, []);
};

const persistActionLogs = async (sessionId, userId, actionItems) => {
  const createdActionLogs = [];
  const existing = await listActionLogsForSession(sessionId);
  const existingTitles = new Set(
    existing
      .map((item) => item?.title?.trim().toLowerCase())
      .filter(Boolean),
  );

  for (const actionItem of actionItems) {
    const normalizedTitle = actionItem.title?.trim().toLowerCase();
    if (!normalizedTitle || existingTitles.has(normalizedTitle)) {
      continue;
    }

    const actionLog = await createActionLogRecord({
      userId,
      sessionId,
      title: actionItem.title,
      description: actionItem.description,
      actionType: actionItem.actionType,
      status: "pending",
      dueDate: actionItem.dueDate ? new Date(actionItem.dueDate) : undefined,
      priority: actionItem.priority,
      difficulty: actionItem.difficulty,
    });

    if (actionLog) {
      createdActionLogs.push(actionLog);
      existingTitles.add(normalizedTitle);
    }
  }

  return createdActionLogs;
};

/**
 * POST /api/messages/send
 * Send message to Claude and get response
 */
router.post("/send", authMiddleware, async (req, res, next) => {
  try {
    const { sessionId, message, currentIntensity } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    // Get session
    const session = await getSessionForUser(sessionId, req.user.userId);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const inferredIntensity = extractIntensityFromText(message);
    const providedIntensity = isValidIntensity(currentIntensity)
      ? currentIntensity
      : inferredIntensity;

    if (isValidIntensity(providedIntensity)) {
      const hasInitialIntensity = isValidIntensity(session?.fearIntensity?.initialScore);
      const hasFinalIntensity = isValidIntensity(session?.fearIntensity?.finalScore);

      const intensityUpdate = hasInitialIntensity
        ? hasFinalIntensity
          ? { finalScore: providedIntensity }
          : { initialScore: session.fearIntensity.initialScore, finalScore: providedIntensity }
        : { initialScore: providedIntensity };

      await updateFearIntensity(sessionId, req.user.userId, intensityUpdate);
    }

    // Add user message to session
    const sessionAfterUserMessage = await appendMessageToSession(
      sessionId,
      req.user.userId,
      {
        role: "user",
        content: message,
        timestamp: new Date(),
      },
    );

    // Prepare messages for Claude API (last 10 messages for context)
    const conversationHistory = sessionAfterUserMessage.messages
      .slice(-10)
      .map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

    const knownIntensity = resolveKnownIntensity(sessionAfterUserMessage, providedIntensity);

    if (RED_FLAG_REGEX.test(message)) {
      const replyText =
        "I need to pause here. What you're carrying sounds heavier than this conversation can safely hold alone. Please contact a trained crisis professional or emergency support in your area right now. If you can, also reach out to someone you trust and stay with them while you get help.";

      const sessionAfterAssistantMessage = await appendMessageToSession(
        sessionId,
        req.user.userId,
        {
          role: "assistant",
          content: replyText,
          timestamp: new Date(),
        },
      );

      return res.json({
        message: replyText,
        sessionId,
        messagesCount: sessionAfterAssistantMessage.messages.length,
        keyInsights: [],
        actionItems: [],
        actionLogs: [],
      });
    }

    if (YELLOW_FLAG_REGEX.test(message)) {
      const replyText =
        "Let's slow this down for a moment. Can you name five things you can see and feel your feet on the ground for one full breath? Once you feel a little steadier, tell me what part feels heaviest right now.";

      const sessionAfterAssistantMessage = await appendMessageToSession(
        sessionId,
        req.user.userId,
        {
          role: "assistant",
          content: replyText,
          timestamp: new Date(),
        },
      );

      return res.json({
        message: replyText,
        sessionId,
        messagesCount: sessionAfterAssistantMessage.messages.length,
        keyInsights: [],
        actionItems: [],
        actionLogs: [],
      });
    }

    if (HARMFUL_OPERATIONAL_REGEX.test(message)) {
      const replyText =
        "I can help you work through the fear itself, but I can't provide technical or operational details for that. If you want, we can focus on what this fear is doing to you right now and what would help you feel safer.";

      const sessionAfterAssistantMessage = await appendMessageToSession(
        sessionId,
        req.user.userId,
        {
          role: "assistant",
          content: replyText,
          timestamp: new Date(),
        },
      );

      return res.json({
        message: replyText,
        sessionId,
        messagesCount: sessionAfterAssistantMessage.messages.length,
        keyInsights: [],
        actionItems: [],
        actionLogs: [],
      });
    }

    if (CONSCIENCE_FEAR_REGEX.test(message)) {
      const replyText =
        "What you're describing sounds less like fear holding you back and more like your conscience doing its job. I can't help remove that signal. If you'd like, we can explore how to make a safer, more responsible choice from here.";

      const sessionAfterAssistantMessage = await appendMessageToSession(
        sessionId,
        req.user.userId,
        {
          role: "assistant",
          content: replyText,
          timestamp: new Date(),
        },
      );

      return res.json({
        message: replyText,
        sessionId,
        messagesCount: sessionAfterAssistantMessage.messages.length,
        keyInsights: [],
        actionItems: [],
        actionLogs: [],
      });
    }

    if (THIRD_PARTY_PROFILE_REGEX.test(message)) {
      const replyText =
        "I can't profile someone else's fears from the outside. This framework works best when pointed at your own experience. What's your fear in this situation?";

      const sessionAfterAssistantMessage = await appendMessageToSession(
        sessionId,
        req.user.userId,
        {
          role: "assistant",
          content: replyText,
          timestamp: new Date(),
        },
      );

      return res.json({
        message: replyText,
        sessionId,
        messagesCount: sessionAfterAssistantMessage.messages.length,
        keyInsights: [],
        actionItems: [],
        actionLogs: [],
      });
    }

    if (DEPENDENCY_OR_INTIMACY_REGEX.test(message)) {
      const replyText =
        "I care about helping you here, but I'm not a replacement for real relationships in your life. Let's keep this focused on your fear work and what support from real people might help right now.";

      const sessionAfterAssistantMessage = await appendMessageToSession(
        sessionId,
        req.user.userId,
        {
          role: "assistant",
          content: replyText,
          timestamp: new Date(),
        },
      );

      return res.json({
        message: replyText,
        sessionId,
        messagesCount: sessionAfterAssistantMessage.messages.length,
        keyInsights: [],
        actionItems: [],
        actionLogs: [],
      });
    }

    const driftLevel = getOffTopicDriftLevel(conversationHistory, message);
    if (driftLevel >= 3 && OFF_TOPIC_REGEX.test(message) && !isFearRelatedMessage(message)) {
      const replyText =
        "This isn't landing in fear work right now, so let's pause here for today. When you're ready, come back with one fear you'd like to work through and we'll continue.";

      const sessionAfterAssistantMessage = await appendMessageToSession(
        sessionId,
        req.user.userId,
        {
          role: "assistant",
          content: replyText,
          timestamp: new Date(),
        },
      );

      return res.json({
        message: replyText,
        sessionId,
        messagesCount: sessionAfterAssistantMessage.messages.length,
        keyInsights: [],
        actionItems: [],
        actionLogs: [],
      });
    }

    if (driftLevel === 2 && OFF_TOPIC_REGEX.test(message) && !isFearRelatedMessage(message)) {
      const replyText =
        "I'm built specifically for your fear work, not general tasks. If this request has a fear underneath it, name that fear directly and we'll work from there.";

      const sessionAfterAssistantMessage = await appendMessageToSession(
        sessionId,
        req.user.userId,
        {
          role: "assistant",
          content: replyText,
          timestamp: new Date(),
        },
      );

      return res.json({
        message: replyText,
        sessionId,
        messagesCount: sessionAfterAssistantMessage.messages.length,
        keyInsights: [],
        actionItems: [],
        actionLogs: [],
      });
    }

    if (driftLevel === 1 && OFF_TOPIC_REGEX.test(message) && !isFearRelatedMessage(message)) {
      const replyText =
        "That's outside what I'm here for. I'm built for fear work. Do you want to return to your current fear thread, or name the fear underneath this request?";

      const sessionAfterAssistantMessage = await appendMessageToSession(
        sessionId,
        req.user.userId,
        {
          role: "assistant",
          content: replyText,
          timestamp: new Date(),
        },
      );

      return res.json({
        message: replyText,
        sessionId,
        messagesCount: sessionAfterAssistantMessage.messages.length,
        keyInsights: [],
        actionItems: [],
        actionLogs: [],
      });
    }

    const primaryFearAnchor = getPrimaryFearAnchor(conversationHistory, sessionAfterUserMessage);
    if (
      primaryFearAnchor &&
      SECOND_FEAR_PIVOT_REGEX.test(message) &&
      isFearRelatedMessage(message)
    ) {
      const replyText =
        `Good catch. I hear a second fear thread here, and we should park it for now. Let's complete the current thread first: ${primaryFearAnchor}. What's the next smallest safe step you can take on this first fear in the next 24 hours?`;

      const sessionAfterAssistantMessage = await appendMessageToSession(
        sessionId,
        req.user.userId,
        {
          role: "assistant",
          content: replyText,
          timestamp: new Date(),
        },
      );

      return res.json({
        message: replyText,
        sessionId,
        messagesCount: sessionAfterAssistantMessage.messages.length,
        keyInsights: [],
        actionItems: [],
        actionLogs: [],
      });
    }

    if (shouldAskForIntensity({ message, conversationHistory, knownIntensity })) {
      const intensityPrompt =
        "Thank you for naming that. On a scale from 1 to 10, how intense does this fear feel right now?";

      const sessionAfterAssistantMessage = await appendMessageToSession(
        sessionId,
        req.user.userId,
        {
          role: "assistant",
          content: intensityPrompt,
          timestamp: new Date(),
        },
      );

      return res.json({
        message: intensityPrompt,
        sessionId,
        messagesCount: sessionAfterAssistantMessage.messages.length,
        keyInsights: [],
        actionItems: [],
        actionLogs: [],
      });
    }

    try {
      // Call Gemini API
      const genAI = getGeminiClient();
      const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        systemInstruction: SYSTEM_PROMPT,
      });

      const geminiHistory = buildGeminiHistory(
        conversationHistory.slice(0, -1),
      );

      const chat = model.startChat({
        history: geminiHistory,
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.7,
        },
      });

      const lastMessage =
        conversationHistory[conversationHistory.length - 1].content;
      const actionReady = shouldGenerateActionItems({
        conversationHistory,
        message: lastMessage,
        currentIntensity: knownIntensity,
      });
      const intensityHint =
        isValidIntensity(knownIntensity)
          ? `Current fear intensity score is ${knownIntensity}/10.`
          : "";
      const actionHint = actionReady
        ? "The conversation appears clear enough. Return focused actionItems using the rubric."
        : "The conversation is not clear enough yet. Return actionItems as an empty array and ask one clarifying question.";

      const result = await chat.sendMessage(
        `${lastMessage}\n\n${intensityHint}\n${actionHint}`,
      );
      const aiMessageText = result.response.text();
      const parsedPayload = parseAssistantPayload(aiMessageText);
      let replyText =
        parsedPayload.reply && parsedPayload.reply.trim()
          ? parsedPayload.reply
          : aiMessageText && aiMessageText.trim()
            ? aiMessageText.trim()
            : "I hear you. Let us work through this together.";

      if (shouldRedirectToFearTopic(message, conversationHistory)) {
        replyText = `I can help with that, and I’m happy to follow your thread. Since the last few messages have been about fear, let’s gently bring it back to that: what part of this fear feels strongest right now?`;
      }

      const normalizedActionItems = normalizeActionItems(parsedPayload.actionItems).map((item) => ({
        ...item,
        dueDate: toIsoDueDate(item.dueDate),
      }));
      const actionItems = actionReady
        ? sanitizeActionItems(normalizedActionItems).length > 0
          ? sanitizeActionItems(normalizedActionItems)
          : buildFallbackActionItems({ currentIntensity: knownIntensity, message: lastMessage })
        : [];

      // Add AI response to session
      const sessionAfterAssistantMessage = await appendMessageToSession(
        sessionId,
        req.user.userId,
        {
          role: "assistant",
          content: replyText,
          timestamp: new Date(),
        },
      );

      const createdActionLogs = await persistActionLogs(
        sessionId,
        req.user.userId,
        actionItems,
      );

      if (parsedPayload.keyInsights.length > 0) {
        await addKeyInsightsToSession(
          sessionId,
          req.user.userId,
          parsedPayload.keyInsights,
        );
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
      const errorMessage =
        apiError?.message || apiError?.toString?.() || "Unknown Gemini error";
      console.error("Gemini API error:", errorMessage);

      const actionReady = shouldGenerateActionItems({
        conversationHistory,
        message,
        currentIntensity: knownIntensity,
      });
      const fallbackActions = actionReady
        ? buildFallbackActionItems({ currentIntensity: knownIntensity, message })
        : [];

      const isQuotaError =
        /quota|429|rate limit|exceeded your current quota/i.test(errorMessage);
      const mockResponse = isQuotaError
        ? "I’m taking a short pause because the AI service is temporarily over its limit. Please try again in a moment, and I’ll keep supporting you in the meantime."
        : "I hear you. That sounds like a challenging situation. Could you tell me more about what triggered this feeling?";

      const sessionAfterAssistantMessage = await appendMessageToSession(
        sessionId,
        req.user.userId,
        {
          role: "assistant",
          content: mockResponse,
          timestamp: new Date(),
        },
      );

      const createdActionLogs = await persistActionLogs(
        sessionId,
        req.user.userId,
        fallbackActions,
      );

      res.json({
        message: mockResponse,
        sessionId,
        messagesCount: sessionAfterAssistantMessage.messages.length,
        isDevelopmentMode: true,
        keyInsights: [],
        actionItems: fallbackActions,
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
router.post("/mock", authMiddleware, async (req, res, next) => {
  try {
    const { sessionId, message } = req.body;

    const session = await getSessionForUser(sessionId, req.user.userId);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Add user message
    await appendMessageToSession(sessionId, req.user.userId, {
      role: "user",
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

    const keyword = Object.keys(mockResponses).find((key) =>
      message.toLowerCase().includes(key),
    );
    const aiMessage = mockResponses[keyword] || mockResponses.default;

    const sessionAfterAssistantMessage = await appendMessageToSession(
      sessionId,
      req.user.userId,
      {
        role: "assistant",
        content: aiMessage,
        timestamp: new Date(),
      },
    );

    const createdActionLogs = await persistActionLogs(
      sessionId,
      req.user.userId,
      [],
    );

    res.json({
      message: aiMessage,
      sessionId,
      messagesCount: sessionAfterAssistantMessage.messages.length,
      actionItems: [],
      actionLogs: createdActionLogs,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
