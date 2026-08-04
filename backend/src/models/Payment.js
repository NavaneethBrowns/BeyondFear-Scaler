import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    paymentId: {
      type: String,
      default: undefined,
    },
    amount: {
      type: Number,
      required: true,
      min: 100, // Minimum 100 paise (₹1)
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD'],
    },
    planType: {
      type: String,
      required: true,
      enum: ['monthly', 'quarterly', 'annual'],
    },
    status: {
      type: String,
      required: true,
      enum: ['created', 'attempted', 'captured', 'failed', 'refunded'],
      default: 'created',
      index: true,
    },
    signature: {
      type: String,
      default: null,
    },
    sessionUnlocked: {
      type: Boolean,
      default: false,
    },
    metadata: {
      userEmail: String,
      userAgent: String,
      ipAddress: String,
      failureReason: String, // Why payment failed (if status is 'failed')
      retryCount: { type: Number, default: 0 },
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Index for finding recent payments by user
paymentSchema.index({ userId: 1, createdAt: -1 });

// Index for finding successful payments
paymentSchema.index({ userId: 1, status: 1 });

// Unique paymentId only when a real payment id string exists.
paymentSchema.index(
  { paymentId: 1 },
  {
    unique: true,
    partialFilterExpression: { paymentId: { $type: 'string' } },
  }
);

// TTL index: auto-delete 'created' orders after 15 minutes if not captured.
// MongoDB TTL indexes must be single-field indexes.
paymentSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 900, // 15 minutes
    partialFilterExpression: { status: 'created' },
  }
);

// Virtual for subscription duration in days
paymentSchema.virtual('durationDays').get(function () {
  const durations = {
    monthly: 30,
    quarterly: 90,
    annual: 365,
  };
  return durations[this.planType] || 30;
});

// Method to check if payment is still valid
paymentSchema.methods.isValid = function () {
  if (this.status !== 'captured') return false;
  if (this.expiresAt && new Date() > this.expiresAt) return false;
  return true;
};

// Statics for common queries
paymentSchema.statics.findActivePaymentsByUser = function (userId) {
  return this.find({
    userId,
    status: 'captured',
    $or: [
      { expiresAt: null },
      { expiresAt: { $gte: new Date() } },
    ],
  }).sort({ createdAt: -1 });
};

paymentSchema.statics.findLatestSuccessfulPayment = function (userId) {
  return this.findOne({
    userId,
    status: 'captured',
  }).sort({ createdAt: -1 });
};

export default mongoose.model('Payment', paymentSchema);
