# Email Notification Setup Guide

## Overview
The application includes a complete email notification system that sends emails for:
- Welcome emails on registration
- Password reset requests
- Payment reminders
- Usage alerts
- Service updates
- Support ticket updates

## Current Status
✅ Email service fully implemented (`server/services/emailService.js`)  
✅ Email templates created (6 templates)  
✅ Integration points added in controllers  
❌ **Email credentials not configured** (using placeholders)

## Quick Setup

### Option 1: Gmail (Recommended for testing)

1. **Enable 2-Step Verification** on your Gmail account
   - Go to Google Account → Security
   - Enable 2-Step Verification

2. **Generate App Password**
   - Go to Google Account → Security → 2-Step Verification
   - Scroll to "App passwords"
   - Select "Mail" and your device
   - Copy the 16-character password

3. **Update `.env` file:**
   ```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-gmail@gmail.com
   EMAIL_PASS=your-16-char-app-password
   EMAIL_FROM="BroadbandX" <noreply@broadbandx.com>
   ```

### Option 2: SendGrid (Recommended for production)

1. Sign up at https://sendgrid.com
2. Create an API key
3. Update `.env`:
   ```env
   EMAIL_HOST=smtp.sendgrid.net
   EMAIL_PORT=587
   EMAIL_USER=apikey
   EMAIL_PASS=your-sendgrid-api-key
   EMAIL_FROM="BroadbandX" <noreply@broadbandx.com>
   ```

### Option 3: Mailgun

1. Sign up at https://www.mailgun.com
2. Get SMTP credentials
3. Update `.env`:
   ```env
   EMAIL_HOST=smtp.mailgun.org
   EMAIL_PORT=587
   EMAIL_USER=your-mailgun-username
   EMAIL_PASS=your-mailgun-password
   EMAIL_FROM="BroadbandX" <noreply@broadbandx.com>
   ```

## Testing Email Service

### 1. Test Registration (Welcome Email)
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "password": "password123",
    "phone": "1234567890"
  }'
```

### 2. Test Password Reset
```bash
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### 3. Check Server Logs
Look for email sending confirmation:
```
Email sent: <message-id>
```

Or errors:
```
Failed to send welcome email: <error>
```

## Email Templates Available

1. **WELCOME** - Sent on user registration
2. **PASSWORD_RESET** - Sent when user requests password reset
3. **PAYMENT_REMINDER** - Sent before payment due date
4. **SERVICE_UPDATE** - Sent for service announcements
5. **USAGE_ALERT** - Sent when usage reaches 80%
6. **SUPPORT_TICKET** - Sent for ticket updates
7. **FEEDBACK_REQUEST** - Sent to request customer feedback
8. **FEEDBACK_RESPONSE** - Sent when responding to feedback

## Troubleshooting

### Email not sending
1. Check `.env` credentials are correct
2. Verify EMAIL_USER and EMAIL_PASS are not placeholders
3. Check server logs for errors
4. Ensure firewall allows port 587 outbound
5. For Gmail, verify app password is correct (not regular password)

### "Invalid login" error with Gmail
- You must use App Password, not your regular Gmail password
- Ensure 2-Step Verification is enabled

### Emails going to spam
- Configure SPF records for your domain
- Add DKIM signing (provided by SendGrid/Mailgun)
- Verify sender domain

## Production Recommendations

1. **Use Professional Email Service**
   - SendGrid, Mailgun, or AWS SES
   - Better deliverability than Gmail
   - Email tracking and analytics

2. **Custom Domain**
   - Use your own domain for sender address
   - Configure DNS records (SPF, DKIM, DMARC)

3. **Email Queue**
   - Consider using Bull or Bee-Queue
   - Retry failed emails
   - Rate limiting

4. **Monitoring**
   - Log all email attempts
   - Track bounce rates
   - Monitor delivery rates

## Next Steps

1. Choose email provider (Gmail for dev, SendGrid/Mailgun for prod)
2. Get credentials
3. Update `.env` file
4. Restart server: `npm run server`
5. Test with registration/password reset
6. Monitor server logs

## Support

If you encounter issues:
1. Check server logs: `npm run server`
2. Verify `.env` configuration
3. Test SMTP connection manually
4. Review email service documentation
