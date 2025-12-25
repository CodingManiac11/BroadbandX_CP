const cron = require('node-cron');
const BillingReminder = require('../models/BillingReminder');
const Subscription = require('../models/Subscription');
const emailService = require('./emailService');
const { emitToUser } = require('../utils/realTimeEvents');

class ReminderSchedulerService {
  constructor() {
    this.jobs = [];
  }

  // Start all scheduled jobs
  start() {
    console.log('🔔 Starting Reminder Scheduler Service...');

    // Process pending reminders every hour
    this.jobs.push(
      cron.schedule('0 * * * *', async () => {
        console.log('⏰ Running hourly reminder check...');
        await this.processPendingReminders();
      })
    );

    // Create reminders for expiring subscriptions daily at 9 AM
    this.jobs.push(
      cron.schedule('0 9 * * *', async () => {
        console.log('📅 Creating reminders for expiring subscriptions...');
        await this.createExpiringSubscriptionReminders();
      })
    );

    // Check for overdue payments daily at 10 AM
    this.jobs.push(
      cron.schedule('0 10 * * *', async () => {
        console.log('⚠️ Checking for overdue payments...');
        await this.createOverdueReminders();
      })
    );

    console.log('✅ Reminder Scheduler Service started successfully');
  }

  // Stop all scheduled jobs
  stop() {
    this.jobs.forEach(job => job.stop());
    console.log('🛑 Reminder Scheduler Service stopped');
  }

  // Process pending reminders
  async processPendingReminders() {
    try {
      const pendingReminders = await BillingReminder.getPendingReminders();
      
      console.log(`📨 Processing ${pendingReminders.length} pending reminders...`);
      
      let sent = 0;
      let failed = 0;

      for (const reminder of pendingReminders) {
        try {
          await this.sendReminder(reminder);
          sent++;
        } catch (error) {
          console.error(`Failed to send reminder ${reminder._id}:`, error);
          
          // Record error and retry
          reminder.metadata.error = error.message;
          await reminder.retry();
          
          failed++;
        }
      }

      console.log(`✅ Sent ${sent} reminders, ${failed} failed`);
    } catch (error) {
      console.error('Error processing pending reminders:', error);
    }
  }

  // Create reminders for expiring subscriptions
  async createExpiringSubscriptionReminders() {
    try {
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Find subscriptions expiring in the next 30 days
      const expiringSubscriptions = await Subscription.find({
        status: 'active',
        endDate: {
          $gte: now,
          $lte: thirtyDaysFromNow
        }
      }).populate('user', 'name email')
        .populate('plan', 'name price');

      let remindersCreated = 0;

      for (const subscription of expiringSubscriptions) {
        const daysUntilExpiry = Math.ceil((subscription.endDate - now) / (1000 * 60 * 60 * 24));

        // Create reminders at different intervals
        const intervals = [
          { days: 7, level: 1 },
          { days: 3, level: 2 },
          { days: 1, level: 3 },
          { days: 0, level: 4 }
        ];

        for (const interval of intervals) {
          if (daysUntilExpiry <= interval.days) {
            // Check if reminder already exists
            const existingReminder = await BillingReminder.findOne({
              subscription: subscription._id,
              type: 'expiring_soon',
              reminderLevel: interval.level,
              status: { $in: ['pending', 'sent'] }
            });

            if (!existingReminder) {
              await BillingReminder.create({
                user: subscription.user._id,
                subscription: subscription._id,
                type: 'expiring_soon',
                dueDate: subscription.endDate,
                amount: subscription.plan.price,
                reminderLevel: interval.level
              });

              remindersCreated++;
            }
          }
        }
      }

      console.log(`✅ Created ${remindersCreated} reminders for expiring subscriptions`);
    } catch (error) {
      console.error('Error creating expiring subscription reminders:', error);
    }
  }

  // Create overdue reminders
  async createOverdueReminders() {
    try {
      const now = new Date();

      // Find expired subscriptions
      const expiredSubscriptions = await Subscription.find({
        status: 'expired',
        endDate: { $lt: now }
      }).populate('user', 'name email')
        .populate('plan', 'name price');

      let remindersCreated = 0;

      for (const subscription of expiredSubscriptions) {
        // Check if overdue reminder already exists
        const existingReminder = await BillingReminder.findOne({
          subscription: subscription._id,
          type: 'overdue',
          status: { $in: ['pending', 'sent'] }
        });

        if (!existingReminder) {
          await BillingReminder.create({
            user: subscription.user._id,
            subscription: subscription._id,
            type: 'overdue',
            dueDate: subscription.endDate,
            amount: subscription.plan.price,
            reminderLevel: 5, // Overdue level
            scheduledFor: now
          });

          remindersCreated++;
        }
      }

      console.log(`✅ Created ${remindersCreated} overdue payment reminders`);
    } catch (error) {
      console.error('Error creating overdue reminders:', error);
    }
  }

  // Send individual reminder
  async sendReminder(reminder) {
    // Populate if needed
    if (!reminder.user.email) {
      await reminder.populate('user', 'name email phone');
    }
    if (!reminder.subscription.plan) {
      await reminder.populate('subscription', 'plan status endDate');
    }

    // Send email reminder
    await emailService.sendBillingReminder(reminder.user, {
      type: reminder.type,
      dueDate: reminder.dueDate,
      amount: reminder.amount,
      reminderLevel: reminder.reminderLevel,
      subscription: reminder.subscription
    });

    await reminder.markAsSent(['email']);

    // Send real-time notification
    emitToUser(reminder.user._id, 'billing:reminder', {
      id: reminder._id,
      type: reminder.type,
      dueDate: reminder.dueDate,
      amount: reminder.amount,
      message: this.getReminderMessage(reminder)
    });
  }

  // Get reminder message based on type
  getReminderMessage(reminder) {
    const dueDate = new Date(reminder.dueDate).toLocaleDateString();
    const amount = `₹${reminder.amount}`;

    switch (reminder.type) {
      case 'expiring_soon':
        return `Your subscription is expiring on ${dueDate}. Renew now for ${amount}.`;
      case 'overdue':
        return `Your payment of ${amount} is overdue. Please pay immediately to continue service.`;
      case 'renewal':
        return `Time to renew your subscription! Payment of ${amount} is due on ${dueDate}.`;
      case 'payment_failed':
        return `Your payment of ${amount} failed. Please update your payment method.`;
      default:
        return `Payment of ${amount} is due on ${dueDate}.`;
    }
  }
}

// Export singleton instance
module.exports = new ReminderSchedulerService();
