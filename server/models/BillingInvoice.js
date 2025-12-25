// DEPRECATED: This model is not being used by the application
// The app uses the simpler Billing.js model instead
// Keeping this file for reference but commenting out to prevent collection creation

/*
const mongoose = require('mongoose');

/**
 * Billing Invoices Model
 * Immutable invoices once finalized
 */
/*
const billingInvoiceSchema = new mongoose.Schema({
  // Reference to the subscription
  subscription_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BillingSubscription',
    required: true,
    index: true
  },
  
  // Invoice number (human-readable, sequential)
  invoice_number: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Billing period covered by this invoice (UTC dates normalized to midnight)
  period_start: {
    type: Date,
    required: true,
    validate: {
      validator: function(date) {
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
    required: true,
    validate: {
      validator: function(date) {
        const utcDate = new Date(date);
        return utcDate.getUTCHours() === 0 && 
               utcDate.getUTCMinutes() === 0 && 
               utcDate.getUTCSeconds() === 0 &&
               utcDate.getUTCMilliseconds() === 0;
      },
      message: 'Period end must be UTC midnight'
    }
  },
  
  // Financial totals in integer cents
  subtotal_cents: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: Number.isInteger,
      message: 'Subtotal must be an integer (cents)'
    }
  },
  
  tax_cents: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: Number.isInteger,
      message: 'Tax must be an integer (cents)'
    }
  },
  
  total_cents: {
    type: Number,
    required: true,
    validate: {
      validator: Number.isInteger,
      message: 'Total must be an integer (cents)'
    }
  },
  
  // Tax percentage used for this invoice (stored for audit)
  tax_percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  
  // Invoice status - once FINAL, invoice becomes immutable
  status: {
    type: String,
    enum: ['DRAFT', 'FINAL', 'PAID', 'CANCELLED'],
    default: 'DRAFT',
    index: true
  },
  
  // When the invoice was issued (when status changed to FINAL)
  issued_at: {
    type: Date,
    default: null,
    index: true
  },
  
  // Due date for payment
  due_date: {
    type: Date,
    required: true
  },
  
  // When the invoice was paid (if applicable)
  paid_at: {
    type: Date,
    default: null
  },
  
  // Payment reference/transaction ID
  payment_reference: {
    type: String,
    default: null
  },
  
  // Customer information snapshot at time of invoice creation
  customer_info: {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    billing_address: {
      street: String,
      city: String,
      state: String,
      postal_code: String,
      country: String
    }
  },
  
  // Company information for invoice header
  company_info: {
    name: {
      type: String,
      default: 'BroadbandX'
    },
    address: {
      street: String,
      city: String,
      state: String,
      postal_code: String,
      country: String
    },
    tax_id: String,
    phone: String,
    email: String
  },
  
  // Invoice notes and terms
  notes: {
    type: String,
    default: 'Thank you for your business. Charges are prorated based on actual usage days in the billing period.'
  },
  
  payment_terms: {
    type: String,
    default: 'Payment due within 30 days of invoice date'
  },
  
  // Metadata for additional invoice properties
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
  collection: 'billing_invoices'
});

// Compound indexes for performance
billingInvoiceSchema.index({ subscription_id: 1, period_start: -1 });
billingInvoiceSchema.index({ status: 1, issued_at: -1 });
billingInvoiceSchema.index({ 'customer_info.user_id': 1, issued_at: -1 });
billingInvoiceSchema.index({ due_date: 1, status: 1 });
billingInvoiceSchema.index({ period_start: 1, period_end: 1 });

// Virtual for formatted amounts
billingInvoiceSchema.virtual('subtotal_formatted').get(function() {
  return `₹${(this.subtotal_cents / 100).toFixed(2)}`;
});

billingInvoiceSchema.virtual('tax_formatted').get(function() {
  return `₹${(this.tax_cents / 100).toFixed(2)}`;
});

billingInvoiceSchema.virtual('total_formatted').get(function() {
  return `₹${(this.total_cents / 100).toFixed(2)}`;
});

// Virtual for billing period in days
billingInvoiceSchema.virtual('period_days').get(function() {
  const start = new Date(this.period_start);
  const end = new Date(this.period_end);
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
});

// Instance method to check if invoice is immutable
billingInvoiceSchema.methods.isImmutable = function() {
  return this.status === 'FINAL' || this.status === 'PAID' || this.status === 'CANCELLED';
};

// Instance method to finalize invoice
billingInvoiceSchema.methods.finalize = function() {
  if (this.isImmutable()) {
    throw new Error(`Cannot finalize invoice with status: ${this.status}`);
  }
  
  this.status = 'FINAL';
  this.issued_at = new Date();
  
  return this.save();
};

// Instance method to mark as paid
billingInvoiceSchema.methods.markAsPaid = function(paymentReference = null) {
  if (this.status !== 'FINAL') {
    throw new Error(`Cannot mark invoice as paid with status: ${this.status}`);
  }
  
  this.status = 'PAID';
  this.paid_at = new Date();
  if (paymentReference) {
    this.payment_reference = paymentReference;
  }
  
  return this.save();
};

// Static method to generate next invoice number
billingInvoiceSchema.statics.generateInvoiceNumber = async function() {
  const currentYear = new Date().getFullYear();
  const prefix = `INV-${currentYear}-`;
  
  // Find the highest invoice number for current year
  const lastInvoice = await this.findOne({
    invoice_number: { $regex: `^${prefix}` }
  }).sort({ invoice_number: -1 });
  
  let nextNumber = 1;
  if (lastInvoice) {
    const lastNumber = parseInt(lastInvoice.invoice_number.replace(prefix, ''));
    nextNumber = lastNumber + 1;
  }
  
  return `${prefix}${nextNumber.toString().padStart(6, '0')}`;
};

// Static method to find invoices in date range
billingInvoiceSchema.statics.findInDateRange = function(startDate, endDate, options = {}) {
  const query = {
    issued_at: {
      $gte: startDate,
      $lte: endDate
    }
  };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.subscriptionId) {
    query.subscription_id = options.subscriptionId;
  }
  
  return this.find(query).sort({ issued_at: -1 });
};

// Static method to calculate revenue in date range
billingInvoiceSchema.statics.calculateRevenue = async function(startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        status: 'PAID',
        paid_at: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: null,
        total_revenue_cents: { $sum: '$total_cents' },
        total_tax_cents: { $sum: '$tax_cents' },
        invoice_count: { $sum: 1 }
      }
    }
  ]);
  
  return result.length > 0 ? result[0] : {
    total_revenue_cents: 0,
    total_tax_cents: 0,
    invoice_count: 0
  };
};

// Pre-save middleware to prevent modification of finalized invoices
billingInvoiceSchema.pre('save', function(next) {
  if (!this.isNew && this.isImmutable()) {
    // Allow only specific fields to be updated on immutable invoices
    const allowedUpdates = ['paid_at', 'payment_reference', 'status'];
    const modifiedPaths = this.modifiedPaths();
    const invalidUpdates = modifiedPaths.filter(path => !allowedUpdates.includes(path));
    
    if (invalidUpdates.length > 0) {
      return next(new Error(`Cannot modify finalized invoice. Invalid fields: ${invalidUpdates.join(', ')}`));
    }
  }
  
  // Validate period dates
  if (this.period_end <= this.period_start) {
    return next(new Error('Period end must be after period start'));
  }
  
  // Validate totals calculation
  if (this.subtotal_cents + this.tax_cents !== this.total_cents) {
    return next(new Error('Total must equal subtotal plus tax'));
  }
  
  next();
});

// Pre-update middleware to prevent updates to finalized invoices
billingInvoiceSchema.pre('findOneAndUpdate', function(next) {
  // Only allow status updates on finalized invoices
  this.getUpdate().$set = this.getUpdate().$set || {};
  
  // Check if trying to update a finalized invoice
  if (this.getQuery().status && ['FINAL', 'PAID', 'CANCELLED'].includes(this.getQuery().status)) {
    const allowedUpdates = ['status', 'paid_at', 'payment_reference'];
    const updates = Object.keys(this.getUpdate().$set);
    const invalidUpdates = updates.filter(field => !allowedUpdates.includes(field));
    
    if (invalidUpdates.length > 0) {
      return next(new Error(`Cannot modify finalized invoice. Invalid fields: ${invalidUpdates.join(', ')}`));
    }
  }
  
  next();
});

// module.exports = mongoose.model('BillingInvoice', billingInvoiceSchema);
*/

// Use the simpler Billing model instead:
module.exports = require('./Billing');