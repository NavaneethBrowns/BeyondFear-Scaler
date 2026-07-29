import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  createPaymentOrder,
  verifyPaymentSignature,
  recordPaymentCapture,
  recordPaymentFailure,
  getSubscriptionFromLastPayment,
} from '../services/payment.service.js';
import {
  getUserById,
  toUserResponse,
  updateUserSubscription,
} from '../services/auth.store.js';
import {
  getPricingTier,
  isValidPlanType,
  canCreateSession,
  getSessionsRemaining,
} from '../config/pricing.js';

const router = express.Router();

/**
 * POST /api/payments/create-order
 * Create Razorpay payment order with plan validation
 */
router.post('/create-order', authMiddleware, async (req, res, next) => {
  try {
    const { planType } = req.body;

    // Validate plan type
    if (!planType || !isValidPlanType(planType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or missing plan type. Must be: monthly, quarterly, or annual',
      });
    }

    // Get pricing tier
    const tier = getPricingTier(planType);
    if (!tier) {
      return res.status(400).json({
        success: false,
        error: `Plan type "${planType}" is not available`,
      });
    }

    // Create order with plan validation
    const order = await createPaymentOrder({
      amount: tier.amount,
      currency: tier.currency,
      receipt: `rcpt_${req.user.userId}_${Date.now()}`,
      planType,
      userId: req.user.userId,
    });

    res.json({
      success: true,
      order,
      planDetails: {
        name: tier.name,
        description: tier.description,
        amount: tier.amount,
        durationDays: tier.durationDays,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/payments/verify
 * Verify payment signature and update subscription
 */
const verifyPaymentHandler = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Validate input
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing payment verification fields: razorpay_order_id, razorpay_payment_id, razorpay_signature',
      });
    }

    // Verify signature
    let isValid;
    try {
      isValid = verifyPaymentSignature({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Signature verification failed',
      });
    }

    if (!isValid) {
      // Record failure
      await recordPaymentFailure(razorpay_order_id, 'Signature mismatch');

      return res.status(400).json({
        success: false,
        error: 'Payment signature mismatch. Payment not verified.',
      });
    }

    // Record payment capture
    const payment = await recordPaymentCapture(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    // Update user subscription
    const subscriptionData = {
      status: 'premium',
      planType: payment.planType,
      expiresAt: new Date(new Date().getTime() + payment.durationDays * 24 * 60 * 60 * 1000),
      lastPaymentDate: new Date(),
    };

    const user = await updateUserSubscription(
      req.user.userId,
      subscriptionData
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found after payment verification',
      });
    }

    res.json({
      success: true,
      message: 'Payment verified and subscription activated',
      subscription: {
        status: user.subscription.status,
        planType: user.subscription.planType,
        expiresAt: user.subscription.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

router.post('/verify', authMiddleware, verifyPaymentHandler);
router.post('/verify-payment', authMiddleware, verifyPaymentHandler);

/**
 * GET /api/payments/status
 * Get user's current subscription and session status
 */
router.get('/status', authMiddleware, async (req, res, next) => {
  try {
    const user = await getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userResponse = toUserResponse(user);
    const sessionsRemaining = getSessionsRemaining(user);
    const canCreate = canCreateSession(user);

    res.json({
      success: true,
      subscription: userResponse.subscription,
      sessions: sessionsRemaining,
      canCreateSession: canCreate.allowed,
      limitMessage: canCreate.reason || null,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/payments/plans
 * Get all available pricing plans
 */
router.get('/plans', async (req, res, next) => {
  try {
    const plans = [
      {
        ...getPricingTier('monthly'),
        displayAmount: '₹199',
      },
      {
        ...getPricingTier('quarterly'),
        displayAmount: '₹499',
      },
      {
        ...getPricingTier('annual'),
        displayAmount: '₹799',
      },
    ];

    res.json({
      success: true,
      plans,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/payments/record-failure
 * Record a payment failure (called by frontend on payment failure)
 */
router.post('/record-failure', authMiddleware, async (req, res, next) => {
  try {
    const { orderId, reason } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'orderId is required',
      });
    }

    await recordPaymentFailure(orderId, reason || 'User cancelled payment');

    res.json({
      success: true,
      message: 'Payment failure recorded',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
