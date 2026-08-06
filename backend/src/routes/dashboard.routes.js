import express from "express";
import Session from "../models/Session.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

const getCurrentIntensity = (session) => {
  const finalScore = session?.fearIntensity?.finalScore;
  if (typeof finalScore === "number") return finalScore;

  const initialScore = session?.fearIntensity?.initialScore;
  if (typeof initialScore === "number") return initialScore;

  return null;
};

const average = (values) => {
  if (!values.length) return 0;
  const sum = values.reduce((total, value) => total + value, 0);
  return Number((sum / values.length).toFixed(1));
};

const getWeekStartUtc = (date) => {
  const value = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = value.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  value.setUTCDate(value.getUTCDate() + diff);
  return value;
};

const getWeekKey = (date) => getWeekStartUtc(date).toISOString().slice(0, 10);

const isIncognitoSession = (session) =>
  Array.isArray(session?.tags) && session.tags.includes("incognito");

const getStreakWeeks = (sessions) => {
  if (!sessions.length) return 0;

  const weeksWithSessions = new Set(
    sessions
      .map((session) => new Date(session.updatedAt))
      .filter((date) => !Number.isNaN(date.getTime()))
      .map((date) => getWeekKey(date)),
  );

  if (!weeksWithSessions.size) return 0;

  let streak = 0;
  const cursor = getWeekStartUtc(new Date());

  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (!weeksWithSessions.has(key)) break;
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 7);
  }

  return streak;
};

router.get("/summary", authMiddleware, async (req, res, next) => {
  try {
    const sessions = await Session.find({
      userId: req.user.userId,
      status: { $ne: "deleted" },
    })
      .sort({ updatedAt: -1 })
      .lean();

    const visibleSessions = sessions.filter(
      (session) => !isIncognitoSession(session),
    );

    const totalSessions = visibleSessions.length;
    const completedSessions = visibleSessions.filter(
      (session) => session.status === "completed",
    ).length;
    const completionRate =
      totalSessions > 0
        ? Math.round((completedSessions / totalSessions) * 100)
        : 0;

    const currentIntensities = visibleSessions
      .map(getCurrentIntensity)
      .filter((value) => typeof value === "number");

    const initialIntensities = visibleSessions
      .map((session) => session?.fearIntensity?.initialScore)
      .filter((value) => typeof value === "number");

    const averageIntensity = average(currentIntensities);
    const baselineIntensity = average(initialIntensities);

    const sortedByDate = [...visibleSessions].sort(
      (left, right) =>
        new Date(left.updatedAt).getTime() -
        new Date(right.updatedAt).getTime(),
    );

    const intensityTrend = sortedByDate.slice(-7).map((session, index) => ({
      session: `S${index + 1}`,
      intensity: getCurrentIntensity(session) ?? 5,
    }));

    const latestSessionWithScore = visibleSessions.find(
      (session) => typeof getCurrentIntensity(session) === "number",
    );
    const latestScore = latestSessionWithScore
      ? getCurrentIntensity(latestSessionWithScore)
      : null;

    let bestScore = null;
    let bestScoreTitle = null;
    visibleSessions.forEach((session) => {
      const score = getCurrentIntensity(session);
      if (typeof score !== "number") return;
      if (bestScore === null || score < bestScore) {
        bestScore = score;
        bestScoreTitle =
          session.title || session.fearTitle || "Untitled session";
      }
    });

    const threeWeeksAgo = Date.now() - 21 * 24 * 60 * 60 * 1000;
    const recentMomentumCount = visibleSessions.filter(
      (session) => new Date(session.updatedAt).getTime() >= threeWeeksAgo,
    ).length;
    const momentumLabel =
      recentMomentumCount >= 4
        ? "Building"
        : recentMomentumCount >= 2
          ? "Steady"
          : "Starting";
    const momentumNote = `${recentMomentumCount} session${recentMomentumCount === 1 ? "" : "s"} in three weeks`;

    const streakWeeks = getStreakWeeks(visibleSessions);

    const recentSessions = visibleSessions.slice(0, 6).map((session) => ({
      id: String(session._id),
      title: session.title || session.fearTitle || "Untitled session",
      updatedAt: session.updatedAt,
      messageCount: Array.isArray(session.messages)
        ? session.messages.length
        : 0,
      intensityStart: session?.fearIntensity?.initialScore ?? 5,
      intensityNow: getCurrentIntensity(session) ?? 5,
      status: session.status,
    }));

    const directionDelta = Number(
      (baselineIntensity - averageIntensity).toFixed(1),
    );
    const direction =
      directionDelta > 0.1 ? "down" : directionDelta < -0.1 ? "up" : "stable";

    res.json({
      summary: {
        totalSessions,
        completedSessions,
        completionRate,
        averageIntensity,
        baselineIntensity,
        direction,
        directionDelta: Math.abs(directionDelta),
      },
      intensityTrend,
      insights: {
        latestScore,
        bestScore,
        bestScoreTitle,
        momentumLabel,
        momentumNote,
        streakWeeks,
      },
      recentSessions,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
