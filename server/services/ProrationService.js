/**
 * ProrationService - Deterministic proration calculations
 * Handles all billing proration logic with integer cents and UTC date math
 */

class ProrationService {
  /**
   * Calculate prorated amount for a billing period
   * @param {number} fullAmountCents - Full period amount in cents
   * @param {Date} periodStart - Start of billing period (UTC midnight)
   * @param {Date} periodEnd - End of billing period (UTC midnight)
   * @param {Date} usageStart - Start of actual usage (UTC midnight)
   * @param {Date} usageEnd - End of actual usage (UTC midnight)
   * @returns {Object} Proration calculation details
   */
  static calculateProration(fullAmountCents, periodStart, periodEnd, usageStart, usageEnd) {
    // Validate inputs
    this.validateDates(periodStart, periodEnd, usageStart, usageEnd);
    this.validateAmount(fullAmountCents);
    
    // Calculate total period days
    const totalPeriodDays = this.calculateDaysBetween(periodStart, periodEnd);
    
    // Calculate actual usage days (intersection of usage and billing periods)
    const effectiveStart = new Date(Math.max(periodStart.getTime(), usageStart.getTime()));
    const effectiveEnd = new Date(Math.min(periodEnd.getTime(), usageEnd.getTime()));
    
    // If no overlap, return zero proration
    if (effectiveStart >= effectiveEnd) {
      return {
        prorated_amount_cents: 0,
        total_period_days: totalPeriodDays,
        usage_days: 0,
        rate_per_day_cents: Math.round(fullAmountCents / totalPeriodDays),
        period_start: periodStart,
        period_end: periodEnd,
        usage_start: usageStart,
        usage_end: usageEnd,
        effective_start: null,
        effective_end: null,
        proration_factor: 0
      };
    }
    
    // Calculate usage days
    const usageDays = this.calculateDaysBetween(effectiveStart, effectiveEnd);
    
    // Calculate daily rate and prorated amount
    const ratePerDayCents = Math.round(fullAmountCents / totalPeriodDays);
    const proratedAmountCents = Math.round((fullAmountCents * usageDays) / totalPeriodDays);
    
    return {
      prorated_amount_cents: proratedAmountCents,
      total_period_days: totalPeriodDays,
      usage_days: usageDays,
      rate_per_day_cents: ratePerDayCents,
      period_start: periodStart,
      period_end: periodEnd,
      usage_start: usageStart,
      usage_end: usageEnd,
      effective_start: effectiveStart,
      effective_end: effectiveEnd,
      proration_factor: usageDays / totalPeriodDays
    };
  }
  
  /**
   * Calculate plan change proration
   * @param {Object} oldPlan - Previous billing plan
   * @param {Object} newPlan - New billing plan
   * @param {Date} changeDate - When the change takes effect (UTC midnight)
   * @param {Date} periodStart - Current billing period start
   * @param {Date} periodEnd - Current billing period end
   * @returns {Object} Plan change proration details
   */
  static calculatePlanChangeProration(oldPlan, newPlan, changeDate, periodStart, periodEnd) {
    // Validate inputs
    this.validateDates(periodStart, periodEnd, changeDate, changeDate);
    this.validatePlan(oldPlan);
    this.validatePlan(newPlan);
    
    // Ensure change date is within billing period
    if (changeDate < periodStart || changeDate > periodEnd) {
      throw new Error('Change date must be within the current billing period');
    }
    
    // Calculate old plan credit (unused portion)
    const oldPlanCredit = this.calculateProration(
      oldPlan.monthly_price_cents,
      periodStart,
      periodEnd,
      changeDate, // Credit starts from change date
      periodEnd   // Credit goes to end of period
    );
    
    // Calculate new plan charge (remaining portion)
    const newPlanCharge = this.calculateProration(
      newPlan.monthly_price_cents,
      periodStart,
      periodEnd,
      changeDate, // Charge starts from change date
      periodEnd   // Charge goes to end of period
    );
    
    // Calculate net adjustment
    const netAdjustmentCents = newPlanCharge.prorated_amount_cents - oldPlanCredit.prorated_amount_cents;
    
    return {
      change_date: changeDate,
      period_start: periodStart,
      period_end: periodEnd,
      old_plan: {
        id: oldPlan._id,
        name: oldPlan.name,
        monthly_price_cents: oldPlan.monthly_price_cents,
        credit_calculation: oldPlanCredit
      },
      new_plan: {
        id: newPlan._id,
        name: newPlan.name,
        monthly_price_cents: newPlan.monthly_price_cents,
        charge_calculation: newPlanCharge
      },
      net_adjustment_cents: netAdjustmentCents,
      is_upgrade: netAdjustmentCents > 0,
      is_downgrade: netAdjustmentCents < 0,
      remaining_period_days: newPlanCharge.usage_days
    };
  }
  
  /**
   * Calculate cancellation proration (credit for unused time)
   * @param {Object} plan - Current billing plan
   * @param {Date} cancellationDate - When cancellation takes effect (UTC midnight)
   * @param {Date} periodStart - Current billing period start
   * @param {Date} periodEnd - Current billing period end
   * @returns {Object} Cancellation proration details
   */
  static calculateCancellationProration(plan, cancellationDate, periodStart, periodEnd) {
    // Validate inputs
    this.validateDates(periodStart, periodEnd, cancellationDate, cancellationDate);
    this.validatePlan(plan);
    
    // Ensure cancellation date is within billing period
    if (cancellationDate < periodStart || cancellationDate > periodEnd) {
      throw new Error('Cancellation date must be within the current billing period');
    }
    
    // Calculate credit for unused portion
    const creditCalculation = this.calculateProration(
      plan.monthly_price_cents,
      periodStart,
      periodEnd,
      cancellationDate, // Credit starts from cancellation date
      periodEnd         // Credit goes to end of period
    );
    
    // Calculate used portion (what customer actually used)
    const usedCalculation = this.calculateProration(
      plan.monthly_price_cents,
      periodStart,
      periodEnd,
      periodStart,      // Usage starts from period start
      cancellationDate  // Usage ends at cancellation
    );
    
    return {
      cancellation_date: cancellationDate,
      period_start: periodStart,
      period_end: periodEnd,
      plan: {
        id: plan._id,
        name: plan.name,
        monthly_price_cents: plan.monthly_price_cents
      },
      credit_amount_cents: creditCalculation.prorated_amount_cents,
      used_amount_cents: usedCalculation.prorated_amount_cents,
      credit_calculation: creditCalculation,
      used_calculation: usedCalculation,
      days_used: usedCalculation.usage_days,
      days_credited: creditCalculation.usage_days
    };
  }
  
  /**
   * Calculate days between two UTC dates (inclusive of start, exclusive of end)
   * @param {Date} startDate - Start date (UTC midnight)
   * @param {Date} endDate - End date (UTC midnight)
   * @returns {number} Number of days
   */
  static calculateDaysBetween(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Ensure dates are at UTC midnight
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(0, 0, 0, 0);
    
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  }
  
  /**
   * Get next billing cycle anchor date
   * @param {Date} currentAnchor - Current billing cycle anchor
   * @param {number} monthsToAdd - Number of months to add (default: 1)
   * @returns {Date} Next billing cycle anchor (UTC midnight)
   */
  static getNextBillingAnchor(currentAnchor, monthsToAdd = 1) {
    const nextAnchor = new Date(currentAnchor);
    nextAnchor.setUTCMonth(nextAnchor.getUTCMonth() + monthsToAdd);
    
    // Handle month overflow (e.g., Jan 31 + 1 month should be Feb 28/29, not Mar 3)
    const targetDay = currentAnchor.getUTCDate();
    const actualDay = nextAnchor.getUTCDate();
    
    if (actualDay !== targetDay) {
      // Set to last day of the target month
      nextAnchor.setUTCDate(0); // Go to last day of previous month
    }
    
    // Ensure UTC midnight
    nextAnchor.setUTCHours(0, 0, 0, 0);
    
    return nextAnchor;
  }
  
  /**
   * Get billing period for a given anchor date
   * @param {Date} billingAnchor - Billing cycle anchor date
   * @returns {Object} Billing period with start and end dates
   */
  static getBillingPeriod(billingAnchor) {
    const periodStart = new Date(billingAnchor);
    const periodEnd = this.getNextBillingAnchor(periodStart);
    
    return {
      period_start: periodStart,
      period_end: periodEnd,
      period_days: this.calculateDaysBetween(periodStart, periodEnd)
    };
  }
  
  /**
   * Normalize date to UTC midnight
   * @param {Date} date - Input date
   * @returns {Date} Date normalized to UTC midnight
   */
  static normalizeToUTCMidnight(date) {
    const normalized = new Date(date);
    normalized.setUTCHours(0, 0, 0, 0);
    return normalized;
  }
  
  /**
   * Validate date inputs
   * @private
   */
  static validateDates(periodStart, periodEnd, usageStart, usageEnd) {
    if (!(periodStart instanceof Date) || !(periodEnd instanceof Date) ||
        !(usageStart instanceof Date) || !(usageEnd instanceof Date)) {
      throw new Error('All date parameters must be Date objects');
    }
    
    if (periodEnd <= periodStart) {
      throw new Error('Period end must be after period start');
    }
    
    if (usageEnd <= usageStart) {
      throw new Error('Usage end must be after usage start');
    }
    
    // Validate UTC midnight normalization
    [periodStart, periodEnd, usageStart, usageEnd].forEach(date => {
      if (date.getUTCHours() !== 0 || date.getUTCMinutes() !== 0 ||
          date.getUTCSeconds() !== 0 || date.getUTCMilliseconds() !== 0) {
        throw new Error('All dates must be normalized to UTC midnight');
      }
    });
  }
  
  /**
   * Validate amount input
   * @private
   */
  static validateAmount(amountCents) {
    if (!Number.isInteger(amountCents) || amountCents < 0) {
      throw new Error('Amount must be a non-negative integer (cents)');
    }
  }
  
  /**
   * Validate plan object
   * @private
   */
  static validatePlan(plan) {
    if (!plan || typeof plan !== 'object') {
      throw new Error('Plan must be a valid object');
    }
    
    if (!plan._id) {
      throw new Error('Plan must have an _id');
    }
    
    if (!plan.name || typeof plan.name !== 'string') {
      throw new Error('Plan must have a valid name');
    }
    
    if (!Number.isInteger(plan.monthly_price_cents) || plan.monthly_price_cents < 0) {
      throw new Error('Plan monthly_price_cents must be a non-negative integer');
    }
  }
}

module.exports = ProrationService;