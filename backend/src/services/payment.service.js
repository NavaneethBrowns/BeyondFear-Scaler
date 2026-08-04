import crypto from 'crypto';
import Razorpay from 'razorpay';
import Payment from '../models/Payment.js';
import {
  PRICING_TIERS,
  isValidPlanType,
  getPricingTier,
  calculateExpiryDate,
  PAYMENT_STATUS,
} from '../config/pricing.js';

const DEFAULT_CURRENCY = 'INR';

const getRazorpayCredentials = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw { statusCode: 500, message: 'Razorpay credentials are not configured' };
  }

  return { keyId, keySecret };
};

const getRazorpayClient = () => {
  const { keyId, keySecret } = getRazorpayCredentials();
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

/**
 * Create payment order with plan validation
 * @param {Object} params - { amount, currency, receipt, planType, userId }
 * @returns {Object} Order details
 */
export const createPaymentOrder = async ({
  amount,
  currency = DEFAULT_CURRENCY,
  receipt,
  planType,
  userId,
}) => {
  // Validate plan type if provided
  if (planType && !isValidPlanType(planType)) {
    throw { statusCode: 400, message: `Invalid plan type: ${planType}` };
  }

  // If plan type provided, validate amount matches
  if (planType) {
    const tier = getPricingTier(planType);
    if (amount !== tier.amount) {
      throw {
        statusCode: 400,
        message: `Amount mismatch for ${planType} plan. Expected ${tier.amount} paise, got ${amount}`,
      };
    }
  }

  if (!Number.isInteger(amount) || amount < 100) {
    throw { statusCode: 400, message: 'Amount must be an integer and at least 100 paise' };
  }

  const razorpay = getRazorpayClient();

  try {
    const order = await razorpay.orders.create({
      amount,
      currency,
      receipt,
    });

    // Store order in database
    const payment = new Payment({
      userId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      planType: planType || 'monthly',
      status: PAYMENT_STATUS.CREATED,
    });

    await payment.save();

    return {
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      planType: planType || 'monthly',
    };
  } catch (error) {
    if (error.statusCode) throw error; // Re-throw validation errors

    const upstreamStatus = Number(error?.statusCode);
    const statusCode = Number.isInteger(upstreamStatus) && upstreamStatus >= 400 && upstreamStatus < 600
      ? upstreamStatus
      : 500;
    const message = error?.error?.description || error?.message || 'Failed to create Razorpay order';
    throw { statusCode, message };
  }
};

/**
 * Verify payment signature
 * @param {Object} params - { orderId, paymentId, signature }
 * @returns {boolean} Is signature valid
 */
export const verifyPaymentSignature = ({ orderId, paymentId, signature }) => {
  if (!orderId || !paymentId || !signature) {
    throw { statusCode: 400, message: 'Missing payment verification fields' };
  }

  const { keySecret } = getRazorpayCredentials();
  const generatedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return generatedSignature === signature;
};

/**
 * Update payment record after successful verification
 * @param {string} orderId - Razorpay order ID
 * @param {string} paymentId - Razorpay payment ID
 * @param {string} signature - Payment signature
 * @returns {Object} Updated payment record
 */
export const recordPaymentCapture = async (orderId, paymentId, signature) => {
  const payment = await Payment.findOne({ orderId });

  if (!payment) {
    throw { statusCode: 404, message: 'Order not found' };
  }

  // Update payment record
  payment.paymentId = paymentId;
  payment.signature = signature;
  payment.status = PAYMENT_STATUS.CAPTURED;
  payment.sessionUnlocked = true;

  await payment.save();

  return payment;
};

/**
 * Get subscription info from last successful payment
 * @param {string} userId - User ID
 * @returns {Object} Subscription details or null
 */
export const getSubscriptionFromLastPayment = async (userId) => {
  const payment = await Payment.findOne({
    userId,
    status: PAYMENT_STATUS.CAPTURED,
  }).sort({ createdAt: -1 });

  if (!payment) {
    return null;
  }

  return {
    planType: payment.planType,
    expiresAt: calculateExpiryDate(payment.planType, payment.createdAt),
    paymentId: payment.paymentId,
    orderId: payment.orderId,
  };
};

/**
 * Handle payment failure
 * @param {string} orderId - Razorpay order ID
 * @param {string} reason - Failure reason
 */
export const recordPaymentFailure = async (orderId, reason) => {
  const payment = await Payment.findOne({ orderId });

  if (!payment) {
    throw { statusCode: 404, message: 'Order not found' };
  }

  payment.status = PAYMENT_STATUS.FAILED;
  payment.metadata = {
    ...payment.metadata,
    failureReason: reason,
  };

  await payment.save();

  return payment;
};