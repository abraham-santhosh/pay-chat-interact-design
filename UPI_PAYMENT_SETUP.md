# UPI Payment System Setup Guide

This guide will help you set up the UPI payment system using Razorpay in your React application.

## Overview

The UPI payment system includes:
- **Backend**: Express.js server with Razorpay integration
- **Frontend**: React components for payment form and history
- **Payment Methods**: UPI, Cards, Net Banking, and Wallets
- **Security**: Payment verification and webhook handling

## Prerequisites

1. Node.js (v14 or higher)
2. Razorpay account
3. Valid Indian bank account (for live payments)

## Razorpay Setup

### 1. Create Razorpay Account
1. Go to [Razorpay.com](https://razorpay.com/)
2. Sign up for a free account
3. Complete KYC verification (for live payments)

### 2. Get API Keys
1. Login to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Go to **Settings** → **API Keys**
3. Generate **Test** keys for development
4. Generate **Live** keys for production (after KYC approval)

### 3. Configure Environment Variables
Create a `.env` file in your project root:

```env
# Test mode (for development)
RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID_HERE
RAZORPAY_KEY_SECRET=YOUR_KEY_SECRET_HERE

# Live mode (for production)
# RAZORPAY_KEY_ID=rzp_live_YOUR_KEY_ID_HERE
# RAZORPAY_KEY_SECRET=YOUR_KEY_SECRET_HERE

PORT=4000
```

**Important**: Never commit your `.env` file to version control!

## Installation

1. Install dependencies:
```bash
npm install razorpay
```

2. Start the development server:
```bash
# Start backend server
npm run server

# Start frontend (in another terminal)
npm run dev
```

## Usage

### Making a Payment

1. Navigate to `/payments` in your application
2. Fill in the payment form:
   - Amount (in rupees)
   - Description
   - Optional: Name, email, phone
3. Click "Pay with UPI"
4. Choose your preferred payment method:
   - **UPI**: Enter UPI ID or scan QR code
   - **Cards**: Enter card details
   - **Net Banking**: Select your bank
   - **Wallets**: Choose wallet provider
5. Complete the payment

### Payment Flow

1. **Order Creation**: Frontend creates payment order via backend
2. **Razorpay Checkout**: User selects payment method and pays
3. **Payment Verification**: Backend verifies payment signature
4. **Status Update**: Payment status is updated in database
5. **Webhook**: Real-time status updates via webhooks

### API Endpoints

- `POST /api/payments/create` - Create payment order
- `POST /api/payments/verify` - Verify payment
- `GET /api/payments/:id` - Get payment status
- `GET /api/payments` - Get all payments
- `POST /api/payments/webhook` - Handle webhooks
- `GET /api/payments/config` - Get public configuration

## Testing

### Test Cards
Use these test cards for testing:

**Successful Payment:**
- Card Number: `4111 1111 1111 1111`
- Expiry: Any future date
- CVV: Any 3 digits

**Failed Payment:**
- Card Number: `4000 0000 0000 0002`
- Expiry: Any future date
- CVV: Any 3 digits

### Test UPI IDs
- `success@razorpay` - Successful payment
- `failure@razorpay` - Failed payment

## Webhook Configuration

### 1. Setup Webhook URL
1. Go to Razorpay Dashboard → **Settings** → **Webhooks**
2. Add webhook URL: `https://yourdomain.com/api/payments/webhook`
3. Select events: `payment.captured`, `payment.failed`
4. Set webhook secret (optional but recommended)

### 2. Handle Webhooks in Code
The webhook handler automatically updates payment status when:
- Payment is successful (`payment.captured`)
- Payment fails (`payment.failed`)

## Security Features

1. **Payment Signature Verification**: All payments are verified using HMAC-SHA256
2. **Webhook Signature Verification**: Webhooks are verified to ensure authenticity
3. **HTTPS Only**: All payment communications use HTTPS
4. **No Storage of Sensitive Data**: Card details are never stored on your server

## Production Deployment

### 1. Environment Setup
- Use live Razorpay keys
- Enable HTTPS
- Set proper CORS origins
- Use environment variables for all secrets

### 2. Legal Compliance
- Add Terms of Service
- Add Privacy Policy
- Add Refund Policy
- Comply with PCI DSS requirements

### 3. Error Handling
- Implement proper error logging
- Add retry mechanisms
- Handle network failures gracefully

## Features

### Payment Form
- Amount validation
- Email and phone validation
- Real-time error handling
- Loading states

### Payment History
- View all payments
- Filter by status
- Export functionality (can be added)
- Real-time updates

### Status Management
- Created: Payment order created
- Paid: Payment successful
- Failed: Payment failed
- Cancelled: Payment cancelled by user

## Troubleshooting

### Common Issues

**1. "Payment service not configured"**
- Check if `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are set
- Verify environment variables are loaded correctly

**2. "Invalid payment signature"**
- Check if webhook secret is correct
- Verify payload is not modified

**3. "Payment verification failed"**
- Check if payment was made with correct order ID
- Verify signature calculation is correct

**4. Webhook not receiving events**
- Check webhook URL is accessible
- Verify webhook URL is HTTPS in production
- Check Razorpay dashboard for webhook logs

### Debug Mode
Add this to your `.env` for debug logging:
```env
DEBUG=razorpay:*
```

## Support

- **Razorpay Documentation**: https://razorpay.com/docs/
- **Razorpay Support**: https://razorpay.com/support/
- **Test Environment**: https://dashboard.razorpay.com/app/payments

## Next Steps

1. **Add Refund System**: Implement refund functionality
2. **Add Recurring Payments**: Set up subscription payments
3. **Add Payment Analytics**: Track payment success rates
4. **Add Multi-currency**: Support international payments
5. **Add Split Payments**: Split payments between multiple accounts

---

**Note**: This implementation is production-ready but always test thoroughly in your specific environment before going live.