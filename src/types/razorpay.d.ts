/* eslint-disable @typescript-eslint/consistent-type-definitions */
// Global type definitions for Razorpay checkout SDK
// This makes TypeScript aware of the window.Razorpay constructor

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name?: string;
  description?: string;
  image?: string;
  order_id: string;
  handler?: (response: RazorpayResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
}

declare class Razorpay {
  constructor(options: RazorpayOptions);
  open(): void;
  on(event: string, callback: (...args: any[]) => void): void;
}

declare global {
  interface Window {
    Razorpay: typeof Razorpay;
  }
}

export {};

// Minimal NodeJS type declaration for the 'razorpay' npm package
declare module 'razorpay' {
  interface RazorpayInstanceOptions {
    key_id: string;
    key_secret: string;
  }

  interface RazorpayOrderRequest {
    amount: number; // paise
    currency: string;
    receipt: string;
    payment_capture?: 0 | 1;
  }

  interface RazorpayOrderResponse {
    id: string;
    amount: number;
    currency: string;
    receipt: string;
    status: string;
    created_at: number;
  }

  export default class Razorpay {
    constructor(options: RazorpayInstanceOptions);
    orders: {
      create(options: RazorpayOrderRequest): Promise<RazorpayOrderResponse>;
    };
  }
}