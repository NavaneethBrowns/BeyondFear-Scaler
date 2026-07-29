import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    tokenCount: Number,
  },
  { _id: false }
);

const actionItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    dueDate: Date,
    completed: { type: Boolean, default: false },
    completedAt: Date,
    priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
    actionType: { type: String, enum: ['breathing', 'reflection', 'behavior-change', 'goal'], default: 'reflection' },
  },
  { _id: false }
);

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      default: null,
    },
    fearTitle: {
      type: String,
      default: null,
    },
    description: String,
    fearDescription: String,
    fearCategory: String,
    messages: [chatMessageSchema],
    conversationHistory: [chatMessageSchema],
    status: {
      type: String,
      enum: ['active', 'archived', 'completed', 'deleted'],
      default: 'active',
    },
    fearIntensity: {
      initialScore: { type: Number, min: 1, max: 10 },
      finalScore: { type: Number, min: 1, max: 10 },
      trend: { type: String, enum: ['decreased', 'increased', 'stable'], default: 'stable' },
    },
    completedAt: Date,
    summary: String,
    actionItems: [actionItemSchema],
    keyInsights: [String],
    actionLogs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ActionLog' }],
    tags: [String],
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
      default: 'neutral',
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Auto-title session based on first message
sessionSchema.pre('save', async function (next) {
  if (this.isNew && !this.title) {
    if (this.fearTitle) {
      this.title = this.fearTitle;
    } else if (this.messages.length > 0) {
      const firstMessage = this.messages[0].content || '';
      this.title = firstMessage.substring(0, 50) + (firstMessage.length > 50 ? '...' : '');
    } else {
      this.title = 'Untitled Session';
    }
  }

  if (!this.fearTitle && this.title) {
    this.fearTitle = this.title;
  }

  if (!this.conversationHistory?.length && this.messages?.length) {
    this.conversationHistory = this.messages;
  }

  if (!this.messages?.length && this.conversationHistory?.length) {
    this.messages = this.conversationHistory;
  }

  if (this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }

  next();
});

export default mongoose.model('Session', sessionSchema);
