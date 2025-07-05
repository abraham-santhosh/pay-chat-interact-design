import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, Smartphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const paymentSchema = z.object({
  amount: z.number().min(1, 'Amount must be at least ₹1').max(100000, 'Amount cannot exceed ₹1,00,000'),
  description: z.string().min(1, 'Description is required'),
  customerName: z.string().optional(),
  customerEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  customerPhone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number').optional().or(z.literal('')),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentFormProps {
  onPaymentSuccess?: (payment: any) => void;
  onPaymentError?: (error: string) => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

const PaymentForm: React.FC<PaymentFormProps> = ({ onPaymentSuccess, onPaymentError }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
  });

  // Helper function to handle API responses
  const handleApiResponse = async (response: Response) => {
    const contentType = response.headers.get('content-type');
    
    if (!response.ok) {
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      } else {
        // If it's not JSON, it might be an HTML error page
        const text = await response.text();
        if (text.includes('<!DOCTYPE')) {
          throw new Error('Server returned an HTML page instead of JSON. Please check if the backend server is running on port 4000.');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    }

    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      throw new Error('Server did not return JSON data');
    }
  };

  // Load Razorpay script
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        setRazorpayLoaded(true);
        resolve(true);
      };
      script.onerror = () => {
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

  const handlePayment = async (data: PaymentFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Load Razorpay script if not already loaded
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay');
      }

      // Get Razorpay configuration
      const configResponse = await fetch('/api/payments/config');
      const config = await handleApiResponse(configResponse);

      if (!config.configured) {
        throw new Error('Payment service not configured. Please contact support.');
      }

      // Create payment order
      const orderResponse = await fetch('/api/payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const order = await handleApiResponse(orderResponse);

      // Configure Razorpay options
      const options = {
        key: config.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Split Easy',
        description: order.description,
        order_id: order.id,
        prefill: {
          name: data.customerName || '',
          email: data.customerEmail || '',
          contact: data.customerPhone || '',
        },
        theme: {
          color: '#3b82f6',
        },
        method: {
          upi: true,
          card: true,
          netbanking: true,
          wallet: true,
        },
        handler: async (response: any) => {
          try {
            // Verify payment
            const verifyResponse = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifiedPayment = await handleApiResponse(verifyResponse);
            
            toast({
              title: 'Payment Successful!',
              description: `Payment of ₹${(verifiedPayment.amount / 100).toFixed(2)} completed successfully.`,
            });

            reset();
            onPaymentSuccess?.(verifiedPayment);
          } catch (error) {
            console.error('Payment verification error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Payment verification failed';
            
            toast({
              title: 'Payment Verification Failed',
              description: 'Please contact support with your payment details.',
              variant: 'destructive',
            });
            onPaymentError?.(errorMessage);
          }
        },
        modal: {
          ondismiss: () => {
            setIsLoading(false);
            toast({
              title: 'Payment Cancelled',
              description: 'Payment was cancelled by user.',
              variant: 'destructive',
            });
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Payment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      setError(errorMessage);
      
      toast({
        title: 'Payment Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      onPaymentError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          UPI Payment
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-4" variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(handlePayment)} className="space-y-4">
          <div>
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="Enter amount"
              {...register('amount', { valueAsNumber: true })}
              className={errors.amount ? 'border-red-500' : ''}
            />
            {errors.amount && (
              <p className="text-sm text-red-500 mt-1">{errors.amount.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="What is this payment for?"
              {...register('description')}
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && (
              <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="customerName">Name (Optional)</Label>
            <Input
              id="customerName"
              placeholder="Your name"
              {...register('customerName')}
            />
          </div>

          <div>
            <Label htmlFor="customerEmail">Email (Optional)</Label>
            <Input
              id="customerEmail"
              type="email"
              placeholder="your@email.com"
              {...register('customerEmail')}
              className={errors.customerEmail ? 'border-red-500' : ''}
            />
            {errors.customerEmail && (
              <p className="text-sm text-red-500 mt-1">{errors.customerEmail.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="customerPhone">Phone (Optional)</Label>
            <Input
              id="customerPhone"
              placeholder="10-digit phone number"
              {...register('customerPhone')}
              className={errors.customerPhone ? 'border-red-500' : ''}
            />
            {errors.customerPhone && (
              <p className="text-sm text-red-500 mt-1">{errors.customerPhone.message}</p>
            )}
          </div>

          <Button 
            type="submit" 
            disabled={isLoading} 
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Smartphone className="mr-2 h-4 w-4" />
                Pay with UPI
              </>
            )}
          </Button>
        </form>

        <div className="mt-4 text-sm text-gray-600">
          <p>• Supports UPI, Cards, Net Banking, and Wallets</p>
          <p>• Secure payments powered by Razorpay</p>
          <p>• Your payment details are encrypted and secure</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentForm;