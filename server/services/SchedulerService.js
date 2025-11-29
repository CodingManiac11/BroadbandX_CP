const cron = require('node-cron');
const BillingService = require('./BillingService');
const AdjustmentService = require('./AdjustmentService');
const BillingSubscription = require('../models/BillingSubscription');
const BillingInvoice = require('../models/BillingInvoice');
const JournalEntry = require('../models/JournalEntry');
const ProrationService = require('./ProrationService');
const emailService = require('./emailService');

/**
 * SchedulerService - Handles all scheduled billing operations
 * Manages invoice generation, plan changes, cancellations, and cleanup tasks
 */
class SchedulerService {
  
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }
  
  /**
   * Initialize and start all scheduled jobs
   */
  async start() {
    if (this.isRunning) {
      console.log('Scheduler is already running');
      return;
    }
    
    console.log('Starting billing scheduler...');
    
    // Daily invoice generation (runs at 2 AM every day)
    this.jobs.set('dailyInvoiceGeneration', cron.schedule('0 2 * * *', () => {
      this.runDailyInvoiceGeneration();
    }, { scheduled: false }));
    
    // Process scheduled plan changes (runs at 1 AM every day)
    this.jobs.set('processScheduledChanges', cron.schedule('0 1 * * *', () => {
      this.processScheduledChanges();
    }, { scheduled: false }));
    
    // Process scheduled cancellations (runs at 3 AM every day)
    this.jobs.set('processScheduledCancellations', cron.schedule('0 3 * * *', () => {
      this.processScheduledCancellations();
    }, { scheduled: false }));
    
    // Finalize draft invoices (runs every hour)
    this.jobs.set('finalizeDraftInvoices', cron.schedule('0 * * * *', () => {
      this.finalizeDraftInvoices();
    }, { scheduled: false }));
    
    // Send payment reminders (runs at 10 AM every day)
    this.jobs.set('sendPaymentReminders', cron.schedule('0 10 * * *', () => {
      this.sendPaymentReminders();
    }, { scheduled: false }));
    
    // Cleanup old records (runs at 4 AM every Sunday)
    this.jobs.set('cleanupOldRecords', cron.schedule('0 4 * * 0', () => {
      this.cleanupOldRecords();
    }, { scheduled: false }));
    
    // Start all jobs
    this.jobs.forEach((job, name) => {
      job.start();
      console.log(`✓ Started job: ${name}`);
    });
    
    this.isRunning = true;
    console.log('✓ All billing scheduler jobs started successfully');
  }
  
  /**
   * Stop all scheduled jobs
   */
  stop() {
    console.log('Stopping billing scheduler...');
    
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`✓ Stopped job: ${name}`);
    });
    
    this.isRunning = false;
    console.log('✓ Billing scheduler stopped');
  }
  
  /**
   * Daily invoice generation for active subscriptions
   */
  async runDailyInvoiceGeneration() {
    console.log('🔄 Starting daily invoice generation...');
    
    try {
      const today = ProrationService.normalizeToUTCMidnight(new Date());
      
      // Find subscriptions where billing cycle anchor matches today
      const subscriptionsToInvoice = await BillingSubscription.find({
        status: 'ACTIVE',
        billing_cycle_anchor: {
          $lte: today,
          $gte: new Date(today.getTime() - (24 * 60 * 60 * 1000)) // Within last 24 hours
        }
      }).populate('current_plan_id').populate('customer_id');
      
      console.log(`Found ${subscriptionsToInvoice.length} subscriptions to invoice`);
      
      const results = {
        success: 0,
        failed: 0,
        errors: []
      };
      
      for (const subscription of subscriptionsToInvoice) {
        try {
          // Get billing period
          const billingPeriod = ProrationService.getBillingPeriod(subscription.billing_cycle_anchor);
          
          // Check if invoice already exists for this period
          const existingInvoice = await BillingInvoice.findOne({
            subscription_id: subscription._id,
            period_start: billingPeriod.period_start,
            period_end: billingPeriod.period_end
          });
          
          if (existingInvoice) {
            console.log(`Invoice already exists for subscription ${subscription._id} for period ${billingPeriod.period_start.toISOString().split('T')[0]}`);
            continue;
          }
          
          // Generate invoice
          const invoiceResult = await BillingService.generateInvoice(
            subscription._id,
            billingPeriod.period_start,
            billingPeriod.period_end,
            {
              taxPercentage: 18, // GST rate
              includePendingAdjustments: true
            }
          );
          
          // Finalize invoice immediately
          await invoiceResult.invoice.finalize();
          
          // Create journal entry for the invoice
          const journalEntry = await JournalEntry.createSubscriptionBillingEntry(
            invoiceResult.invoice,
            subscription
          );
          await journalEntry.save();
          await journalEntry.post();
          
          // Send invoice email
          try {
            await emailService.sendInvoiceNotification(
              subscription.customer_id.email,
              {
                customerName: subscription.customer_id.name,
                invoiceNumber: invoiceResult.invoice.invoice_number,
                amount: invoiceResult.invoice.total_formatted,
                dueDate: invoiceResult.invoice.due_date,
                periodStart: billingPeriod.period_start,
                periodEnd: billingPeriod.period_end
              }
            );
          } catch (emailError) {
            console.error(`Failed to send invoice email for ${subscription._id}:`, emailError.message);
          }
          
          // Update subscription's next billing date
          subscription.billing_cycle_anchor = ProrationService.getNextBillingAnchor(
            subscription.billing_cycle_anchor
          );
          await subscription.save();
          
          results.success++;
          console.log(`✓ Generated invoice ${invoiceResult.invoice.invoice_number} for subscription ${subscription._id}`);
          
        } catch (error) {
          results.failed++;
          results.errors.push({
            subscription_id: subscription._id,
            error: error.message
          });
          console.error(`✗ Failed to generate invoice for subscription ${subscription._id}:`, error.message);
        }
      }
      
      console.log(`✓ Daily invoice generation completed. Success: ${results.success}, Failed: ${results.failed}`);
      
      return results;
      
    } catch (error) {
      console.error('Daily invoice generation failed:', error);
      throw error;
    }
  }
  
  /**
   * Process scheduled plan changes
   */
  async processScheduledChanges() {
    console.log('🔄 Processing scheduled plan changes...');
    
    try {
      const result = await BillingService.processScheduledPlanChanges();
      console.log(`✓ Processed ${result.processed_count} scheduled plan changes`);
      return result;
    } catch (error) {
      console.error('Processing scheduled plan changes failed:', error);
      throw error;
    }
  }
  
  /**
   * Process scheduled cancellations
   */
  async processScheduledCancellations() {
    console.log('🔄 Processing scheduled cancellations...');
    
    try {
      const result = await BillingService.processScheduledCancellations();
      console.log(`✓ Processed ${result.processed_count} scheduled cancellations`);
      return result;
    } catch (error) {
      console.error('Processing scheduled cancellations failed:', error);
      throw error;
    }
  }
  
  /**
   * Finalize draft invoices older than 1 hour
   */
  async finalizeDraftInvoices() {
    console.log('🔄 Finalizing draft invoices...');
    
    try {
      const oneHourAgo = new Date(Date.now() - (60 * 60 * 1000));
      
      const draftInvoices = await BillingInvoice.find({
        status: 'DRAFT',
        created_at: { $lt: oneHourAgo }
      });
      
      const results = {
        success: 0,
        failed: 0,
        errors: []
      };
      
      for (const invoice of draftInvoices) {
        try {
          await invoice.finalize();
          results.success++;
          console.log(`✓ Finalized invoice ${invoice.invoice_number}`);
        } catch (error) {
          results.failed++;
          results.errors.push({
            invoice_id: invoice._id,
            invoice_number: invoice.invoice_number,
            error: error.message
          });
          console.error(`✗ Failed to finalize invoice ${invoice.invoice_number}:`, error.message);
        }
      }
      
      console.log(`✓ Finalized ${results.success} draft invoices, ${results.failed} failed`);
      return results;
      
    } catch (error) {
      console.error('Finalizing draft invoices failed:', error);
      throw error;
    }
  }
  
  /**
   * Send payment reminders for overdue invoices
   */
  async sendPaymentReminders() {
    console.log('🔄 Sending payment reminders...');
    
    try {
      const today = new Date();
      const threeDaysFromNow = new Date(today.getTime() + (3 * 24 * 60 * 60 * 1000));
      const sevenDaysAgo = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
      
      // Find overdue and upcoming due invoices
      const invoicesToRemind = await BillingInvoice.find({
        status: 'FINAL',
        $or: [
          // Overdue invoices
          { due_date: { $lt: today } },
          // Due within 3 days
          { 
            due_date: { 
              $gte: today,
              $lte: threeDaysFromNow 
            }
          }
        ]
      }).populate({
        path: 'subscription_id',
        populate: {
          path: 'customer_id',
          select: 'name email'
        }
      });
      
      const results = {
        sent: 0,
        failed: 0,
        errors: []
      };
      
      for (const invoice of invoicesToRemind) {
        try {
          // Check if reminder was already sent recently
          const lastReminder = invoice.metadata?.last_reminder_sent;
          if (lastReminder && new Date(lastReminder) > sevenDaysAgo) {
            continue; // Skip if reminder sent within last 7 days
          }
          
          const isOverdue = invoice.due_date < today;
          
          await emailService.sendPaymentReminder(
            invoice.subscription_id.customer_id.email,
            {
              customerName: invoice.subscription_id.customer_id.name,
              invoiceNumber: invoice.invoice_number,
              amount: invoice.total_formatted,
              dueDate: invoice.due_date,
              isOverdue: isOverdue,
              daysOverdue: isOverdue ? Math.floor((today - invoice.due_date) / (1000 * 60 * 60 * 24)) : null
            }
          );
          
          // Update reminder tracking
          invoice.metadata = invoice.metadata || {};
          invoice.metadata.last_reminder_sent = new Date();
          await invoice.save();
          
          results.sent++;
          console.log(`✓ Sent payment reminder for invoice ${invoice.invoice_number}`);
          
        } catch (error) {
          results.failed++;
          results.errors.push({
            invoice_id: invoice._id,
            invoice_number: invoice.invoice_number,
            error: error.message
          });
          console.error(`✗ Failed to send reminder for invoice ${invoice.invoice_number}:`, error.message);
        }
      }
      
      console.log(`✓ Sent ${results.sent} payment reminders, ${results.failed} failed`);
      return results;
      
    } catch (error) {
      console.error('Sending payment reminders failed:', error);
      throw error;
    }
  }
  
  /**
   * Clean up old records and optimize database
   */
  async cleanupOldRecords() {
    console.log('🔄 Running cleanup tasks...');
    
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      const results = {
        cleanedInvoices: 0,
        cleanedJournalEntries: 0,
        cleanedAdjustments: 0
      };
      
      // Archive old paid invoices (older than 1 year)
      const oldPaidInvoices = await BillingInvoice.updateMany(
        {
          status: 'PAID',
          paid_at: { $lt: oneYearAgo }
        },
        {
          $set: { 'metadata.archived': true }
        }
      );
      results.cleanedInvoices = oldPaidInvoices.modifiedCount;
      
      // Clean up old draft invoices that were never finalized (older than 6 months)
      await BillingInvoice.deleteMany({
        status: 'DRAFT',
        created_at: { $lt: sixMonthsAgo }
      });
      
      // Archive old journal entries (older than 1 year)
      const oldJournalEntries = await JournalEntry.updateMany(
        {
          status: 'POSTED',
          posted_at: { $lt: oneYearAgo }
        },
        {
          $set: { 'metadata.archived': true }
        }
      );
      results.cleanedJournalEntries = oldJournalEntries.modifiedCount;
      
      // Clean up old voided adjustments (older than 6 months)
      const cleanedAdjustments = await BillingAdjustment.deleteMany({
        status: 'VOIDED',
        voided_at: { $lt: sixMonthsAgo }
      });
      results.cleanedAdjustments = cleanedAdjustments.deletedCount;
      
      console.log(`✓ Cleanup completed:`, results);
      return results;
      
    } catch (error) {
      console.error('Cleanup tasks failed:', error);
      throw error;
    }
  }
  
  /**
   * Manual trigger for invoice generation (for testing/admin use)
   */
  async triggerInvoiceGeneration(subscriptionId = null) {
    console.log(`🔄 Manually triggering invoice generation${subscriptionId ? ` for subscription ${subscriptionId}` : ''}...`);
    
    try {
      if (subscriptionId) {
        // Generate invoice for specific subscription
        const subscription = await BillingSubscription.findById(subscriptionId)
          .populate('current_plan_id');
        
        if (!subscription) {
          throw new Error('Subscription not found');
        }
        
        const billingPeriod = ProrationService.getBillingPeriod(subscription.billing_cycle_anchor);
        
        const invoiceResult = await BillingService.generateInvoice(
          subscription._id,
          billingPeriod.period_start,
          billingPeriod.period_end
        );
        
        return {
          success: true,
          invoice: invoiceResult.invoice,
          message: `Invoice ${invoiceResult.invoice.invoice_number} generated successfully`
        };
      } else {
        // Run full daily invoice generation
        return await this.runDailyInvoiceGeneration();
      }
    } catch (error) {
      console.error('Manual invoice generation failed:', error);
      throw error;
    }
  }
  
  /**
   * Get scheduler status and job information
   */
  getStatus() {
    const jobStatuses = {};
    this.jobs.forEach((job, name) => {
      jobStatuses[name] = {
        running: job.running,
        scheduled: job.scheduled
      };
    });
    
    return {
      isRunning: this.isRunning,
      totalJobs: this.jobs.size,
      jobs: jobStatuses
    };
  }
  
  /**
   * Manually run a specific job (for testing/admin use)
   */
  async runJob(jobName) {
    const jobMap = {
      'dailyInvoiceGeneration': this.runDailyInvoiceGeneration,
      'processScheduledChanges': this.processScheduledChanges,
      'processScheduledCancellations': this.processScheduledCancellations,
      'finalizeDraftInvoices': this.finalizeDraftInvoices,
      'sendPaymentReminders': this.sendPaymentReminders,
      'cleanupOldRecords': this.cleanupOldRecords
    };
    
    const jobFunction = jobMap[jobName];
    if (!jobFunction) {
      throw new Error(`Unknown job: ${jobName}`);
    }
    
    console.log(`🔄 Manually running job: ${jobName}...`);
    return await jobFunction.call(this);
  }
}

// Create singleton instance
const schedulerService = new SchedulerService();

module.exports = schedulerService;