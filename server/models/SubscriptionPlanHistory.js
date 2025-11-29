const mongoose = require('mongoose');

/**
 * Subscription Plan History Model
 * Immutable audit trail of all plan changes for reconciliation and compliance
 */
const subscriptionPlanHistorySchema = new mongoose.Schema({
  // Reference to the subscription
  subscription_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BillingSubscription',
    required: true,
    index: true
  },
  
  // Previous plan (null for initial subscription)
  old_plan_id: {
    type: String,
    ref: 'BillingPlan',
    default: null
  },
  
  // New plan
  new_plan_id: {
    type: String,
    ref: 'BillingPlan',
    required: true
  },
  
  // When the change was requested (UTC)
  change_ts: {
    type: Date,
    required: true,
    default: Date.now,
    immutable: true
  },
  
  // When the change becomes effective (UTC)
  effective_from: {
    type: Date,
    required: true,
    validate: {
      validator: function(date) {
        // Ensure effective date is normalized to UTC midnight
        const utcDate = new Date(date);
        return utcDate.getUTCHours() === 0 && 
               utcDate.getUTCMinutes() === 0 && 
               utcDate.getUTCSeconds() === 0 &&
               utcDate.getUTCMilliseconds() === 0;
      },
      message: 'Effective date must be UTC midnight'
    }
  },
  
  // When the change period ends (UTC, null for current active plan)
  effective_to: {
    type: Date,
    default: null,
    validate: {
      validator: function(date) {
        if (!date) return true; // null is allowed
        // Ensure end date is normalized to UTC midnight
        const utcDate = new Date(date);
        return utcDate.getUTCHours() === 0 && 
               utcDate.getUTCMinutes() === 0 && 
               utcDate.getUTCSeconds() === 0 &&
               utcDate.getUTCMilliseconds() === 0;
      },
      message: 'Effective end date must be UTC midnight'
    }
  },
  
  // Type of change for audit purposes
  change_type: {
    type: String,
    enum: ['initial', 'upgrade', 'downgrade', 'cancellation', 'reactivation'],
    required: true
  },
  
  // Proration details for this change
  proration: {
    // Days used in the old plan
    days_used: {
      type: Number,
      min: 0,
      default: 0
    },
    
    // Total days in the billing period
    total_days: {
      type: Number,
      min: 1,
      default: 30
    },
    
    // Prorated amount in cents (positive for charges, negative for credits)
    amount_cents: {
      type: Number,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Proration amount must be an integer (cents)'
      }
    },
    
    // Calculation details for audit
    calculation: {
      old_monthly_price_cents: Number,
      new_monthly_price_cents: Number,
      proration_formula: String
    }
  },
  
  // Idempotency key for preventing duplicate changes
  idempotency_key: {
    type: String,
    sparse: true,
    index: true
  },
  
  // User who initiated the change (for audit)
  changed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Additional metadata for the change
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Immutable creation timestamp
  created_at: {
    type: Date,
    default: Date.now,
    immutable: true
  }
}, {
  collection: 'subscription_plan_history'
});

// Compound indexes for performance and uniqueness
subscriptionPlanHistorySchema.index({ subscription_id: 1, change_ts: -1 });
subscriptionPlanHistorySchema.index({ subscription_id: 1, effective_from: 1 });
subscriptionPlanHistorySchema.index({ change_type: 1, change_ts: -1 });
subscriptionPlanHistorySchema.index({ idempotency_key: 1 }, { 
  sparse: true,
  unique: true,
  partialFilterExpression: { idempotency_key: { $exists: true } }
});

// Validate that effective_to is after effective_from
subscriptionPlanHistorySchema.pre('validate', function(next) {
  if (this.effective_to && this.effective_from && this.effective_to <= this.effective_from) {
    return next(new Error('effective_to must be after effective_from'));
  }
  next();
});

// Instance method to calculate days in the change period
subscriptionPlanHistorySchema.methods.getDaysInPeriod = function() {
  if (!this.effective_to) {
    // Current active period, calculate from effective_from to now
    const now = new Date();
    const start = new Date(this.effective_from);
    return Math.ceil((now - start) / (1000 * 60 * 60 * 24));
  } else {
    // Completed period
    const start = new Date(this.effective_from);
    const end = new Date(this.effective_to);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  }
};

// Static method to find plan changes in a billing period
subscriptionPlanHistorySchema.statics.findInBillingPeriod = function(subscriptionId, periodStart, periodEnd) {
  return this.find({
    subscription_id: subscriptionId,
    $or: [
      {
        // Change started in this period
        effective_from: {
          $gte: periodStart,
          $lt: periodEnd
        }
      },
      {
        // Change was active during this period
        effective_from: { $lt: periodStart },
        $or: [
          { effective_to: null }, // Still active
          { effective_to: { $gt: periodStart } } // Ended after period start
        ]
      }
    ]
  }).sort({ effective_from: 1 });
};

// Static method to find the current active plan for a subscription
subscriptionPlanHistorySchema.statics.findCurrentPlan = function(subscriptionId) {
  return this.findOne({
    subscription_id: subscriptionId,
    effective_to: null
  }).populate('new_plan_id');
};

// Instance method to format change summary
subscriptionPlanHistorySchema.methods.getChangeSummary = function() {
  return {
    type: this.change_type,
    from_plan: this.old_plan_id,
    to_plan: this.new_plan_id,
    effective_date: this.effective_from.toISOString().split('T')[0],
    proration_amount: this.proration.amount_cents ? 
      `${this.proration.amount_cents > 0 ? '+' : ''}₹${(this.proration.amount_cents / 100).toFixed(2)}` : 
      '₹0.00'
  };
};

// Pre-save middleware to set change_type based on plan prices
subscriptionPlanHistorySchema.pre('save', async function(next) {
  if (this.isNew && this.old_plan_id && this.new_plan_id) {
    try {
      const BillingPlan = mongoose.model('BillingPlan');
      const [oldPlan, newPlan] = await Promise.all([
        BillingPlan.findOne({ plan_id: this.old_plan_id }),
        BillingPlan.findOne({ plan_id: this.new_plan_id })
      ]);
      
      if (oldPlan && newPlan) {
        if (newPlan.monthly_price_cents > oldPlan.monthly_price_cents) {
          this.change_type = 'upgrade';
        } else if (newPlan.monthly_price_cents < oldPlan.monthly_price_cents) {
          this.change_type = 'downgrade';
        }
        
        // Store price information for audit
        this.proration.calculation = {
          old_monthly_price_cents: oldPlan.monthly_price_cents,
          new_monthly_price_cents: newPlan.monthly_price_cents
        };
      }
    } catch (error) {
      return next(error);
    }
  }
  
  next();
});

module.exports = mongoose.model('SubscriptionPlanHistory', subscriptionPlanHistorySchema);