import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  createPaymentOrder,
  verifyPaymentSignature,
} from '../services/payment.service.js';
import {
  getUserById,
  toUserResponse,
  updateUserSubscription,
} from '../services/auth.store.js';

const router = express.Router();

const verifyPaymentHandler = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const isValid = verifyPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      return res.status(400).json({ success: false, error: 'Payment signature mismatch' });
    }

    const user = await updateUserSubscription(
      req.user.userId,
      {
        status: 'premium',
        lastPaymentDate: new Date(),
      },
    );

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      subscription: user.subscription,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/payments/create-order
 * Create Razorpay payment order
 */
router.post('/create-order', authMiddleware, async (req, res, next) => {
  try {
    const requestedAmount = Number.parseInt(req.body?.amount, 10);
    const amount = Number.isInteger(requestedAmount) ? requestedAmount : 29900;
    const currency = req.body?.currency || 'INR';
    const receipt = req.body?.receipt || `rcpt_${Date.now()}`;

    const order = await createPaymentOrder({
      amount,
      currency,
      receipt,
    });

    res.json(order);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/payments/verify
 * Verify payment and update subscription
 */
router.post('/verify', authMiddleware, verifyPaymentHandler);
router.post('/verify-payment', authMiddleware, verifyPaymentHandler);

/**
 * GET /api/payments/status
 * Get payment status
 */
router.get('/status', authMiddleware, async (req, res, next) => {
  try {
    const user = await getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ subscription: toUserResponse(user).subscription });
  } catch (error) {
    next(error);
  }
});

export default router;
