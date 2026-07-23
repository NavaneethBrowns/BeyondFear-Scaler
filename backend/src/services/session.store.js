import mongoose from 'mongoose';
import Session from '../models/Session.js';

const isMongoReady = () => mongoose.connection?.readyState === 1;
const assertMongoReady = () => {
  if (!isMongoReady()) {
    throw new Error('MongoDB connection is not ready');
  }
};

const cloneSession = (session, { includeMessages = true } = {}) => {
  if (!session) return null;

  if (typeof session.toJSON === 'function') {
    return session.toJSON();
  }

  const cloned = {
    ...session,
    tags: Array.isArray(session.tags) ? [...session.tags] : [],
    actionItems: Array.isArray(session.actionItems) ? [...session.actionItems] : [],
  };

  if (includeMessages) {
    cloned.messages = Array.isArray(session.messages)
      ? session.messages.map((message) => ({ ...message }))
      : [];
  } else {
    delete cloned.messages;
  }

  return cloned;
};

const normalizeTags = (tags, category) => {
  if (Array.isArray(tags)) {
    return tags.filter(Boolean);
  }

  if (typeof tags === 'string' && tags.trim()) {
    return [tags.trim()];
  }

  if (typeof category === 'string' && category.trim()) {
    return [category.trim()];
  }

  return [];
};

const buildMemorySession = ({ userId, title, description, tags }) => {
  const now = new Date();
  const normalizedTags = normalizeTags(tags);
  const fearTitle = title || null;

  return {
    _id: randomUUID(),
    userId,
    title: fearTitle,
    fearTitle,
    description: description || undefined,
    fearDescription: description || undefined,
    fearCategory: normalizedTags[0] || undefined,
    messages: [],
    conversationHistory: [],
    status: 'active',
    fearIntensity: { trend: 'stable' },
    summary: undefined,
    actionItems: [],
    keyInsights: [],
    actionLogs: [],
    tags: normalizedTags,
    sentiment: 'neutral',
    isPaid: false,
    completedAt: undefined,
    createdAt: now,
    updatedAt: now,
  };
};

export const createSessionRecord = async ({ userId, title, description, tags, fearIntensityInitial }) => {
  assertMongoReady();
  const session = new Session({
    userId,
    title: title || null,
    fearTitle: title || null,
    description,
    fearDescription: description,
    fearCategory: normalizeTags(tags)[0],
    tags: normalizeTags(tags),
    messages: [],
    conversationHistory: [],
    ...(typeof fearIntensityInitial === 'number'
      ? { fearIntensity: { initialScore: fearIntensityInitial, trend: 'stable' } }
      : {}),
  });

  await session.save();
  return cloneSession(session);
};

export const listSessionsForUser = async (userId) => {
  assertMongoReady();
  const sessions = await Session.find({ userId })
    .select('-messages')
    .sort({ createdAt: -1 });

  return sessions.map((session) => cloneSession(session, { includeMessages: false }));
};

export const getSessionForUser = async (sessionId, userId) => {
  assertMongoReady();
  const session = await Session.findOne({ _id: sessionId, userId });
  return cloneSession(session);
};

export const updateSessionForUser = async (sessionId, userId, patch) => {
  const update = {
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.title !== undefined ? { fearTitle: patch.title } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.description !== undefined ? { fearDescription: patch.description } : {}),
    ...(patch.tags !== undefined ? { tags: normalizeTags(patch.tags) } : {}),
    ...(patch.tags !== undefined ? { fearCategory: normalizeTags(patch.tags)[0] } : {}),
  };

  assertMongoReady();
  const session = await Session.findOneAndUpdate(
    { _id: sessionId, userId },
    update,
    { new: true }
  );

  return cloneSession(session);
};

export const appendMessageToSession = async (sessionId, userId, message) => {
  assertMongoReady();
  const session = await Session.findOne({ _id: sessionId, userId });
  if (!session || session.status === 'deleted') {
    return null;
  }

  session.messages.push(message);
  session.conversationHistory.push(message);
  await session.save();
  return cloneSession(session);
};

export const addKeyInsightsToSession = async (sessionId, userId, insights) => {
  if (!Array.isArray(insights) || insights.length === 0) return null;
  assertMongoReady();
  const session = await Session.findOneAndUpdate(
    { _id: sessionId, userId },
    { $addToSet: { keyInsights: { $each: insights.filter(Boolean) } } },
    { new: true }
  );
  return cloneSession(session);
};

export const updateFearIntensity = async (sessionId, userId, { initialScore, finalScore }) => {
  assertMongoReady();
  const update = {};
  if (typeof initialScore === 'number') update['fearIntensity.initialScore'] = initialScore;
  if (typeof finalScore === 'number') {
    update['fearIntensity.finalScore'] = finalScore;
    if (typeof initialScore === 'number') {
      update['fearIntensity.trend'] =
        finalScore < initialScore ? 'decreased'
        : finalScore > initialScore ? 'increased'
        : 'stable';
    }
  }
  const session = await Session.findOneAndUpdate(
    { _id: sessionId, userId },
    update,
    { new: true }
  );
  return cloneSession(session);
};

export const attachActionLogToSession = async (sessionId, userId, actionLogId) => {
  assertMongoReady();
  const session = await Session.findOneAndUpdate(
    { _id: sessionId, userId },
    { $addToSet: { actionLogs: actionLogId } },
    { new: true }
  );

  return cloneSession(session);
};

export const completeSessionForUser = async (sessionId, userId, fearIntensityFinal) => {
  assertMongoReady();

  const update = { status: 'completed', completedAt: new Date() };

  if (typeof fearIntensityFinal === 'number') {
    const existing = await Session.findOne({ _id: sessionId, userId }).select('fearIntensity');
    const initialScore = existing?.fearIntensity?.initialScore;
    update['fearIntensity.finalScore'] = fearIntensityFinal;
    if (typeof initialScore === 'number') {
      update['fearIntensity.trend'] =
        fearIntensityFinal < initialScore ? 'decreased'
        : fearIntensityFinal > initialScore ? 'increased'
        : 'stable';
    }
  }

  const session = await Session.findOneAndUpdate(
    { _id: sessionId, userId },
    update,
    { new: true }
  );

  return cloneSession(session);
};

export const deleteSessionForUser = async (sessionId, userId) => {
  assertMongoReady();
  const session = await Session.findOneAndUpdate(
    { _id: sessionId, userId },
    { status: 'deleted' },
    { new: true }
  );

  return cloneSession(session);
};