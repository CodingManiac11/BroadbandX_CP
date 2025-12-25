# Quest ISP Management System - New Features Implementation

## Overview
This document outlines the three major features implemented:
1. **Payment Gateway Integration (Razorpay)**
2. **Usage Tracking System**
3. **Billing Reminder System**

---

## 1. Payment Gateway Integration (Razorpay)

### Backend Implementation

#### Model: `server/models/Payment.js`
- Tracks all Razorpay transactions
- Fields: razorpayOrderId, razorpayPaymentId, razorpaySignature
- Status tracking: created, pending, authorized, captured, failed, refunded
- Payment methods: card, netbanking, UPI, wallet, EMI
- Refund support with partial/full refund tracking

#### Controller: `server/controllers/razorpayController.js`
- **createOrder**: Creates Razorpay order and Payment record
- **verifyPayment**: Verifies payment signature using HMAC-SHA256
- **getPaymentHistory**: Paginated payment history for users
- **getPayment**: Single payment details with authorization
- **handleWebhook**: Processes Razorpay webhooks (payment.captured, payment.failed, refund.created)

#### Routes: `server/routes/razorpay.js`
- `POST /api/razorpay/webhook` - Public webhook endpoint
- `POST /api/razorpay/create-order` - Create payment order (authenticated)
- `POST /api/razorpay/verify` - Verify payment (authenticated)
- `GET /api/razorpay/history` - Payment history (authenticated)
- `GET /api/razorpay/:id` - Get payment details (authenticated)

### Configuration Required

#### Environment Variables (Add to root `.env` file):
```env
# Razorpay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

#### Get Razorpay Credentials:
1. Sign up at https://razorpay.com
2. Go to Settings → API Keys
3. Generate API keys (Key ID and Key Secret)
4. Go to Settings → Webhooks
5. Create webhook: `https://your-domain.com/api/razorpay/webhook`
6. Select events: payment.captured, payment.failed, refund.created
7. Copy webhook secret

### Features
- ✅ Order creation with amount validation
- ✅ Payment signature verification
- ✅ Subscription activation on successful payment
- ✅ Refund tracking
- ✅ Real-time payment status updates via WebSocket
- ✅ Webhook handling for payment events
- ✅ Payment history with pagination

---

## 2. Usage Tracking System

### Backend Implementation

#### Model: `server/models/UsageTracking.js`
- Tracks data usage per billing period
- Fields: dataUsed, uploadData, downloadData, averageSpeed, peakSpeed
- Daily usage breakdown with sessions and speed metrics
- FUP (Fair Usage Policy) tracking
- Automatic alert triggering at 80%, 90%, 100% thresholds
- Virtual field for usage percentage calculation

#### Controller: `server/controllers/usageTrackingController.js`
- **recordUsage**: Record usage data with automatic alerts
- **getCurrentUsage**: Get current period usage with percentage
- **getUsageHistory**: Historical usage data (default 6 months)
- **getUsageStats**: Aggregate statistics (week/month/year)
- **getDailyUsage**: Daily breakdown for charts
- **getAllUsage** (Admin): View all users' usage
- **resetUsage** (Admin): Reset user usage for testing

#### Routes: `server/routes/usageTracking.js`
- `POST /api/usage-tracking/record` - Record usage data
- `GET /api/usage-tracking/current` - Current period usage
- `GET /api/usage-tracking/history` - Usage history
- `GET /api/usage-tracking/stats` - Usage statistics
- `GET /api/usage-tracking/daily` - Daily breakdown
- `GET /api/usage-tracking/admin/all` - All users usage (admin)
- `PUT /api/usage-tracking/admin/reset/:userId` - Reset usage (admin)

### Email Notifications
Enhanced `emailService.js` with:
- **sendUsageAlertEmail**: Sends usage alerts at thresholds
- Color-coded urgency levels (MEDIUM, HIGH, CRITICAL)
- Emoji indicators (⏰, ⚠️, 🚨)
- Usage statistics display
- Link to usage dashboard

### Features
- ✅ Automatic usage tracking per session
- ✅ Real-time usage percentage calculation
- ✅ Daily/weekly/monthly usage statistics
- ✅ Speed metrics (average and peak)
- ✅ FUP limit detection and tracking
- ✅ Automatic email alerts at 80%, 90%, 100%
- ✅ Real-time WebSocket notifications
- ✅ Admin dashboard for monitoring
- ✅ Usage history for trend analysis

---

## 3. Billing Reminder System

### Backend Implementation

#### Model: `server/models/BillingReminder.js`
- Reminder types: renewal, overdue, expiring_soon, payment_failed
- Status tracking: pending, sent, acknowledged, resolved, cancelled
- Reminder levels: 1 (7 days), 2 (3 days), 3 (1 day), 4 (due date), 5 (overdue)
- Delivery tracking: email, SMS, push, in-app
- User response tracking: acknowledgedAt, resolvedAt
- Metadata: email delivery status, open/click tracking, retry count

#### Controller: `server/controllers/billingReminderController.js`
- **createReminder**: Create manual reminder (admin)
- **getMyReminders**: User's reminders with filtering
- **getAllReminders** (Admin): All reminders with pagination
- **getPendingReminders** (Admin): Reminders ready to send
- **sendReminder**: Send individual reminder
- **acknowledgeReminder**: User acknowledges reminder
- **resolveReminder** (Admin): Mark reminder as resolved
- **processPendingReminders**: Process all pending reminders
- **createRemindersForExpiringSubscriptions** (Admin): Auto-create reminders

#### Routes: `server/routes/billingReminders.js`
- `GET /api/billing-reminders/my-reminders` - User's reminders
- `PUT /api/billing-reminders/:id/acknowledge` - Acknowledge reminder
- `POST /api/billing-reminders` - Create reminder (admin)
- `GET /api/billing-reminders/admin/all` - All reminders (admin)
- `POST /api/billing-reminders/:id/send` - Send reminder (admin)
- `POST /api/billing-reminders/admin/process` - Process pending (admin)
- `POST /api/billing-reminders/admin/create-for-expiring` - Auto-create reminders (admin)

#### Scheduler: `server/services/ReminderSchedulerService.js`
- **Hourly Job**: Process pending reminders every hour
- **Daily 9 AM**: Create reminders for expiring subscriptions
- **Daily 10 AM**: Check for overdue payments
- Automatic retry on failure with error logging

### Email Notifications
Enhanced `emailService.js` with:
- **sendBillingReminder**: Sends reminders based on type
- Template variations for different reminder types
- Color-coded urgency (blue → yellow → red)
- Emoji indicators for visual impact
- Direct payment links
- Formatted Indian currency (₹)

### Reminder Types
1. **Expiring Soon**: 7/3/1 days before expiry
2. **Overdue**: After due date
3. **Renewal**: Subscription renewal time
4. **Payment Failed**: Failed payment notification

### Features
- ✅ Automated reminder scheduling
- ✅ Multi-level reminder system (7, 3, 1 days, due date, overdue)
- ✅ Email notifications with templates
- ✅ Real-time WebSocket notifications
- ✅ User acknowledgment tracking
- ✅ Delivery status monitoring
- ✅ Automatic retry on failure
- ✅ Admin dashboard for management
- ✅ Cron jobs for automation

---

## Installation & Setup

### 1. Install Dependencies
```bash
cd server
npm install razorpay node-cron
```

### 2. Environment Configuration
Add to root `.env` file:
```env
# Razorpay
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Email (already configured but verify)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Frontend URL (for email links)
CLIENT_URL=http://localhost:3000
```

### 3. Razorpay Setup
1. Sign up at https://razorpay.com
2. Get API credentials from Dashboard → Settings → API Keys
3. Create webhook endpoint: `POST /api/razorpay/webhook`
4. Subscribe to events: payment.captured, payment.failed, refund.created

### 4. Server Already Configured
✅ Routes registered in `server.js`
✅ Scheduler initialized automatically
✅ WebSocket events configured

---

## API Endpoints Summary

### Payment Gateway
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/razorpay/create-order | Create payment order | Yes |
| POST | /api/razorpay/verify | Verify payment | Yes |
| GET | /api/razorpay/history | Payment history | Yes |
| GET | /api/razorpay/:id | Payment details | Yes |
| POST | /api/razorpay/webhook | Razorpay webhook | Public |

### Usage Tracking
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/usage-tracking/record | Record usage | Yes |
| GET | /api/usage-tracking/current | Current usage | Yes |
| GET | /api/usage-tracking/history | Usage history | Yes |
| GET | /api/usage-tracking/stats | Usage statistics | Yes |
| GET | /api/usage-tracking/daily | Daily breakdown | Yes |
| GET | /api/usage-tracking/admin/all | All users usage | Admin |
| PUT | /api/usage-tracking/admin/reset/:userId | Reset usage | Admin |

### Billing Reminders
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/billing-reminders/my-reminders | User's reminders | Yes |
| PUT | /api/billing-reminders/:id/acknowledge | Acknowledge reminder | Yes |
| POST | /api/billing-reminders | Create reminder | Admin |
| GET | /api/billing-reminders/admin/all | All reminders | Admin |
| POST | /api/billing-reminders/:id/send | Send reminder | Admin |
| POST | /api/billing-reminders/admin/process | Process pending | Admin |
| POST | /api/billing-reminders/admin/create-for-expiring | Auto-create | Admin |

---

## Frontend Integration (Next Steps)

### 1. Payment Gateway UI
Create `client/src/components/PaymentGateway.tsx`:
- Razorpay checkout integration
- Order creation flow
- Payment verification
- Success/failure handling

### 2. Usage Dashboard
Create `client/src/components/UsageDashboard.tsx`:
- Current usage display with progress bar
- Daily/weekly/monthly charts
- Speed metrics visualization
- Alert history

### 3. Billing Reminders UI
Create `client/src/components/BillingReminders.tsx`:
- User reminder list
- Acknowledgment button
- Payment link integration
- Reminder history

### 4. Admin Panels
- Payment management dashboard
- Usage monitoring panel
- Reminder management interface

---

## Testing

### Test Payment Flow
```bash
# Create order
POST /api/razorpay/create-order
{
  "subscriptionId": "subscription_id",
  "amount": 999
}

# Verify payment
POST /api/razorpay/verify
{
  "razorpay_order_id": "order_id",
  "razorpay_payment_id": "payment_id",
  "razorpay_signature": "signature"
}
```

### Test Usage Tracking
```bash
# Record usage
POST /api/usage-tracking/record
{
  "dataUsed": 10.5,
  "uploadData": 3.2,
  "downloadData": 7.3,
  "speed": 50,
  "sessionDuration": 2.5
}

# Get current usage
GET /api/usage-tracking/current
```

### Test Billing Reminders
```bash
# Create reminder for expiring subscriptions
POST /api/billing-reminders/admin/create-for-expiring

# Process pending reminders
POST /api/billing-reminders/admin/process
```

---

## Automated Jobs

The scheduler runs automatically when the server starts:

1. **Every Hour**: Process pending reminders
2. **Daily 9 AM**: Create reminders for expiring subscriptions
3. **Daily 10 AM**: Check for overdue payments

To manually trigger:
```bash
# Process pending reminders
POST /api/billing-reminders/admin/process

# Create reminders for expiring
POST /api/billing-reminders/admin/create-for-expiring
```

---

## Real-Time Events

### WebSocket Events Emitted
- `payment:created` - New payment order created
- `payment:success` - Payment successful
- `payment:failed` - Payment failed
- `usage:alert` - Usage threshold alert
- `billing:reminder` - Billing reminder sent

### Client Subscription
```javascript
socket.on('payment:success', (data) => {
  // Handle payment success
});

socket.on('usage:alert', (data) => {
  // Show usage alert
});

socket.on('billing:reminder', (data) => {
  // Show billing reminder
});
```

---

## Database Collections

### New Collections Created
1. **payments** - Payment transactions
2. **usagetrackings** - Usage data
3. **billingreminders** - Reminder records

### Indexes Created
- Payment: user, subscription, razorpayOrderId, status, createdAt
- UsageTracking: user, subscription, periodStart, periodEnd
- BillingReminder: user, subscription, dueDate, status, scheduledFor

---

## Next Steps

1. **Configure Razorpay**
   - Get API credentials
   - Setup webhook endpoint
   - Add credentials to `.env`

2. **Frontend Development**
   - Create payment UI component
   - Build usage dashboard with charts
   - Implement billing reminders UI
   - Add admin management panels

3. **Testing**
   - Test payment flow end-to-end
   - Verify usage tracking accuracy
   - Confirm reminder delivery
   - Test webhook handling

4. **Production Deployment**
   - Configure production Razorpay account
   - Setup production webhook URL
   - Configure email service
   - Monitor scheduler jobs

---

## Support

For issues or questions:
- Check logs in terminal for error messages
- Verify environment variables are set correctly
- Ensure MongoDB connection is working
- Confirm Razorpay credentials are valid

---

**Implementation Date**: January 2025
**Status**: Backend Complete ✅ | Frontend Pending 📝
**Tech Stack**: Node.js, Express, MongoDB, Razorpay, node-cron, Socket.IO
