const BillingAdjustment = require('../models/BillingAdjustment');
const BillingSubscription = require('../models/BillingSubscription');
const JournalEntry = require('../models/JournalEntry');

/**
 * AdjustmentService - Manual billing adjustments and credits
 * Handles customer credits, charges, and billing corrections
 */
class AdjustmentService {
  
  /**
   * Create a billing adjustment
   * @param {string} subscriptionId - Target subscription
   * @param {number} amountCents - Adjustment amount in cents (positive for charge, negative for credit)
   * @param {string} adjustmentType - CREDIT, CHARGE, or CORRECTION
   * @param {string} reason - Reason code for the adjustment
   * @param {string} description - Human-readable description
   * @param {Date} effectiveDate - When adjustment takes effect
   * @param {Object} options - Additional options
   * @returns {Object} Created adjustment
   */
  static async createAdjustment(subscriptionId, amountCents, adjustmentType, reason, description, effectiveDate = null, options = {}) {
    const {
      taxable = false,
      autoApply = false,
      metadata = {}
    } = options;
    
    effectiveDate = effectiveDate || new Date();
    
    try {
      // Validate subscription
      const subscription = await BillingSubscription.findById(subscriptionId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }
      
      // Validate amount
      if (!Number.isInteger(amountCents)) {
        throw new Error('Amount must be an integer (cents)');
      }
      
      // Validate adjustment type
      const validTypes = ['CREDIT', 'CHARGE', 'CORRECTION'];
      if (!validTypes.includes(adjustmentType)) {
        throw new Error(`Invalid adjustment type. Must be one of: ${validTypes.join(', ')}`);
      }
      
      // Ensure amount sign matches adjustment type
      if (adjustmentType === 'CREDIT' && amountCents > 0) {
        amountCents = -amountCents; // Credits should be negative
      } else if (adjustmentType === 'CHARGE' && amountCents < 0) {
        amountCents = Math.abs(amountCents); // Charges should be positive
      }
      
      // Create adjustment
      const adjustment = new BillingAdjustment({
        subscription_id: subscriptionId,
        amount_cents: amountCents,
        adjustment_type: adjustmentType,
        reason: reason,
        description: description,
        effective_date: effectiveDate,
        status: autoApply ? 'APPLIED' : 'PENDING',
        taxable: taxable,
        metadata: metadata
      });
      
      await adjustment.save();
      
      // Create journal entry if auto-applying
      if (autoApply) {
        const journalEntry = await JournalEntry.createAdjustmentEntry(adjustment, subscription);
        await journalEntry.save();
        await journalEntry.post();
        
        adjustment.applied_at = new Date();
        await adjustment.save();
      }
      
      return {
        success: true,
        adjustment: adjustment,
        subscription_id: subscriptionId,
        amount_formatted: `₹${Math.abs(amountCents / 100).toFixed(2)}`,
        type: adjustmentType
      };
      
    } catch (error) {
      throw new Error(`Adjustment creation failed: ${error.message}`);
    }
  }
  
  /**
   * Apply a pending adjustment to an invoice
   * @param {string} adjustmentId - Adjustment to apply
   * @param {string} invoiceId - Target invoice
   * @returns {Object} Application result
   */
  static async applyAdjustmentToInvoice(adjustmentId, invoiceId) {
    try {
      const adjustment = await BillingAdjustment.findById(adjustmentId);
      if (!adjustment) {
        throw new Error('Adjustment not found');
      }
      
      if (adjustment.status !== 'PENDING') {
        throw new Error('Can only apply pending adjustments');
      }
      
      // Apply to invoice using model method
      await adjustment.applyToInvoice(invoiceId);
      
      return {
        success: true,
        adjustment_id: adjustmentId,
        invoice_id: invoiceId,
        amount_cents: adjustment.amount_cents
      };
      
    } catch (error) {
      throw new Error(`Adjustment application failed: ${error.message}`);
    }
  }
  
  /**
   * Create customer goodwill credit
   * @param {string} subscriptionId - Target subscription
   * @param {number} creditAmountCents - Credit amount in cents (positive value)
   * @param {string} reason - Reason for goodwill credit
   * @param {Object} options - Additional options
   * @returns {Object} Created credit adjustment
   */
  static async createGoodwillCredit(subscriptionId, creditAmountCents, reason, options = {}) {
    const {
      description = `Goodwill credit - ${reason}`,
      autoApply = true,
      metadata = {}
    } = options;
    
    // Ensure amount is positive (will be made negative in createAdjustment)
    creditAmountCents = Math.abs(creditAmountCents);
    
    return this.createAdjustment(
      subscriptionId,
      creditAmountCents,
      'CREDIT',
      'GOODWILL_CREDIT',
      description,
      new Date(),
      {
        taxable: false,
        autoApply: autoApply,
        metadata: {
          ...metadata,
          goodwill_reason: reason,
          created_by: 'SYSTEM' // In real implementation, would be admin user ID
        }
      }
    );
  }
  
  /**
   * Create service credit for outage compensation
   * @param {string} subscriptionId - Target subscription
   * @param {Date} outageStart - When outage started
   * @param {Date} outageEnd - When outage ended
   * @param {Object} options - Additional options
   * @returns {Object} Created service credit
   */
  static async createServiceCredit(subscriptionId, outageStart, outageEnd, options = {}) {
    const {
      description = null,
      creditPolicy = 'FULL_DAY_CREDIT', // FULL_DAY_CREDIT, HOURLY_PRORATION, PERCENTAGE
      percentage = 100 // For percentage-based credits
    } = options;
    
    try {
      // Fetch subscription with plan
      const subscription = await BillingSubscription.findById(subscriptionId)
        .populate('current_plan_id');
      
      if (!subscription) {
        throw new Error('Subscription not found');
      }
      
      // Calculate outage duration
      const outageDurationMs = outageEnd.getTime() - outageStart.getTime();
      const outageDurationHours = outageDurationMs / (1000 * 60 * 60);
      const outageDurationDays = outageDurationMs / (1000 * 60 * 60 * 24);
      
      let creditAmountCents = 0;
      const dailyRate = Math.round(subscription.monthly_price_cents / 30);
      
      switch (creditPolicy) {
        case 'FULL_DAY_CREDIT':
          // Credit full day for any outage
          creditAmountCents = Math.ceil(outageDurationDays) * dailyRate;
          break;
          
        case 'HOURLY_PRORATION':
          // Credit based on actual hours
          creditAmountCents = Math.round((outageDurationHours / 24) * dailyRate);
          break;
          
        case 'PERCENTAGE':
          // Credit percentage of daily rate
          creditAmountCents = Math.round((dailyRate * percentage) / 100);
          break;
          
        default:
          throw new Error('Invalid credit policy');
      }
      
      const creditDescription = description || 
        `Service credit for outage (${outageStart.toISOString().split('T')[0]} to ${outageEnd.toISOString().split('T')[0]})`;
      
      return this.createAdjustment(
        subscriptionId,
        creditAmountCents,
        'CREDIT',
        'SERVICE_OUTAGE',
        creditDescription,
        new Date(),
        {
          taxable: false,
          autoApply: true,
          metadata: {
            outage_start: outageStart,
            outage_end: outageEnd,
            outage_duration_hours: outageDurationHours,
            credit_policy: creditPolicy,
            daily_rate_cents: dailyRate,
            percentage: percentage
          }
        }
      );
      
    } catch (error) {
      throw new Error(`Service credit creation failed: ${error.message}`);
    }
  }
  
  /**
   * Create promotional discount
   * @param {string} subscriptionId - Target subscription
   * @param {number} discountAmountCents - Discount amount in cents
   * @param {string} promoCode - Promotional code applied
   * @param {Object} options - Additional options
   * @returns {Object} Created discount adjustment
   */
  static async createPromotionalDiscount(subscriptionId, discountAmountCents, promoCode, options = {}) {
    const {
      description = `Promotional discount - ${promoCode}`,
      validUntil = null,
      autoApply = true,
      metadata = {}
    } = options;
    
    // Ensure amount is positive (will be made negative in createAdjustment)
    discountAmountCents = Math.abs(discountAmountCents);
    
    return this.createAdjustment(
      subscriptionId,
      discountAmountCents,
      'CREDIT',
      'PROMOTIONAL_DISCOUNT',
      description,
      new Date(),
      {
        taxable: false,
        autoApply: autoApply,
        metadata: {
          ...metadata,
          promo_code: promoCode,
          valid_until: validUntil,
          discount_type: 'PROMOTIONAL'
        }
      }
    );
  }
  
  /**
   * Create late fee charge
   * @param {string} subscriptionId - Target subscription
   * @param {string} invoiceId - Overdue invoice
   * @param {number} feeAmountCents - Late fee amount in cents
   * @param {Object} options - Additional options
   * @returns {Object} Created late fee adjustment
   */
  static async createLateFee(subscriptionId, invoiceId, feeAmountCents, options = {}) {
    const {
      description = 'Late payment fee',
      daysOverdue = 0,
      autoApply = true,
      taxable = true,
      metadata = {}
    } = options;
    
    return this.createAdjustment(
      subscriptionId,
      Math.abs(feeAmountCents), // Ensure positive for charge
      'CHARGE',
      'LATE_FEE',
      description,
      new Date(),
      {
        taxable: taxable,
        autoApply: autoApply,
        metadata: {
          ...metadata,
          related_invoice_id: invoiceId,
          days_overdue: daysOverdue,
          fee_type: 'LATE_PAYMENT'
        }
      }
    );
  }
  
  /**
   * Get adjustment summary for subscription
   * @param {string} subscriptionId - Target subscription
   * @param {Date} startDate - Start of date range
   * @param {Date} endDate - End of date range
   * @returns {Object} Adjustment summary
   */
  static async getAdjustmentSummary(subscriptionId, startDate = null, endDate = null) {
    try {
      const query = { subscription_id: subscriptionId };
      
      if (startDate || endDate) {
        query.effective_date = {};
        if (startDate) query.effective_date.$gte = startDate;
        if (endDate) query.effective_date.$lte = endDate;
      }
      
      const adjustments = await BillingAdjustment.find(query).sort({ effective_date: -1 });
      
      // Calculate totals by type
      const summary = {
        total_credits_cents: 0,
        total_charges_cents: 0,
        net_adjustment_cents: 0,
        pending_adjustments_cents: 0,
        applied_adjustments_cents: 0,
        adjustment_count: adjustments.length,
        adjustments_by_reason: {},
        adjustments: adjustments
      };
      
      adjustments.forEach(adj => {
        const amount = adj.amount_cents;
        
        if (amount < 0) {
          summary.total_credits_cents += Math.abs(amount);
        } else {
          summary.total_charges_cents += amount;
        }
        
        summary.net_adjustment_cents += amount;
        
        if (adj.status === 'PENDING') {
          summary.pending_adjustments_cents += amount;
        } else {
          summary.applied_adjustments_cents += amount;
        }
        
        // Group by reason
        if (!summary.adjustments_by_reason[adj.reason]) {
          summary.adjustments_by_reason[adj.reason] = {
            count: 0,
            total_cents: 0
          };
        }
        summary.adjustments_by_reason[adj.reason].count++;
        summary.adjustments_by_reason[adj.reason].total_cents += amount;
      });
      
      return summary;
      
    } catch (error) {
      throw new Error(`Adjustment summary failed: ${error.message}`);
    }
  }
  
  /**
   * Void an unapplied adjustment
   * @param {string} adjustmentId - Adjustment to void
   * @param {string} reason - Reason for voiding
   * @returns {Object} Void result
   */
  static async voidAdjustment(adjustmentId, reason) {
    try {
      const adjustment = await BillingAdjustment.findById(adjustmentId);
      if (!adjustment) {
        throw new Error('Adjustment not found');
      }
      
      if (adjustment.status !== 'PENDING') {
        throw new Error('Can only void pending adjustments');
      }
      
      adjustment.status = 'VOIDED';
      adjustment.voided_at = new Date();
      adjustment.void_reason = reason;
      
      await adjustment.save();
      
      return {
        success: true,
        adjustment_id: adjustmentId,
        voided_at: adjustment.voided_at,
        reason: reason
      };
      
    } catch (error) {
      throw new Error(`Adjustment void failed: ${error.message}`);
    }
  }
  
  /**
   * Process all pending adjustments for a subscription
   * @param {string} subscriptionId - Target subscription
   * @returns {Object} Processing results
   */
  static async processPendingAdjustments(subscriptionId) {
    try {
      const pendingAdjustments = await BillingAdjustment.find({
        subscription_id: subscriptionId,
        status: 'PENDING',
        effective_date: { $lte: new Date() }
      });
      
      const subscription = await BillingSubscription.findById(subscriptionId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }
      
      const results = [];
      
      for (const adjustment of pendingAdjustments) {
        try {
          // Create journal entry
          const journalEntry = await JournalEntry.createAdjustmentEntry(adjustment, subscription);
          await journalEntry.save();
          await journalEntry.post();
          
          // Mark as applied
          adjustment.status = 'APPLIED';
          adjustment.applied_at = new Date();
          await adjustment.save();
          
          results.push({
            adjustment_id: adjustment._id,
            amount_cents: adjustment.amount_cents,
            status: 'SUCCESS'
          });
          
        } catch (error) {
          results.push({
            adjustment_id: adjustment._id,
            error: error.message,
            status: 'FAILED'
          });
        }
      }
      
      return {
        success: true,
        processed_count: pendingAdjustments.length,
        results: results
      };
      
    } catch (error) {
      throw new Error(`Pending adjustments processing failed: ${error.message}`);
    }
  }
}

module.exports = AdjustmentService;