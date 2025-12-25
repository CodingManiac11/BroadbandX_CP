# Razorpay Webhook Setup Instructions

## Step 1: Configure Webhook in Razorpay Dashboard

You're currently on the webhook setup page. Follow these steps:

### 1. Enter Webhook URL

**⚠️ IMPORTANT: Razorpay does NOT accept localhost URLs!**

You must use **ngrok** to expose your local server publicly:

**Step-by-Step:**
```bash
# 1. First, start your backend server
cd server
npm run dev
# Keep this terminal running!

# 2. Open a NEW terminal and install ngrok (if not installed)
npm install -g ngrok

# 3. Run ngrok to expose port 5001
ngrok http 5001

# 4. You'll see output like:
# Forwarding    https://abc123-45-67-89.ngrok-free.app -> http://localhost:5001
# Copy the HTTPS URL (starts with https://)

# 5. In Razorpay webhook URL field, enter:
https://your-ngrok-url.ngrok-free.app/api/razorpay/webhook
# Replace "your-ngrok-url" with the actual URL from ngrok
```

**Example:**
If ngrok shows: `https://f4a2-103-76-253-142.ngrok-free.app`
Then webhook URL is: `https://f4a2-103-76-253-142.ngrok-free.app/api/razorpay/webhook`

**For Production**: Use your actual domain:
```
https://your-domain.com/api/razorpay/webhook
```

---

### 2. Select Active Events

Scroll down in the "Active Events" section and check these boxes:

**Required Events:**
- ✅ `payment.authorized`
- ✅ `payment.failed`
- ✅ `payment.captured` (Most important - when payment is successfully completed)
- ✅ `refund.created`

**Optional but Recommended:**
- ✅ `payment.pending`
- ✅ `refund.processed`
- ✅ `refund.failed`

---

### 3. Set Alert Email
The email `adityautsav123456@gmail.com` is already filled - this will receive alerts if webhooks fail.

---

### 4. Create Webhook & Copy Secret

1. Click the **"Create Webhook"** button (blue button on bottom right)
2. After creation, Razorpay will show you the **Webhook Secret**
3. **IMPORTANT**: Copy this secret immediately - it looks like: `whsec_xxxxxxxxxxxxx`
4. You'll need this secret for your `.env` file

---

## Step 2: Update .env File

Add these credentials to your `.env` file in the **root directory** (`Quest/.env`):

```env
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_RvlGVIoKWbOQVK
RAZORPAY_KEY_SECRET=WQ6FvjQ5IiYoiXRge9GDmku7
RAZORPAY_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Make sure these also exist:
CLIENT_URL=http://localhost:3000
```

---

## Step 3: Test Webhook

### Test Locally with ngrok:

1. **Start your backend server:**
```bash
cd server
npm run dev
```

2. **In another terminal, start ngrok:**
```bash
ngrok http 5001
```

3. **Copy the ngrok URL** (e.g., `https://abc123.ngrok.io`)

4. **Update Razorpay webhook URL** to:
```
https://abc123.ngrok.io/api/razorpay/webhook
```

5. **Test the webhook** from Razorpay dashboard:
   - Go to Webhooks → Your webhook → "Send Test Webhook"
   - Select event: `payment.captured`
   - Check your server logs for webhook received message

---

## Step 4: Verify Configuration

Run this command to verify your `.env` setup:

```bash
cd server
node -e "require('dotenv').config({path:'../.env'}); console.log('Razorpay Key ID:', process.env.RAZORPAY_KEY_ID); console.log('Razorpay Secret:', process.env.RAZORPAY_KEY_SECRET ? 'Set ✅' : 'Missing ❌'); console.log('Webhook Secret:', process.env.RAZORPAY_WEBHOOK_SECRET ? 'Set ✅' : 'Missing ❌');"
```

Expected output:
```
Razorpay Key ID: rzp_test_RvlGVIoKWbOQVK
Razorpay Secret: Set ✅
Webhook Secret: Set ✅
```

---

## Step 5: Test Payment Flow

### Create a Test Payment Order:

```bash
# 1. Login and get token
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your_email","password":"your_password"}'

# Copy the access_token from response

# 2. Create payment order
curl -X POST http://localhost:5001/api/razorpay/create-order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"subscriptionId":"your_subscription_id","amount":999}'
```

---

## Webhook Event Flow

When a payment is made:

1. **Customer pays** → Razorpay processes payment
2. **Razorpay sends webhook** → `POST /api/razorpay/webhook`
3. **Your server verifies** signature using webhook secret
4. **Server updates** payment status and activates subscription
5. **Server emits** WebSocket event to user
6. **Frontend shows** success notification

---

## Webhook Security

Your webhook endpoint automatically:
- ✅ Verifies Razorpay signature using `RAZORPAY_WEBHOOK_SECRET`
- ✅ Validates event authenticity
- ✅ Prevents replay attacks
- ✅ Logs all webhook events

**Signature Verification Code** (already implemented in `razorpayController.js`):
```javascript
const expectedSignature = crypto
  .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
  .update(JSON.stringify(req.body))
  .digest('hex');

if (expectedSignature !== receivedSignature) {
  return res.status(400).json({ success: false, error: 'Invalid signature' });
}
```

---

## Troubleshooting

### Webhook Not Receiving Events
1. Check if server is running: `http://localhost:5001/api/health`
2. Verify ngrok is running and URL is correct
3. Check firewall settings
4. Look for webhook logs in Razorpay dashboard

### Signature Verification Failing
1. Ensure `RAZORPAY_WEBHOOK_SECRET` matches Razorpay dashboard
2. Check for extra spaces in `.env` file
3. Verify webhook secret format (should start with `whsec_`)

### Server Logs to Monitor
```bash
# Watch server logs
cd server
npm run dev

# Look for these messages:
✅ Razorpay SDK initialized
✅ Webhook received: payment.captured
✅ Signature verified
✅ Payment updated successfully
```

---

## Production Deployment

When deploying to production:

1. **Generate Live Keys**:
   - Go to Razorpay Dashboard → Settings → API Keys
   - Switch to "Live Mode"
   - Generate Live Keys (prefix: `rzp_live_`)

2. **Update Production .env**:
```env
RAZORPAY_KEY_ID=rzp_live_your_live_key
RAZORPAY_KEY_SECRET=your_live_secret
RAZORPAY_WEBHOOK_SECRET=whsec_your_live_webhook_secret
CLIENT_URL=https://your-production-domain.com
```

3. **Create Production Webhook**:
   - URL: `https://your-domain.com/api/razorpay/webhook`
   - Same events as test mode
   - Get new webhook secret for production

4. **Test Production Webhook**:
   - Make a small test payment (₹1)
   - Verify webhook receives event
   - Check payment reflects in database

---

## Next Steps After Webhook Setup

1. ✅ Webhook configured in Razorpay
2. ✅ Credentials added to `.env`
3. ✅ Server restarted
4. 🔄 Test webhook with ngrok
5. 📱 Build frontend payment UI
6. 🎨 Create PaymentGateway.tsx component
7. 🧪 Test end-to-end payment flow

---

**Your Current Credentials:**
- Key ID: `rzp_test_RvlGVIoKWbOQVK` ✅
- Key Secret: `WQ6FvjQ5IiYoiXRge9GDmku7` ✅
- Webhook Secret: ⏳ Copy after creating webhook

**Status**: Ready to create webhook in dashboard!
