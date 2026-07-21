import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      default: 'Untitled Session',
    },
    description: String,
    messages: [
      {
        role: { type: String, enum: ['user', 'assistant'], required: true },
        content: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: ['active', 'archived', 'deleted'],
      default: 'active',
    },
    summary: String,
    actionItems: [String],
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
  if (this.isNew && this.messages.length > 0 && !this.title) {
    const firstMessage = this.messages[0].content;
    this.title = firstMessage.substring(0, 50) + (firstMessage.length > 50 ? '...' : '');
  }
  next();
});

export default mongoose.model('Session', sessionSchema);
