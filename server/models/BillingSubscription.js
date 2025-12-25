// DEPRECATED: This model is not being used by the application
// The app uses the simpler Subscription.js model instead
// Keeping this file for reference but commenting out to prevent collection creation

/*
const mongoose = require('mongoose');

/**
 * Billing Subscriptions Model
 * Tracks customer subscriptions with billing cycle anchor and plan history
 */
/*
const billingSubscriptionSchema = new mongoose.Schema({
  // Reference to the user
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Current active billing plan
  current_plan_id: {
    type: String,
    ref: 'BillingPlan',
    required: true
  },
  
  // Billing cycle anchor date (UTC) - determines when bills are generated
  // All future billing periods are calculated from this anchor
  billing_cycle_anchor: {
    type: Date,
    required: true,
    validate: {
      validator: function(date) {
        // Ensure anchor date is normalized to UTC midnight
        const utcDate = new Date(date);
        return utcDate.getUTCHours() === 0 && 
               utcDate.getUTCMinutes() === 0 && 
               utcDate.getUTCSeconds() === 0 &&
               utcDate.getUTCMilliseconds() === 0;
      },
      message: 'Billing cycle anchor must be UTC midnight'
    }
  },
  
  // Subscription status
  status: {
    type: String,
    enum: ['active', 'cancelled', 'suspended', 'expired'],
    default: 'active',
    index: true
  },
  
  // Cancellation details
  cancellation: {
    requested_at: {
      type: Date,
      default: null
    },
    effective_at: {
      type: Date,
      default: null
    },
    mode: {
      type: String,
      enum: ['immediate', 'end_of_cycle'],
      default: null
    },
    reason: {
      type: String,
      default: null
    }
  },
  
  // Last plan change timestamp for auditing
  last_plan_change_ts: {
    type: Date,
    default: null
  },
  
  // Auto-renewal settings
  auto_renew_enabled: {
    type: Boolean,
    default: true
  },
  
  // Next billing date (calculated field, updated on plan changes)
  next_billing_date: {
    type: Date,
    required: true
  },
  
  // Subscription metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Audit timestamps (UTC)
  created_at: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  collection: 'billing_subscriptions'
});

// Compound indexes for performance
billingSubscriptionSchema.index({ user_id: 1, status: 1 });
billingSubscriptionSchema.index({ status: 1, next_billing_date: 1 });
billingSubscriptionSchema.index({ billing_cycle_anchor: 1 });
billingSubscriptionSchema.index({ current_plan_id: 1, status: 1 });

// Virtual for current billing period calculation
billingSubscriptionSchema.virtual('current_billing_period').get(function() {
  const now = new Date();
  const anchor = new Date(this.billing_cycle_anchor);
  
  // Calculate the current billing period start based on anchor
  const currentPeriodStart = new Date(anchor);
  while (currentPeriodStart <= now) {
    currentPeriodStart.setUTCMonth(currentPeriodStart.getUTCMonth() + 1);
  }
  currentPeriodStart.setUTCMonth(currentPeriodStart.getUTCMonth() - 1);
  
  // Calculate period end (one month later)
  const currentPeriodEnd = new Date(currentPeriodStart);
  currentPeriodEnd.setUTCMonth(currentPeriodEnd.getUTCMonth() + 1);
  
  return {
    start: currentPeriodStart,
    end: currentPeriodEnd,
    days: Math.ceil((currentPeriodEnd - currentPeriodStart) / (1000 * 60 * 60 * 24))
  };
});

// Instance method to calculate next billing period
billingSubscriptionSchema.methods.getNextBillingPeriod = function() {
  const current = this.current_billing_period;
  const nextStart = new Date(current.end);
  const nextEnd = new Date(nextStart);
  nextEnd.setUTCMonth(nextEnd.getUTCMonth() + 1);
  
  return {
    start: nextStart,
    end: nextEnd,
    days: Math.ceil((nextEnd - nextStart) / (1000 * 60 * 60 * 24))
  };
};

// Instance method to check if subscription is active
billingSubscriptionSchema.methods.isActive = function() {
  return this.status === 'active' && new Date() < this.next_billing_date;
};

// Static method to find subscriptions due for billing
billingSubscriptionSchema.statics.findDueForBilling = function(date = new Date()) {
  return this.find({
    status: 'active',
    next_billing_date: { $lte: date }
  }).populate('current_plan_id');
};

// Pre-save middleware to ensure dates are UTC normalized
billingSubscriptionSchema.pre('save', function(next) {
  // Normalize billing cycle anchor to UTC midnight
  if (this.billing_cycle_anchor) {
    const anchor = new Date(this.billing_cycle_anchor);
    anchor.setUTCHours(0, 0, 0, 0);
    this.billing_cycle_anchor = anchor;
  }
  
  // Update next billing date if plan changed
  if (this.isModified('current_plan_id') || this.isModified('billing_cycle_anchor')) {
    const period = this.current_billing_period;
    this.next_billing_date = period.end;
  }
  
  next();
});

// Post-save middleware for audit logging
billingSubscriptionSchema.post('save', function(doc, next) {
  if (this.wasNew) {
    console.log(`New subscription created: ${doc._id} for user ${doc.user_id}`);
  }
  next();
});

// module.exports = mongoose.model('BillingSubscription', billingSubscriptionSchema);
*/

// Use the simpler Subscription model instead:
module.exports = require('./Subscription');