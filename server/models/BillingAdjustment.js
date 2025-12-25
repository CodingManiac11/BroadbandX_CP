// DEPRECATED: This model is part of the complex billing system that's not being used
// The app uses simpler models instead
// Keeping this file for reference but commenting out to prevent collection creation

/*
const mongoose = require('mongoose');

/**
 * Billing Adjustments Model
 * Credits, charges, and other adjustments applied to subscriptions
 */
/*
const billingAdjustmentSchema = new mongoose.Schema({
  // Reference to the subscription
  subscription_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BillingSubscription',
    required: true,
    index: true
  },
  
  // Adjustment amount in cents (positive for charges, negative for credits)
  amount_cents: {
    type: Number,
    required: true,
    validate: {
      validator: Number.isInteger,
      message: 'Adjustment amount must be an integer (cents)'
    }
  },
  
  // Type of adjustment
  adjustment_type: {
    type: String,
    enum: [
      'proration_charge',    // Upgrade proration charge
      'proration_credit',    // Downgrade proration credit
      'cancellation_credit', // Cancellation refund credit
      'manual_adjustment',   // Admin manual adjustment
      'termination_fee',     // Early termination fee
      'discount',            // Promotional discount
      'tax_adjustment',      // Tax correction
      'other'               // Other adjustments
    ],
    required: true
  },
  
  // Human-readable reason for the adjustment
  reason: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  
  // Reference to plan change that caused this adjustment (if applicable)
  related_plan_change_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlanHistory',
    default: null
  },
  
  // When the adjustment was created (UTC)
  created_at: {
    type: Date,
    default: Date.now,
    immutable: true,
    index: true
  },
  
  // Invoice this adjustment was applied to (null if not yet applied)
  applied_to_invoice_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BillingInvoice',
    default: null
  },
  
  // When this adjustment was applied to an invoice (UTC)
  applied_at: {
    type: Date,
    default: null
  },
  
  // Status of the adjustment
  status: {
    type: String,
    enum: ['pending', 'applied', 'cancelled'],
    default: 'pending',
    index: true
  },
  
  // Idempotency key for preventing duplicate adjustments
  idempotency_key: {
    type: String,
    sparse: true,
    index: true
  },
  
  // User who created this adjustment (for audit)
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Additional metadata
  metadata: {
    // Original billing period for proration adjustments
    billing_period: {
      start: Date,
      end: Date,
      days: Number
    },
    
    // Proration calculation details
    proration_details: {
      days_used: Number,
      total_days: Number,
      daily_rate_cents: Number,
      formula: String
    },
    
    // Other metadata
    notes: String,
    external_reference: String
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  collection: 'billing_adjustments'
});

// Compound indexes for performance
billingAdjustmentSchema.index({ subscription_id: 1, status: 1, created_at: -1 });
billingAdjustmentSchema.index({ status: 1, created_at: 1 });
billingAdjustmentSchema.index({ applied_to_invoice_id: 1 });
billingAdjustmentSchema.index({ idempotency_key: 1 }, {
  sparse: true,
  unique: true,
  partialFilterExpression: { idempotency_key: { $exists: true } }
});

// Virtual for formatted amount
billingAdjustmentSchema.virtual('formatted_amount').get(function() {
  const amount = Math.abs(this.amount_cents) / 100;
  const sign = this.amount_cents >= 0 ? '+' : '-';
  return `${sign}₹${amount.toFixed(2)}`;
});

// Instance method to check if adjustment is a credit
billingAdjustmentSchema.methods.isCredit = function() {
  return this.amount_cents < 0;
};

// Instance method to check if adjustment is a charge
billingAdjustmentSchema.methods.isCharge = function() {
  return this.amount_cents > 0;
};

// Instance method to apply adjustment to an invoice
billingAdjustmentSchema.methods.applyToInvoice = function(invoiceId) {
  if (this.status !== 'pending') {
    throw new Error(`Cannot apply adjustment with status: ${this.status}`);
  }
  
  this.applied_to_invoice_id = invoiceId;
  this.applied_at = new Date();
  this.status = 'applied';
  
  return this.save();
};

// Static method to find pending adjustments for a subscription
billingAdjustmentSchema.statics.findPending = function(subscriptionId) {
  return this.find({
    subscription_id: subscriptionId,
    status: 'pending'
  }).sort({ created_at: 1 });
};

// Static method to find adjustments in a date range
billingAdjustmentSchema.statics.findInDateRange = function(subscriptionId, startDate, endDate) {
  return this.find({
    subscription_id: subscriptionId,
    created_at: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ created_at: 1 });
};

// Static method to calculate total pending credits for a subscription
billingAdjustmentSchema.statics.getTotalPendingCredits = async function(subscriptionId) {
  const result = await this.aggregate([
    {
      $match: {
        subscription_id: mongoose.Types.ObjectId(subscriptionId),
        status: 'pending',
        amount_cents: { $lt: 0 } // Credits only
      }
    },
    {
      $group: {
        _id: null,
        total_credits_cents: { $sum: '$amount_cents' }
      }
    }
  ]);
  
  return result.length > 0 ? Math.abs(result[0].total_credits_cents) : 0;
};

// Static method to calculate total pending charges for a subscription
billingAdjustmentSchema.statics.getTotalPendingCharges = async function(subscriptionId) {
  const result = await this.aggregate([
    {
      $match: {
        subscription_id: mongoose.Types.ObjectId(subscriptionId),
        status: 'pending',
        amount_cents: { $gt: 0 } // Charges only
      }
    },
    {
      $group: {
        _id: null,
        total_charges_cents: { $sum: '$amount_cents' }
      }
    }
  ]);
  
  return result.length > 0 ? result[0].total_charges_cents : 0;
};

// Pre-save middleware to validate amount
billingAdjustmentSchema.pre('save', function(next) {
  // Ensure amount is non-zero
  if (this.amount_cents === 0) {
    return next(new Error('Adjustment amount cannot be zero'));
  }
  
  // Validate that applied status has invoice reference
  if (this.status === 'applied' && !this.applied_to_invoice_id) {
    return next(new Error('Applied adjustments must have an invoice reference'));
  }
  
  next();
});

// Pre-update middleware to prevent modification of applied adjustments
billingAdjustmentSchema.pre('findOneAndUpdate', function(next) {
  // Prevent modification of applied adjustments
  this.getQuery().status = { $ne: 'applied' };
  next();
});

// Instance method to create a cancellation credit for subscription termination
billingAdjustmentSchema.statics.createCancellationCredit = function(subscriptionId, unusedDaysCredit, reason) {
  return new this({
    subscription_id: subscriptionId,
    amount_cents: -Math.abs(unusedDaysCredit), // Ensure it's negative (credit)
    adjustment_type: 'cancellation_credit',
    reason: reason || 'Credit for unused subscription days',
    metadata: {
      notes: 'Generated automatically on subscription cancellation'
    }
  });
};

// Instance method to create a proration adjustment
billingAdjustmentSchema.statics.createProrationAdjustment = function(subscriptionId, prorationAmount, isUpgrade, planChangeId, billingPeriod) {
  return new this({
    subscription_id: subscriptionId,
    amount_cents: prorationAmount,
    adjustment_type: isUpgrade ? 'proration_charge' : 'proration_credit',
    reason: isUpgrade ? 
      'Prorated charge for plan upgrade' : 
      'Prorated credit for plan downgrade',
    related_plan_change_id: planChangeId,
    metadata: {
      billing_period: billingPeriod,
      notes: `Plan change ${isUpgrade ? 'upgrade' : 'downgrade'} proration`
    }
  });
};

// module.exports = mongoose.model('BillingAdjustment', billingAdjustmentSchema);
*/

// Placeholder export to prevent import errors
module.exports = {};