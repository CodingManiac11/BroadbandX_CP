const express = require('express');
const router = express.Router();
const { protect, authorize, authenticateToken } = require('../middleware/auth');
const {
  sendPaymentReminder,
  sendServiceUpdate,
  sendUsageAlert,
  sendWelcomeEmail,
  sendTicketUpdateEmail,
} = require('../controllers/notificationController');

// Use authenticateToken middleware (which is used in server.js)
const authMiddleware = authenticateToken || protect;

// Billing reminders endpoint for frontend
router.get('/reminders', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const Subscription = require('../models/Subscription');
    const Payment = require('../models/Payment');

    // Find user's active subscriptions
    const subscriptions = await Subscription.find({
      user: userId,
      status: 'active'
    }).populate('plan');

    const reminders = [];

    for (const subscription of subscriptions) {
      // Log if plan was deleted but still show reminder
      if (!subscription.plan) {
        console.log('Subscription has deleted plan, showing as Unknown Plan:', subscription._id);
      }

      // Calculate next billing date - try nextBillingDate, then endDate, then startDate + 1 month
      let nextBillingDate;
      if (subscription.nextBillingDate) {
        nextBillingDate = new Date(subscription.nextBillingDate);
      } else if (subscription.endDate) {
        nextBillingDate = new Date(subscription.endDate);
      } else if (subscription.startDate) {
        nextBillingDate = new Date(subscription.startDate);
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
      } else {
        continue; // Skip if no date info
      }

      const today = new Date();
      const daysUntilDue = Math.ceil((nextBillingDate - today) / (1000 * 60 * 60 * 24));
      const planName = subscription.plan?.name || 'Unknown Plan';
      const amount = subscription.pricing?.totalAmount || subscription.pricing?.finalPrice || subscription.plan?.pricing?.monthly || 0;

      // Check if payment is pending
      const pendingPayment = await Payment.findOne({
        subscription: subscription._id,
        status: { $in: ['created', 'pending'] }
      });

      if (daysUntilDue <= 7 && daysUntilDue > 0) {
        reminders.push({
          _id: `reminder_${subscription._id}`,
          type: daysUntilDue <= 3 ? 'payment_due' : 'upcoming',
          title: `Payment Due${daysUntilDue <= 3 ? ' Soon' : ''}`,
          message: `Your ${planName} subscription payment of ₹${amount} is due in ${daysUntilDue} days`,
          dueDate: nextBillingDate,
          amount: amount,
          priority: daysUntilDue <= 1 ? 'urgent' : daysUntilDue <= 3 ? 'high' : 'medium',
          read: false,
          createdAt: today
        });
      } else if (daysUntilDue < 0) {
        reminders.push({
          _id: `overdue_${subscription._id}`,
          type: 'overdue',
          title: 'Payment Overdue',
          message: `Your ${planName} subscription payment is overdue by ${Math.abs(daysUntilDue)} days`,
          dueDate: nextBillingDate,
          amount: amount,
          priority: 'urgent',
          read: false,
          createdAt: today
        });
      }
    }

    res.json({
      success: true,
      data: reminders
    });
  } catch (error) {
    console.error('Error fetching reminders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reminders',
      error: error.message
    });
  }
});

// Mark reminder as read
router.patch('/reminders/:reminderId/read', authMiddleware, async (req, res) => {
  try {
    // For now, just return success since reminders are generated on-the-fly
    res.json({
      success: true,
      message: 'Reminder marked as read'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to mark reminder as read'
    });
  }
});

// Payment reminder - Admin only
router.post('/payment-reminder/:userId', authMiddleware, sendPaymentReminder);

// Service update - Admin only
router.post('/service-update', authMiddleware, sendServiceUpdate);

// Usage alert - Admin and self
router.post('/usage-alert/:userId', authMiddleware, sendUsageAlert);

// Welcome email - Admin only
router.post('/welcome/:userId', authMiddleware, sendWelcomeEmail);

// Ticket update - Admin and self
router.post('/ticket-update/:ticketId', authMiddleware, sendTicketUpdateEmail);

module.exports = router;