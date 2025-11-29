const mongoose = require('mongoose');

/**
 * Invoice Line Items Model
 * Individual line items within an invoice - immutable once invoice is finalized
 */
const invoiceLineItemSchema = new mongoose.Schema({
  // Reference to the parent invoice
  invoice_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BillingInvoice',
    required: true,
    index: true
  },
  
  // Line item number within the invoice (for ordering)
  line_number: {
    type: Number,
    required: true,
    min: 1
  },
  
  // Type of line item
  item_type: {
    type: String,
    enum: [
      'SUBSCRIPTION',        // Base subscription charge
      'PRORATION',          // Prorated charges/credits
      'ADJUSTMENT',         // Manual adjustments
      'USAGE',              // Usage-based charges
      'ONE_TIME',           // One-time charges
      'DISCOUNT',           // Discounts or promotions
      'TAX',                // Tax line items
      'FEE'                 // Additional fees
    ],
    required: true,
    index: true
  },
  
  // Description of the line item
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  
  // Detailed breakdown for complex items
  description_details: {
    period_start: Date,
    period_end: Date,
    plan_name: String,
    proration_days: Number,
    total_period_days: Number,
    rate_per_day_cents: Number,
    quantity: Number,
    unit_price_cents: Number
  },
  
  // Quantity (for usage-based or multi-unit items)
  quantity: {
    type: Number,
    required: true,
    default: 1,
    min: 0
  },
  
  // Unit price in integer cents
  unit_price_cents: {
    type: Number,
    required: true,
    validate: {
      validator: Number.isInteger,
      message: 'Unit price must be an integer (cents)'
    }
  },
  
  // Total amount for this line item in integer cents
  total_cents: {
    type: Number,
    required: true,
    validate: {
      validator: Number.isInteger,
      message: 'Total must be an integer (cents)'
    }
  },
  
  // Whether this line item is taxable
  taxable: {
    type: Boolean,
    default: true
  },
  
  // Tax amount for this line item (if taxable)
  tax_cents: {
    type: Number,
    required: true,
    default: 0,
    validate: {
      validator: Number.isInteger,
      message: 'Tax amount must be an integer (cents)'
    }
  },
  
  // References to related entities
  subscription_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BillingSubscription',
    default: null
  },
  
  plan_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BillingPlan',
    default: null
  },
  
  adjustment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BillingAdjustment',
    default: null
  },
  
  // Period covered by this line item (for subscription/usage items)
  period_start: {
    type: Date,
    default: null,
    validate: {
      validator: function(date) {
        if (!date) return true;
        const utcDate = new Date(date);
        return utcDate.getUTCHours() === 0 && 
               utcDate.getUTCMinutes() === 0 && 
               utcDate.getUTCSeconds() === 0 &&
               utcDate.getUTCMilliseconds() === 0;
      },
      message: 'Period start must be UTC midnight'
    }
  },
  
  period_end: {
    type: Date,
    default: null,
    validate: {
      validator: function(date) {
        if (!date) return true;
        const utcDate = new Date(date);
        return utcDate.getUTCHours() === 0 && 
               utcDate.getUTCMinutes() === 0 && 
               utcDate.getUTCSeconds() === 0 &&
               utcDate.getUTCMilliseconds() === 0;
      },
      message: 'Period end must be UTC midnight'
    }
  },
  
  // Metadata for additional line item properties
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Audit timestamps
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
  collection: 'invoice_line_items'
});

// Compound indexes for performance
invoiceLineItemSchema.index({ invoice_id: 1, line_number: 1 }, { unique: true });
invoiceLineItemSchema.index({ invoice_id: 1, item_type: 1 });
invoiceLineItemSchema.index({ subscription_id: 1, period_start: -1 });
invoiceLineItemSchema.index({ item_type: 1, created_at: -1 });

// Virtual for formatted amounts
invoiceLineItemSchema.virtual('unit_price_formatted').get(function() {
  return `₹${(this.unit_price_cents / 100).toFixed(2)}`;
});

invoiceLineItemSchema.virtual('total_formatted').get(function() {
  return `₹${(this.total_cents / 100).toFixed(2)}`;
});

invoiceLineItemSchema.virtual('tax_formatted').get(function() {
  return `₹${(this.tax_cents / 100).toFixed(2)}`;
});

// Virtual for period length in days
invoiceLineItemSchema.virtual('period_days').get(function() {
  if (!this.period_start || !this.period_end) return null;
  const start = new Date(this.period_start);
  const end = new Date(this.period_end);
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
});

// Virtual for detailed description with period info
invoiceLineItemSchema.virtual('detailed_description').get(function() {
  let desc = this.description;
  
  if (this.period_start && this.period_end) {
    const startDate = this.period_start.toISOString().split('T')[0];
    const endDate = new Date(this.period_end.getTime() - 1).toISOString().split('T')[0];
    desc += ` (${startDate} to ${endDate})`;
  }
  
  if (this.description_details?.proration_days && this.description_details?.total_period_days) {
    const proratedDays = this.description_details.proration_days;
    const totalDays = this.description_details.total_period_days;
    desc += ` - ${proratedDays}/${totalDays} days`;
  }
  
  return desc;
});

// Instance method to check if line item is a credit (negative amount)
invoiceLineItemSchema.methods.isCredit = function() {
  return this.total_cents < 0;
};

// Instance method to check if line item is for a specific period
invoiceLineItemSchema.methods.isForPeriod = function(startDate, endDate) {
  if (!this.period_start || !this.period_end) return false;
  
  return this.period_start >= startDate && this.period_end <= endDate;
};

// Static method to create subscription line item
invoiceLineItemSchema.statics.createSubscriptionItem = function(invoiceId, lineNumber, subscription, plan, periodStart, periodEnd) {
  const periodDays = Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24));
  const monthlyDays = 30; // Standard monthly billing cycle
  
  // Calculate prorated amount
  const fullMonthlyAmount = plan.monthly_price_cents;
  const proratedAmount = Math.round((fullMonthlyAmount * periodDays) / monthlyDays);
  
  return new this({
    invoice_id: invoiceId,
    line_number: lineNumber,
    item_type: 'SUBSCRIPTION',
    description: `${plan.name} subscription`,
    description_details: {
      period_start: periodStart,
      period_end: periodEnd,
      plan_name: plan.name,
      proration_days: periodDays,
      total_period_days: monthlyDays,
      rate_per_day_cents: Math.round(fullMonthlyAmount / monthlyDays)
    },
    quantity: 1,
    unit_price_cents: proratedAmount,
    total_cents: proratedAmount,
    subscription_id: subscription._id,
    plan_id: plan._id,
    period_start: periodStart,
    period_end: periodEnd,
    taxable: plan.taxable || true
  });
};

// Static method to create proration line item
invoiceLineItemSchema.statics.createProrationItem = function(invoiceId, lineNumber, adjustment) {
  return new this({
    invoice_id: invoiceId,
    line_number: lineNumber,
    item_type: 'PRORATION',
    description: adjustment.description || 'Proration adjustment',
    description_details: adjustment.metadata?.proration_details || {},
    quantity: 1,
    unit_price_cents: adjustment.amount_cents,
    total_cents: adjustment.amount_cents,
    subscription_id: adjustment.subscription_id,
    adjustment_id: adjustment._id,
    period_start: adjustment.metadata?.period_start || null,
    period_end: adjustment.metadata?.period_end || null,
    taxable: adjustment.taxable || false
  });
};

// Static method to create adjustment line item
invoiceLineItemSchema.statics.createAdjustmentItem = function(invoiceId, lineNumber, adjustment) {
  return new this({
    invoice_id: invoiceId,
    line_number: lineNumber,
    item_type: 'ADJUSTMENT',
    description: adjustment.description,
    quantity: 1,
    unit_price_cents: adjustment.amount_cents,
    total_cents: adjustment.amount_cents,
    subscription_id: adjustment.subscription_id,
    adjustment_id: adjustment._id,
    taxable: adjustment.taxable || false
  });
};

// Static method to get line items by invoice with populated references
invoiceLineItemSchema.statics.getByInvoice = function(invoiceId) {
  return this.find({ invoice_id: invoiceId })
    .sort({ line_number: 1 })
    .populate('subscription_id', 'customer_id')
    .populate('plan_id', 'name description')
    .populate('adjustment_id', 'adjustment_type reason');
};

// Static method to calculate totals for an invoice
invoiceLineItemSchema.statics.calculateInvoiceTotals = async function(invoiceId, taxPercentage = 0) {
  const lineItems = await this.find({ invoice_id: invoiceId });
  
  let subtotalCents = 0;
  let taxCents = 0;
  
  for (const item of lineItems) {
    subtotalCents += item.total_cents;
    
    if (item.taxable && taxPercentage > 0) {
      const itemTax = Math.round((item.total_cents * taxPercentage) / 100);
      taxCents += itemTax;
    }
  }
  
  return {
    subtotal_cents: subtotalCents,
    tax_cents: taxCents,
    total_cents: subtotalCents + taxCents,
    line_item_count: lineItems.length
  };
};

// Pre-save middleware for validation
invoiceLineItemSchema.pre('save', function(next) {
  // Validate total calculation
  const expectedTotal = this.quantity * this.unit_price_cents;
  if (Math.abs(this.total_cents - expectedTotal) > 1) { // Allow 1 cent rounding difference
    return next(new Error('Total cents must equal quantity × unit price (within 1 cent rounding tolerance)'));
  }
  
  // Validate period dates if both are provided
  if (this.period_start && this.period_end && this.period_end <= this.period_start) {
    return next(new Error('Period end must be after period start'));
  }
  
  // Validate line number is positive
  if (this.line_number < 1) {
    return next(new Error('Line number must be positive'));
  }
  
  next();
});

// Pre-remove middleware to prevent deletion of finalized invoice line items
invoiceLineItemSchema.pre('deleteOne', async function(next) {
  const lineItem = await this.model.findOne(this.getQuery());
  if (!lineItem) return next();
  
  const invoice = await mongoose.model('BillingInvoice').findById(lineItem.invoice_id);
  if (invoice && invoice.isImmutable()) {
    return next(new Error('Cannot delete line items from finalized invoice'));
  }
  
  next();
});

module.exports = mongoose.model('InvoiceLineItem', invoiceLineItemSchema);