# Environment Variables Setup Guide

## Required Environment Variables

Create a `.env` file in the **root directory** (`Quest/.env`) with the following variables:

```env
# ==========================================
# MONGODB CONFIGURATION
# ==========================================
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority&appName=<appname>

# ==========================================
# JWT AUTHENTICATION
# ==========================================
JWT_SECRET=your_jwt_secret_key_here_use_strong_random_string
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your_refresh_token_secret_key_different_from_jwt_secret
JWT_REFRESH_EXPIRE=30d

# ==========================================
# SERVER CONFIGURATION
# ==========================================
PORT=5001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# ==========================================
# EMAIL SERVICE (Gmail SMTP)
# ==========================================
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_FROM="BroadbandX <your_email@gmail.com>"

# How to get Gmail App Password:
# 1. Go to your Google Account (myaccount.google.com)
# 2. Navigate to Security → 2-Step Verification (enable if not enabled)
# 3. Go to App Passwords
# 4. Generate a new app password for "Mail"
# 5. Copy the 16-character password (without spaces)

# ==========================================
# RAZORPAY PAYMENT GATEWAY (Required for Payment Integration)
# ==========================================
RAZORPAY_KEY_ID=rzp_test_your_key_id_here
RAZORPAY_KEY_SECRET=your_razorpay_key_secret_here
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here

# How to get Razorpay credentials:
# 1. Sign up at https://razorpay.com
# 2. Go to Dashboard → Settings → API Keys
# 3. Generate Test/Live keys
# 4. For webhook secret:
#    - Go to Settings → Webhooks
#    - Create webhook: https://your-domain.com/api/razorpay/webhook
#    - Select events: payment.captured, payment.failed, refund.created
#    - Copy webhook secret

# ==========================================
# ADMIN DEFAULT CREDENTIALS (First-time setup)
# ==========================================
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123

# ==========================================
# OPTIONAL FEATURES
# ==========================================
# File Upload (if using file uploads)
MAX_FILE_SIZE=5000000

# Session
SESSION_SECRET=your_session_secret_key_for_express_session

# Logging
LOG_LEVEL=info
```

---

## Example Configuration

Here's a complete example with sample values (DO NOT use these in production):

```env
# MongoDB Atlas
MONGO_URI=mongodb+srv://broadbandx:myPassword123@cluster0.abc123.mongodb.net/broadbandx?retryWrites=true&w=majority&appName=Cluster0

# JWT
JWT_SECRET=d8f7a9b2c4e6f8a0b2c4d6e8f0a2b4c6d8e0f2a4b6c8d0e2f4a6b8c0d2e4f6a8
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2
JWT_REFRESH_EXPIRE=30d

# Server
PORT=5001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Email (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=broadbandx.notify@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop
EMAIL_FROM="BroadbandX <broadbandx.notify@gmail.com>"

# Razorpay (Test Mode)
RAZORPAY_KEY_ID=rzp_test_1234567890abcd
RAZORPAY_KEY_SECRET=abcdefghijklmnopqrstuvwxyz123456
RAZORPAY_WEBHOOK_SECRET=webhook_secret_abcd1234

# Admin
ADMIN_EMAIL=admin@broadbandx.com
ADMIN_PASSWORD=BroadbandAdmin@2025

# Optional
MAX_FILE_SIZE=5000000
SESSION_SECRET=my_session_secret_key_123456789
LOG_LEVEL=info
```

---

## Environment Variable Descriptions

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `MONGO_URI` | ✅ | MongoDB Atlas connection string | mongodb+srv://user:pass@cluster.mongodb.net/db |
| `JWT_SECRET` | ✅ | Secret key for JWT tokens | 64-character random string |
| `JWT_EXPIRE` | ✅ | JWT expiration time | 7d, 24h, 30m |
| `JWT_REFRESH_SECRET` | ✅ | Refresh token secret | Different from JWT_SECRET |
| `JWT_REFRESH_EXPIRE` | ✅ | Refresh token expiry | 30d |
| `PORT` | ✅ | Backend server port | 5001 |
| `NODE_ENV` | ✅ | Environment | development, production |
| `FRONTEND_URL` | ✅ | Frontend URL for CORS | http://localhost:3000 |
| `EMAIL_HOST` | ✅ | SMTP server | smtp.gmail.com |
| `EMAIL_PORT` | ✅ | SMTP port | 587, 465 |
| `EMAIL_USER` | ✅ | Email account | your_email@gmail.com |
| `EMAIL_PASS` | ✅ | Email app password | Gmail app password |
| `EMAIL_FROM` | ✅ | From address | "Company <email>" |
| `RAZORPAY_KEY_ID` | ✅ | Razorpay API key | rzp_test_xxx |
| `RAZORPAY_KEY_SECRET` | ✅ | Razorpay secret | Secret key from dashboard |
| `RAZORPAY_WEBHOOK_SECRET` | ✅ | Webhook verification | From webhook settings |
| `ADMIN_EMAIL` | ⚠️ | Default admin email | admin@example.com |
| `ADMIN_PASSWORD` | ⚠️ | Default admin password | Strong password |

---

## Security Best Practices

### 1. JWT Secrets
```bash
# Generate strong random secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2. Gmail App Password
- **Never use your actual Gmail password**
- Always create an app-specific password
- Enable 2-Factor Authentication first
- Revoke and regenerate if compromised

### 3. Razorpay Keys
- Use **Test keys** for development (prefix: `rzp_test_`)
- Use **Live keys** for production (prefix: `rzp_live_`)
- Never commit keys to Git
- Rotate keys periodically

### 4. MongoDB URI
- Use strong passwords (no special characters that need encoding)
- Whitelist specific IPs (not 0.0.0.0/0)
- Use database-specific users (not admin)
- Enable authentication

### 5. .gitignore
Ensure `.env` is in `.gitignore`:
```
.env
.env.local
.env.production
```

---

## Production Configuration

For production deployment, update these variables:

```env
NODE_ENV=production
FRONTEND_URL=https://your-domain.com
RAZORPAY_KEY_ID=rzp_live_your_live_key
RAZORPAY_KEY_SECRET=your_live_secret
```

### Additional Production Variables
```env
# SSL/TLS
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Session
SESSION_SECRET=production_session_secret_very_long_and_random

# Monitoring
SENTRY_DSN=your_sentry_dsn_for_error_tracking
```

---

## Troubleshooting

### MongoDB Connection Issues
```bash
# Test connection string
mongosh "mongodb+srv://username:password@cluster.mongodb.net/database"

# Common issues:
# 1. Wrong password (URL encode special characters)
# 2. IP not whitelisted (check Atlas Network Access)
# 3. Incorrect database name
# 4. Connection timeout (check firewall)
```

### Email Not Sending
```bash
# Test Gmail credentials
curl --url 'smtps://smtp.gmail.com:465' --ssl-reqd \
  --mail-from 'your_email@gmail.com' --mail-rcpt 'test@example.com' \
  --user 'your_email@gmail.com:app_password' \
  --upload-file -

# Common issues:
# 1. App password not generated
# 2. 2FA not enabled
# 3. "Less secure apps" blocking (use app password instead)
# 4. Account suspended or locked
```

### Razorpay Integration Issues
```bash
# Verify API keys
curl -u rzp_test_key_id:key_secret https://api.razorpay.com/v1/payments

# Common issues:
# 1. Using test keys in production
# 2. Webhook URL not accessible (use ngrok for local testing)
# 3. Signature verification failing (check webhook secret)
# 4. CORS errors (check FRONTEND_URL)
```

---

## Testing Configuration

### Test ENV Setup
Create `.env.test` for testing:
```env
NODE_ENV=test
MONGO_URI=mongodb+srv://test:pass@test-cluster.mongodb.net/broadbandx-test
PORT=5002
JWT_SECRET=test_jwt_secret
```

### Local Development with ngrok (for Razorpay webhooks)
```bash
# Install ngrok
npm install -g ngrok

# Expose local server
ngrok http 5001

# Update webhook URL in Razorpay dashboard
https://your-ngrok-url.ngrok.io/api/razorpay/webhook
```

---

## Verification Checklist

Before starting the application:

- [ ] `.env` file created in root directory
- [ ] MongoDB URI tested and working
- [ ] JWT secrets generated (64+ characters)
- [ ] Gmail app password created
- [ ] Razorpay account created
- [ ] Test API keys obtained
- [ ] Webhook URL configured
- [ ] All required variables set
- [ ] `.env` added to `.gitignore`
- [ ] Admin credentials set

Run verification:
```bash
cd server
node -e "require('dotenv').config({path:'../.env'}); console.log('MongoDB:', !!process.env.MONGO_URI, '\nJWT:', !!process.env.JWT_SECRET, '\nRazorpay:', !!process.env.RAZORPAY_KEY_ID);"
```

Expected output:
```
MongoDB: true
JWT: true
Razorpay: true
```

---

## Quick Start Commands

```bash
# 1. Create .env file
cp .env.example .env  # If you have example file
# OR
nano .env  # Edit manually

# 2. Install dependencies
cd server
npm install

cd ../client
npm install

# 3. Start development servers
cd ../server
npm run dev  # Port 5001

# In another terminal
cd client
npm start  # Port 3000

# 4. Verify services
# Backend: http://localhost:5001/api/health
# Frontend: http://localhost:3000
```

---

**Last Updated**: January 2025
**Configuration Status**: Production Ready ✅
