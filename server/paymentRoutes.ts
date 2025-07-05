import express, { Request, Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';

const router = express.Router();

// Ensure that the required environment variables are set
const {
  RAZORPAY_KEY_ID = '',
  RAZORPAY_KEY_SECRET = '',
} = process.env;

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.warn('[UPI] Razorpay environment variables not configured. Payment routes will be disabled.');
}

// Initialize the Razorpay SDK instance
const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

/**
 * POST /payments/create-order
 * Request body: { amount: number; currency?: string; receipt?: string }
 * Returns: { id, amount, currency, key_id }
 */
router.post('/create-order', async (req: Request, res: Response) => {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return res.status(503).json({ error: 'Payment service not configured' });
  }

  const { amount, currency = 'INR', receipt } = req.body as {
    amount?: number;
    currency?: string;
    receipt?: string;
  };

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  try {
    const options = {
      amount: Math.round(amount * 100), // Convert rupees to paise
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
      payment_capture: 1,
    } as Razorpay.OrderCreateRequestBody;

    const order = await razorpay.orders.create(options);

    return res.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: RAZORPAY_KEY_ID, // Send public key to client
    });
  } catch (error) {
    console.error('[UPI] Failed to create Razorpay order', error);
    return res.status(500).json({ error: 'Failed to create order' });
  }
});

/**
 * POST /payments/verify
 * Verify payment signature returned from Razorpay checkout
 * Expected body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 */
router.post('/verify', (req: Request, res: Response) => {
  try {
    if (!RAZORPAY_KEY_SECRET) {
      return res.status(503).json({ error: 'Payment service not configured' });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body as Record<string, string>;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    const generatedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature === razorpay_signature) {
      // Signature verified
      return res.json({ success: true });
    }

    return res.status(400).json({ success: false, error: 'Invalid signature' });
  } catch (error) {
    console.error('[UPI] Verification error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;