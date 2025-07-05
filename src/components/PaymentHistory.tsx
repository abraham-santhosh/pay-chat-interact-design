import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, CreditCard, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Payment {
  id: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  amount: number;
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

const PaymentHistory: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPayments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/payments');
      if (!response.ok) {
        throw new Error('Failed to fetch payments');
      }
      
      const data = await response.json();
      setPayments(data.sort((a: Payment, b: Payment) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch (err) {
      console.error('Error fetching payments:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch payments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const getStatusBadge = (status: Payment['status']) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            Paid
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-300">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case 'created':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-300">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAmount = (amount: number) => {
    return `₹${(amount / 100).toFixed(2)}`;
  };

  const getPaymentMethodIcon = (method?: string) => {
    switch (method) {
      case 'upi':
        return '📱';
      case 'card':
        return '💳';
      case 'netbanking':
        return '🏦';
      case 'wallet':
        return '👛';
      default:
        return '💰';
    }
  };

  const handleRefresh = () => {
    fetchPayments();
    toast({
      title: 'Refreshed',
      description: 'Payment history has been updated.',
    });
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>Loading payments...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment History
          </CardTitle>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-4" variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {payments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CreditCard className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>No payments found</p>
            <p className="text-sm">Your payment history will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => (
              <Card key={payment.id} className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg font-semibold">
                          {formatAmount(payment.amount)}
                        </span>
                        {getStatusBadge(payment.status)}
                        {payment.paymentMethod && (
                          <span className="text-sm text-gray-500 flex items-center gap-1">
                            <span>{getPaymentMethodIcon(payment.paymentMethod)}</span>
                            {payment.paymentMethod.toUpperCase()}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-700 mb-2">{payment.description}</p>
                      
                      <div className="text-xs text-gray-500 space-y-1">
                        <div>Created: {formatDate(payment.createdAt)}</div>
                        {payment.updatedAt !== payment.createdAt && (
                          <div>Updated: {formatDate(payment.updatedAt)}</div>
                        )}
                        {payment.customerName && (
                          <div>Customer: {payment.customerName}</div>
                        )}
                        {payment.customerEmail && (
                          <div>Email: {payment.customerEmail}</div>
                        )}
                        {payment.customerPhone && (
                          <div>Phone: {payment.customerPhone}</div>
                        )}
                        {payment.upiId && (
                          <div>UPI ID: {payment.upiId}</div>
                        )}
                        {payment.razorpayPaymentId && (
                          <div>Payment ID: {payment.razorpayPaymentId}</div>
                        )}
                      </div>
                      
                      {payment.failureReason && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                          <strong>Failure Reason:</strong> {payment.failureReason}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentHistory;