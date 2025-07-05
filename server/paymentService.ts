import Razorpay from 'razorpay';
import crypto from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Resolve __dirname in ES modules
const __dirname = dirname(fileURLToPath(import.meta.url));
const PAYMENTS_FILE = join(__dirname, 'payments.json');

export interface Payment {
  id: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  amount: number; // in paise
  currency: string;
  status: 'created' | 'paid' | 'failed' | 'cancelled';
  description: string;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  upiId?: string;
  paymentMethod?: string;
  createdAt: string;
  updatedAt: string;
  failureReason?: string;
}

export interface PaymentRequest {
  amount: number; // in rupees
  description: string;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
}

export interface PaymentVerification {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

class PaymentService {
  private razorpay: Razorpay;
  private keyId: string;
  private keySecret: string;

  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID || '';
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    
    if (!this.keyId || !this.keySecret) {
      console.warn('Razorpay credentials not found. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.');
    }

    this.razorpay = new Razorpay({
      key_id: this.keyId,
      key_secret: this.keySecret,
    });

    // Ensure the payments file exists
    if (!existsSync(PAYMENTS_FILE)) {
      writeFileSync(PAYMENTS_FILE, '[]', 'utf-8');
    }
  }

  private getPayments(): Payment[] {
    try {
      const raw = readFileSync(PAYMENTS_FILE, 'utf-8');
      return JSON.parse(raw) as Payment[];
    } catch (err) {
      console.error('Failed to read payments file', err);
      return [];
    }
  }

  private savePayments(payments: Payment[]): void {
    try {
      writeFileSync(PAYMENTS_FILE, JSON.stringify(payments, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write payments file', err);
    }
  }

  private savePayment(payment: Payment): void {
    const payments = this.getPayments();
    const existingIndex = payments.findIndex(p => p.id === payment.id);
    
    if (existingIndex >= 0) {
      payments[existingIndex] = payment;
    } else {
      payments.push(payment);
    }
    
    this.savePayments(payments);
  }

  async createOrder(paymentRequest: PaymentRequest): Promise<Payment> {
    if (!this.keyId || !this.keySecret) {
      throw new Error('Razorpay credentials not configured');
    }

    const amount = Math.round(paymentRequest.amount * 100); // Convert to paise
    
    const options = {
      amount,
      currency: 'INR',
      receipt: `order_${Date.now()}`,
      notes: {
        description: paymentRequest.description,
        customer_email: paymentRequest.customerEmail || '',
        customer_phone: paymentRequest.customerPhone || '',
        customer_name: paymentRequest.customerName || '',
      },
    };

    try {
      const order = await this.razorpay.orders.create(options);
      
      const payment: Payment = {
        id: order.id,
        razorpayOrderId: order.id,
        amount,
        currency: order.currency,
        status: 'created',
        description: paymentRequest.description,
        customerEmail: paymentRequest.customerEmail,
        customerPhone: paymentRequest.customerPhone,
        customerName: paymentRequest.customerName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.savePayment(payment);
      return payment;
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      throw new Error('Failed to create payment order');
    }
  }

  async verifyPayment(verification: PaymentVerification): Promise<Payment> {
    if (!this.keySecret) {
      throw new Error('Razorpay key secret not configured');
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = verification;

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      throw new Error('Invalid payment signature');
    }

    // Get payment details from Razorpay
    try {
      const razorpayPayment = await this.razorpay.payments.fetch(razorpay_payment_id);
      
      const payments = this.getPayments();
      const payment = payments.find(p => p.razorpayOrderId === razorpay_order_id);
      
      if (!payment) {
        throw new Error('Payment not found');
      }

      // Update payment status
      payment.razorpayPaymentId = razorpay_payment_id;
      payment.status = razorpayPayment.status === 'captured' ? 'paid' : 'failed';
      payment.paymentMethod = razorpayPayment.method;
      payment.updatedAt = new Date().toISOString();

      // Extract UPI ID if payment method is UPI
      if (razorpayPayment.method === 'upi' && (razorpayPayment as any).upi) {
        payment.upiId = (razorpayPayment as any).upi.vpa;
      }

      if (payment.status === 'failed') {
        payment.failureReason = razorpayPayment.error_description || 'Payment failed';
      }

      this.savePayment(payment);
      return payment;
    } catch (error) {
      console.error('Error verifying payment:', error);
      throw new Error('Failed to verify payment');
    }
  }

  async getPayment(paymentId: string): Promise<Payment | null> {
    const payments = this.getPayments();
    return payments.find(p => p.id === paymentId) || null;
  }

  async getAllPayments(): Promise<Payment[]> {
    return this.getPayments();
  }

  async handleWebhook(body: any, signature: string): Promise<void> {
    if (!this.keySecret) {
      throw new Error('Razorpay webhook secret not configured');
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(JSON.stringify(body))
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new Error('Invalid webhook signature');
    }

    const { event, payload } = body;

    if (event === 'payment.captured' || event === 'payment.failed') {
      const razorpayPayment = payload.payment.entity;
      const payments = this.getPayments();
      const payment = payments.find(p => p.razorpayOrderId === razorpayPayment.order_id);

      if (payment) {
        payment.razorpayPaymentId = razorpayPayment.id;
        payment.status = event === 'payment.captured' ? 'paid' : 'failed';
        payment.paymentMethod = razorpayPayment.method;
        payment.updatedAt = new Date().toISOString();

        if (razorpayPayment.method === 'upi' && (razorpayPayment as any).upi) {
          payment.upiId = (razorpayPayment as any).upi.vpa;
        }

        if (event === 'payment.failed') {
          payment.failureReason = razorpayPayment.error_description || 'Payment failed';
        }

        this.savePayment(payment);
      }
    }
  }

  // Test method to check if service is properly configured
  isConfigured(): boolean {
    return !!(this.keyId && this.keySecret);
  }

  getPublicKey(): string {
    return this.keyId;
  }
}

export const paymentService = new PaymentService();