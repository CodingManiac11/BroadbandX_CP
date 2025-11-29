const mongoose = require('mongoose');

/**
 * Billing Plans Model
 * All prices stored as integer cents to avoid floating point arithmetic
 */
const billingPlanSchema = new mongoose.Schema({
  // Unique plan identifier
  plan_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Plan name from Excel sheet
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  // Monthly price in integer cents (e.g., $57.65 = 5765 cents)
  monthly_price_cents: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: Number.isInteger,
      message: 'Price must be an integer (cents)'
    }
  },
  
  // Whether auto-renewal is allowed for this plan
  auto_renew_allowed: {
    type: Boolean,
    required: true,
    default: true
  },
  
  // Plan description
  description: {
    type: String,
    default: ''
  },
  
  // Plan status for soft deletion
  status: {
    type: String,
    enum: ['active', 'inactive', 'deprecated'],
    default: 'active'
  },
  
  // Metadata for additional plan properties
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
  collection: 'billing_plans'
});

// Indexes for performance
billingPlanSchema.index({ status: 1, monthly_price_cents: 1 });
billingPlanSchema.index({ name: 1 });

// Virtual for price in dollars (for display purposes only)
billingPlanSchema.virtual('monthly_price_dollars').get(function() {
  return (this.monthly_price_cents / 100).toFixed(2);
});

// Instance method to format price as INR
billingPlanSchema.methods.getFormattedPrice = function() {
  return `₹${(this.monthly_price_cents / 100).toFixed(2)}`;
};

// Static method to find active plans
billingPlanSchema.statics.findActive = function() {
  return this.find({ status: 'active' }).sort({ monthly_price_cents: 1 });
};

// Pre-save middleware to ensure price is integer
billingPlanSchema.pre('save', function(next) {
  if (this.monthly_price_cents && !Number.isInteger(this.monthly_price_cents)) {
    return next(new Error('Price must be stored as integer cents'));
  }
  next();
});

module.exports = mongoose.model('BillingPlan', billingPlanSchema);