import React, { useState } from 'react';
import PaymentForm from '@/components/PaymentForm';
import PaymentHistory from '@/components/PaymentHistory';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, History, CheckCircle } from 'lucide-react';

const Payments: React.FC = () => {
  const [activeTab, setActiveTab] = useState('payment');
  const [lastPayment, setLastPayment] = useState<any>(null);

  const handlePaymentSuccess = (payment: any) => {
    setLastPayment(payment);
    // Switch to history tab to show the completed payment
    setActiveTab('history');
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    // Error handling is already done in PaymentForm component
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            UPI Payment System
          </h1>
          <p className="text-gray-600">
            Secure and fast payments using UPI, cards, net banking, and wallets
          </p>
        </div>

        {lastPayment && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                <span className="font-semibold">Payment Successful!</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                Payment of ₹{(lastPayment.amount / 100).toFixed(2)} for "{lastPayment.description}" completed successfully.
              </p>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="payment" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Make Payment
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Payment History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payment" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <PaymentForm
                  onPaymentSuccess={handlePaymentSuccess}
                  onPaymentError={handlePaymentError}
                />
              </div>
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">How it Works</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                        1
                      </div>
                      <div>
                        <h3 className="font-semibold">Enter Payment Details</h3>
                        <p className="text-sm text-gray-600">
                          Fill in the amount, description, and your details
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                        2
                      </div>
                      <div>
                        <h3 className="font-semibold">Choose Payment Method</h3>
                        <p className="text-sm text-gray-600">
                          Select from UPI, cards, net banking, or wallet
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                        3
                      </div>
                      <div>
                        <h3 className="font-semibold">Complete Payment</h3>
                        <p className="text-sm text-gray-600">
                          Follow the prompts to complete your secure payment
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-lg">Supported Payment Methods</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">📱</span>
                        <span className="text-sm font-medium">UPI</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">💳</span>
                        <span className="text-sm font-medium">Cards</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🏦</span>
                        <span className="text-sm font-medium">Net Banking</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">👛</span>
                        <span className="text-sm font-medium">Wallets</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <PaymentHistory />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Payments;