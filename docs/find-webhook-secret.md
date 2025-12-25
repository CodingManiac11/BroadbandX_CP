# Finding Your Razorpay Webhook Secret

## If the Secret is Empty After Creating Webhook:

### Option 1: Check the Webhook Details
1. Go to **Settings** → **Webhooks** in Razorpay Dashboard
2. Click on your newly created webhook
3. Look for **"Secret"** or **"Signing Secret"** field
4. Click **"Show Secret"** or the eye icon
5. Copy the secret (starts with `whsec_`)

### Option 2: Regenerate the Secret
If you can't find it:
1. Go to your webhook in the dashboard
2. Click **"Edit"** or **"Regenerate Secret"**
3. Confirm regeneration
4. Copy the new secret immediately
5. Save it to your `.env` file

### Option 3: Delete and Recreate
1. Delete the current webhook
2. Create a new webhook with URL: `https://loth-paula-hydropic.ngrok-free.dev/api/razorpay/webhook`
3. After clicking "Create Webhook", a popup or message should show the secret
4. **Copy it immediately** - it's only shown once!

## What the Secret Looks Like:
```
whsec_1234567890abcdefghijklmnopqrstuvwxyz
```

## Once You Have It:

Add to your `.env` file:
```env
RAZORPAY_WEBHOOK_SECRET=whsec_your_actual_secret_here
```

Then restart your server:
```bash
cd server
node server.js
```

---

**Important**: The webhook secret is shown only **once** when you create the webhook. If you missed it, you'll need to regenerate or recreate the webhook.

**Current Status**:
- ✅ ngrok running: `https://loth-paula-hydropic.ngrok-free.dev`
- ✅ Razorpay keys configured
- ⏳ Waiting for webhook secret
