import mongoose from 'mongoose';

const actionLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: String,
    actionType: {
      type: String,
      enum: ['breathing', 'reflection', 'behavior-change', 'goal'],
      default: 'reflection',
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'skipped'],
      default: 'pending',
    },
    dueDate: Date,
    completedAt: Date,
    skippedAt: Date,
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'easy',
    },
    attempts: {
      type: Number,
      default: 0,
    },
    completionNotes: String,
  },
  { timestamps: true }
);

export default mongoose.model('ActionLog', actionLogSchema);