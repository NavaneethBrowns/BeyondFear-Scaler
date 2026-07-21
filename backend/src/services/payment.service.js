import crypto from 'crypto';
import Razorpay from 'razorpay';

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

export const createPaymentOrder = async ({ amount, currency = DEFAULT_CURRENCY, receipt }) => {
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

    return {
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
    };
  } catch (error) {
    const statusCode = error?.statusCode === 401 ? 401 : 500;
    const message = error?.error?.description || error?.message || 'Failed to create Razorpay order';
    throw { statusCode, message };
  }
};

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