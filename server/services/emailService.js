const nodemailer = require('nodemailer');

// Initialize Gmail SMTP transporter (100% Free!)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // This should be Gmail App Password
  },
});

/**
 * Email Template Types
 */
const EMAIL_TEMPLATES = {
  PAYMENT_REMINDER: {
    subject: (data) => data.type === 'expiring_soon'
      ? `⚠️ Subscription Expiring Soon - BroadbandX`
      : `Payment Reminder - BroadbandX`,
    template: (data) => {
      const dueDate = data.dueDate ? new Date(data.dueDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
      const urgencyColor = data.reminderLevel >= 5 ? '#dc3545' : data.reminderLevel >= 3 ? '#fd7e14' : '#28a745';
      const urgencyLabel = data.reminderLevel >= 5 ? '🔴 URGENT' : data.reminderLevel >= 3 ? '🟡 IMPORTANT' : '🟢 REMINDER';

      return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${urgencyColor}; color: white; padding: 15px 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">${urgencyLabel} - ${data.type === 'expiring_soon' ? 'Subscription Expiring' : 'Payment Reminder'}</h2>
        </div>
        <div style="border: 1px solid #e0e0e0; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
          <p>Dear ${data.userName || data.customerName || 'Customer'},</p>
          <p>${data.type === 'expiring_soon'
          ? `Your BroadbandX subscription is expiring on <strong>${dueDate}</strong>. Please renew to avoid service interruption.`
          : `This is a reminder that your payment of <strong>₹${data.amount}</strong> for your BroadbandX subscription is due on <strong>${dueDate}</strong>.`
        }</p>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr style="background: #f8f9fa;">
              <td style="padding: 10px; border: 1px solid #e0e0e0;"><strong>Plan</strong></td>
              <td style="padding: 10px; border: 1px solid #e0e0e0;">${data.planName || 'Your Plan'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e0e0e0;"><strong>Amount</strong></td>
              <td style="padding: 10px; border: 1px solid #e0e0e0;">₹${data.amount || 0}</td>
            </tr>
            <tr style="background: #f8f9fa;">
              <td style="padding: 10px; border: 1px solid #e0e0e0;"><strong>Due Date</strong></td>
              <td style="padding: 10px; border: 1px solid #e0e0e0;">${dueDate}</td>
            </tr>
          </table>
          <p style="text-align: center; margin-top: 20px;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard" style="background: ${urgencyColor}; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold;">
              ${data.type === 'expiring_soon' ? 'Renew Now' : 'Pay Now'}
            </a>
          </p>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">Please ensure timely payment to avoid any service interruptions.</p>
        </div>
      </div>
    `;
    },
  },
  SERVICE_UPDATE: {
    subject: 'Service Update - BroadbandX',
    template: (data) => `
      <h2>Service Update</h2>
      <p>Dear ${data.customerName},</p>
      <p>${data.message}</p>
      <p>Date: ${data.date}</p>
      <p>Time: ${data.time}</p>
      ${data.duration ? `<p>Expected Duration: ${data.duration}</p>` : ''}
      <p>We apologize for any inconvenience this may cause.</p>
    `,
  },
  USAGE_ALERT: {
    subject: 'Data Usage Alert - BroadbandX',
    template: (data) => `
      <h2>Data Usage Alert</h2>
      <p>Dear ${data.customerName},</p>
      <p>Your data usage has reached ${data.usagePercentage}% of your monthly limit.</p>
      <p>Usage Details:</p>
      <ul>
        <li>Current Usage: ${data.currentUsage} GB</li>
        <li>Monthly Limit: ${data.monthlyLimit} GB</li>
        <li>Remaining Data: ${data.remainingData} GB</li>
        <li>Days Left in Cycle: ${data.daysLeft}</li>
      </ul>
      <p>You can monitor your usage and upgrade your plan at any time through your <a href="${process.env.CLIENT_URL}/dashboard">dashboard</a>.</p>
    `,
  },
  WELCOME: {
    subject: 'Welcome to BroadbandX!',
    template: (data) => `
      <h2>Welcome to BroadbandX!</h2>
      <p>Dear ${data.customerName || 'Valued Customer'},</p>
      <p>Thank you for choosing BroadbandX as your internet service provider. We're excited to have you onboard!</p>
      <p>Your service details:</p>
      <ul>
        <li><strong>Plan:</strong> ${data.planName || 'N/A'}</li>
        <li><strong>Speed:</strong> ${data.speed || 'N/A'}</li>
        <li><strong>Monthly Data:</strong> ${data.data || 'N/A'}</li>
        <li><strong>Installation Date:</strong> ${data.installationDate || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</li>
        <li><strong>Price:</strong> ₹${data.price || 'N/A'}/month</li>
      </ul>
      <p>You can access your account dashboard at any time by visiting <a href="${process.env.CLIENT_URL}/dashboard">your dashboard</a>.</p>
      <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
      <p>Thank you for choosing BroadbandX!</p>
    `,
  },
  SUPPORT_TICKET: {
    subject: (data) => `Support Ticket Update - ${data.ticketNumber || data}`,
    template: (data) => `
      <h2>Support Ticket Update</h2>
      <p>Dear ${data.customerName},</p>
      <p>There has been an update to your support ticket:</p>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px;">
        <p><strong>Ticket Number:</strong> ${data.ticketNumber}</p>
        <p><strong>Status:</strong> ${data.status}</p>
        <p><strong>Last Update:</strong> ${data.updateTime}</p>
        ${data.message ? `<p><strong>Message:</strong> ${data.message}</p>` : ''}
      </div>
      <p>You can view the complete ticket details and respond by visiting your <a href="${process.env.CLIENT_URL}/support/ticket/${data.ticketId}">support ticket</a>.</p>
    `,
  },
  FEEDBACK_REQUEST: {
    subject: 'Share Your Experience with BroadbandX',
    template: (data) => `
      <h2>How Are We Doing?</h2>
      <p>Dear ${data.customerName},</p>
      <p>We value your feedback and would love to hear about your experience with BroadbandX. Your insights help us improve our services and better serve our customers.</p>
      <p>Please take a moment to share your thoughts about:</p>
      <ul>
        <li>Internet Speed and Reliability</li>
        <li>Customer Support Experience</li>
        <li>Overall Service Quality</li>
      </ul>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.CLIENT_URL}/feedback" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
          Submit Your Feedback
        </a>
      </div>
      <p>Your feedback helps us maintain the high standards of service you expect from BroadbandX.</p>
    `,
  },
  FEEDBACK_RESPONSE: {
    subject: 'Response to Your Feedback - BroadbandX',
    template: (data) => `
      <h2>Thank You for Your Feedback</h2>
      <p>Dear ${data.customerName},</p>
      <p>Thank you for taking the time to share your thoughts about our ${data.feedbackType} service. We truly value your feedback and want to address your comments.</p>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Our Response:</strong></p>
        <p>${data.response}</p>
      </div>
      <p>If you have any additional comments or concerns, please don't hesitate to reach out to our support team.</p>
    `,
  },
  PASSWORD_RESET: {
    subject: 'Password Reset Request - BroadbandX',
    template: (data) => `
      <h2>Password Reset Request</h2>
      <p>Dear ${data.name},</p>
      <p>We received a request to reset your password for your BroadbandX account. Click the button below to reset it:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.resetURL}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
          Reset Password
        </a>
      </div>
      <p>This link will expire in ${data.expiresIn}.</p>
      <p><strong>If you didn't request this password reset, please ignore this email.</strong></p>
      <p style="color: #666; font-size: 12px; margin-top: 30px;">
        If the button doesn't work, copy and paste this link into your browser:<br/>
        ${data.resetURL}
      </p>
    `,
  },
  ACCOUNT_LOCKOUT: {
    subject: '🔒 Account Security Alert - BroadbandX',
    template: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
          <h2 style="margin: 0;">🔒 Account Locked</h2>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">Suspicious login activity detected</p>
        </div>
        <div style="background: #fff; padding: 20px; border: 1px solid #e5e7eb;">
          <p>Dear ${data.name},</p>
          <p>Your BroadbandX account has been <strong style="color: #dc2626;">temporarily locked</strong> due to <strong>${data.attempts} consecutive failed login attempts</strong>.</p>
          
          <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #991b1b;">Details</h3>
            <p style="margin: 5px 0;"><strong>IP Address:</strong> ${data.ipAddress || 'Unknown'}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${data.time}</p>
            <p style="margin: 5px 0;"><strong>Lock Duration:</strong> ${data.lockDuration || '2 hours'}</p>
          </div>
          
          <p>Your account will be automatically unlocked after ${data.lockDuration || '2 hours'}. If this wasn't you, we strongly recommend:</p>
          <ul>
            <li>Changing your password immediately after unlock</li>
            <li>Enabling two-factor authentication</li>
            <li>Checking for unauthorized activity on your account</li>
          </ul>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/forgot-password" style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Reset Your Password
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">If you did not attempt to log in, someone may be trying to access your account. Please reset your password as a precaution.</p>
        </div>
        <div style="background: #f9fafb; padding: 15px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="margin: 0; color: #6b7280; font-size: 12px;">BroadbandX Security Team | Automated Security Alert</p>
        </div>
      </div>
    `,
  },
  HIGH_RISK_ALERT: {
    subject: (data) => `⚠️ ALERT: ${data.count || data} High-Risk Customer${(data.count || data) > 1 ? 's' : ''} Detected - BroadbandX`,
    template: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
          <h2 style="margin: 0;">⚠️ High-Risk Customer Alert</h2>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">Immediate attention required</p>
        </div>
        <div style="background: #fff; padding: 20px; border: 1px solid #e5e7eb;">
          <p>Dear Admin,</p>
          <p>Our AI-powered churn monitoring system has detected <strong style="color: #dc2626;">${data.highRiskCount} high-risk customer${data.highRiskCount > 1 ? 's' : ''}</strong> that may require immediate intervention.</p>
          
          <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #991b1b;">Risk Summary</h3>
            <table style="width: 100%;">
              <tr><td>🔴 High Risk:</td><td><strong>${data.highRiskCount}</strong></td></tr>
              <tr><td>🟡 Medium Risk:</td><td><strong>${data.mediumRiskCount}</strong></td></tr>
              <tr><td>🟢 Low Risk:</td><td><strong>${data.lowRiskCount}</strong></td></tr>
              <tr><td>📊 Total Monitored:</td><td><strong>${data.total}</strong></td></tr>
            </table>
          </div>

          ${data.topAtRisk && data.topAtRisk.length > 0 ? `
          <h3 style="color: #374151;">Top At-Risk Customers</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb;">Customer</th>
                <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb;">Risk Level</th>
                <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb;">Probability</th>
              </tr>
            </thead>
            <tbody>
              ${data.topAtRisk.map(c => `
                <tr>
                  <td style="padding: 10px; border: 1px solid #e5e7eb;">${c.name}<br><small style="color: #6b7280;">${c.email}</small></td>
                  <td style="padding: 10px; border: 1px solid #e5e7eb;"><span style="color: ${c.riskLevel === 'High' ? '#dc2626' : '#f59e0b'}; font-weight: bold;">${c.riskLevel}</span></td>
                  <td style="padding: 10px; border: 1px solid #e5e7eb;">${c.probability}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ` : ''}

          <div style="text-align: center; margin: 25px 0;">
            <a href="${process.env.CLIENT_URL}/admin?tab=ai-pricing" style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              View AI Pricing Dashboard
            </a>
          </div>

          <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
            This is an automated alert from BroadbandX AI Pricing System. Scans run every 6 hours.
          </p>
        </div>
        <div style="background: #f9fafb; padding: 15px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="margin: 0; color: #6b7280; font-size: 12px;">BroadbandX AI Pricing System | ML-Powered Churn Prediction</p>
        </div>
      </div>
    `,
  },
  SCHEDULED_REPORT: {
    subject: (data) => `📊 ${data.period || data} AI Pricing Report - BroadbandX`,
    template: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
          <h2 style="margin: 0;">📊 ${data.period} AI Pricing Report</h2>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">Generated: ${data.generatedAt}</p>
        </div>
        <div style="background: #fff; padding: 20px; border: 1px solid #e5e7eb;">
          <p>Dear Admin,</p>
          <p>Here is your ${data.period.toLowerCase()} churn risk summary for BroadbandX.</p>
          
          <div style="display: flex; justify-content: space-around; margin: 20px 0; text-align: center;">
            <div style="background: #fef2f2; padding: 15px 25px; border-radius: 8px;">
              <div style="font-size: 28px; font-weight: bold; color: #dc2626;">${data.highRiskCount}</div>
              <div style="color: #991b1b; font-size: 12px;">High Risk</div>
            </div>
            <div style="background: #fffbeb; padding: 15px 25px; border-radius: 8px;">
              <div style="font-size: 28px; font-weight: bold; color: #f59e0b;">${data.mediumRiskCount}</div>
              <div style="color: #92400e; font-size: 12px;">Medium Risk</div>
            </div>
            <div style="background: #f0fdf4; padding: 15px 25px; border-radius: 8px;">
              <div style="font-size: 28px; font-weight: bold; color: #16a34a;">${data.lowRiskCount}</div>
              <div style="color: #166534; font-size: 12px;">Low Risk</div>
            </div>
          </div>

          <h3 style="color: #374151;">📈 Key Metrics</h3>
          <ul style="color: #4b5563;">
            <li>Total Customers Monitored: <strong>${data.total}</strong></li>
            <li>Average Churn Probability: <strong>${data.avgProbability}%</strong></li>
            <li>Customers Requiring Attention: <strong>${data.highRiskCount + data.mediumRiskCount}</strong></li>
          </ul>

          ${data.trends ? `
          <h3 style="color: #374151;">📊 Trend Analysis</h3>
          <p style="color: #4b5563;">${data.trends}</p>
          ` : ''}

          <div style="text-align: center; margin: 25px 0;">
            <a href="${process.env.CLIENT_URL}/admin?tab=ai-pricing" style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              View Full Dashboard
            </a>
          </div>
        </div>
        <div style="background: #f9fafb; padding: 15px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="margin: 0; color: #6b7280; font-size: 12px;">BroadbandX AI Pricing System | Automated ${data.period} Report</p>
        </div>
      </div>
    `,
  },
  SUBSCRIPTION_EXPIRED: {
    subject: '⚠️ Your BroadbandX Plan Has Expired',
    template: (data) => `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: #fff; margin: 0; font-size: 24px;">⚠️ Plan Expired</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Your broadband service needs renewal</p>
        </div>
        <div style="padding: 30px 20px; background: #ffffff; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 16px; color: #333;">Hi ${data.userName},</p>
          <p style="font-size: 15px; color: #555; line-height: 1.6;">Your <strong>${data.planName}</strong> subscription expired on <strong>${data.expiryDate}</strong>.</p>
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #92400e; font-weight: 600;">🕐 Grace Period: ${data.graceDays} days</p>
            <p style="margin: 5px 0 0; color: #92400e;">Your service will continue until <strong>${data.gracePeriodEnd}</strong>. After that, your connection will be suspended.</p>
          </div>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Renew Now →</a>
          </div>
          <p style="font-size: 14px; color: #888;">Renewal amount: <strong>₹${data.amount}</strong></p>
        </div>
        <div style="background: #f9fafb; padding: 15px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="margin: 0; color: #6b7280; font-size: 12px;">BroadbandX | Subscription Management</p>
        </div>
      </div>
    `,
  },
  SUBSCRIPTION_SUSPENDED: {
    subject: '🚫 Your BroadbandX Service Has Been Suspended',
    template: (data) => `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: #fff; margin: 0; font-size: 24px;">🚫 Service Suspended</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Action required to restore your connection</p>
        </div>
        <div style="padding: 30px 20px; background: #ffffff; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 16px; color: #333;">Hi ${data.userName},</p>
          <p style="font-size: 15px; color: #555; line-height: 1.6;">Your <strong>${data.planName}</strong> subscription has been <strong style="color: #ef4444;">suspended</strong> due to non-renewal after the grace period ended.</p>
          <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #991b1b; font-weight: 600;">Your broadband service is currently inactive.</p>
            <p style="margin: 5px 0 0; color: #991b1b;">Renew now to restore your connection immediately.</p>
          </div>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Restore Service →</a>
          </div>
          <p style="font-size: 14px; color: #888;">Renewal amount: <strong>₹${data.amount}</strong></p>
        </div>
        <div style="background: #f9fafb; padding: 15px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="margin: 0; color: #6b7280; font-size: 12px;">BroadbandX | Subscription Management</p>
        </div>
      </div>
    `,
  },
};

/**
 * Send an email using a template
 * @param {string} to - Recipient email address
 * @param {string} templateName - Name of the template to use
 * @param {Object} data - Data to populate the template
 */
const sendTemplatedEmail = async (to, templateName, data) => {
  if (!EMAIL_TEMPLATES[templateName]) {
    throw new Error(`Template ${templateName} not found`);
  }

  const template = EMAIL_TEMPLATES[templateName];
  const subject = typeof template.subject === 'function' ? template.subject(data) : template.subject;

  try {
    const mailOptions = {
      from: `"BroadbandX" <${process.env.EMAIL_USER}>`, // Gmail sender
      to: to,
      subject: subject,
      html: template.template(data),
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully');
    return result;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
};

// Utility functions for specific email types
const sendPaymentReminder = async (to, data) => {
  return sendTemplatedEmail(to, 'PAYMENT_REMINDER', data);
};

const sendServiceUpdate = async (to, data) => {
  return sendTemplatedEmail(to, 'SERVICE_UPDATE', data);
};

const sendUsageAlert = async (to, data) => {
  return sendTemplatedEmail(to, 'USAGE_ALERT', data);
};

const sendWelcomeEmail = async (to, data) => {
  return sendTemplatedEmail(to, 'WELCOME', data);
};

const sendTicketUpdate = async (to, data) => {
  return sendTemplatedEmail(to, 'SUPPORT_TICKET', data);
};

const sendFeedbackRequest = async (to, data) => {
  return sendTemplatedEmail(to, 'FEEDBACK_REQUEST', data);
};

const sendFeedbackResponse = async (to, data) => {
  return sendTemplatedEmail(to, 'FEEDBACK_RESPONSE', data);
};

const sendPasswordResetEmail = async (to, data) => {
  return sendTemplatedEmail(to, 'PASSWORD_RESET', data);
};

const sendAccountLockoutEmail = async (to, data) => {
  return sendTemplatedEmail(to, 'ACCOUNT_LOCKOUT', data);
};

/**
 * Send high-risk customer alert to admin
 * @param {string} to - Admin email address
 * @param {Object} data - Alert data including risk counts and top at-risk customers
 */
const sendHighRiskAlert = async (to, data) => {
  if (!EMAIL_TEMPLATES['HIGH_RISK_ALERT']) {
    throw new Error('HIGH_RISK_ALERT template not found');
  }

  const template = EMAIL_TEMPLATES['HIGH_RISK_ALERT'];
  const subject = template.subject(data.highRiskCount);

  try {
    const mailOptions = {
      from: `"BroadbandX AI System" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: template.template(data),
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ High-risk alert email sent to:', to);
    return result;
  } catch (error) {
    console.error('❌ Error sending high-risk alert:', error);
    throw error;
  }
};

/**
 * Send scheduled report to admin
 * @param {string} to - Admin email address
 * @param {Object} data - Report data including period and risk metrics
 */
const sendScheduledReport = async (to, data) => {
  if (!EMAIL_TEMPLATES['SCHEDULED_REPORT']) {
    throw new Error('SCHEDULED_REPORT template not found');
  }

  const template = EMAIL_TEMPLATES['SCHEDULED_REPORT'];
  const subject = template.subject(data.period);

  try {
    const mailOptions = {
      from: `"BroadbandX AI System" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: template.template(data),
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ ${data.period} report email sent to:`, to);
    return result;
  } catch (error) {
    console.error('❌ Error sending scheduled report:', error);
    throw error;
  }
};

module.exports = {
  sendTemplatedEmail,
  sendPaymentReminder,
  sendServiceUpdate,
  sendUsageAlert,
  sendWelcomeEmail,
  sendTicketUpdate,
  sendFeedbackRequest,
  sendFeedbackResponse,
  sendPasswordResetEmail,
  sendAccountLockoutEmail,
  sendHighRiskAlert,
  sendScheduledReport
};