import mongoose from "mongoose";
import ActionLog from "../models/ActionLog.js";
import { attachActionLogToSession } from "./session.store.js";

const isMongoReady = () => mongoose.connection?.readyState === 1;
const assertMongoReady = () => {
  if (!isMongoReady()) {
    throw new Error("MongoDB connection is not ready");
  }
};

const cloneActionLog = (actionLog) => {
  if (!actionLog) return null;

  if (typeof actionLog.toJSON === "function") {
    return actionLog.toJSON();
  }

  return { ...actionLog };
};

export const createActionLogRecord = async ({
  userId,
  sessionId,
  title,
  description,
  actionType,
  status,
  dueDate,
  priority,
  difficulty,
}) => {
  assertMongoReady();
  const actionLog = new ActionLog({
    userId,
    sessionId,
    title,
    description,
    actionType,
    status,
    dueDate,
    priority,
    difficulty,
  });

  await actionLog.save();
  await attachActionLogToSession(sessionId, userId, actionLog._id);
  return cloneActionLog(actionLog);
};

export const listActionLogsForSession = async (sessionId) => {
  assertMongoReady();
  const actionLogs = await ActionLog.find({ sessionId }).sort({
    createdAt: -1,
  });
  return actionLogs.map(cloneActionLog);
};

export const getActionLogForUserAndSession = async (
  actionLogId,
  userId,
  sessionId,
) => {
  assertMongoReady();
  const actionLog = await ActionLog.findOne({
    _id: actionLogId,
    userId,
    sessionId,
  });
  return cloneActionLog(actionLog);
};

export const updateActionLogStatus = async (actionLogId, userId, patch) => {
  assertMongoReady();
  const actionLog = await ActionLog.findOneAndUpdate(
    { _id: actionLogId, userId },
    patch,
    { new: true },
  );

  return cloneActionLog(actionLog);
};
