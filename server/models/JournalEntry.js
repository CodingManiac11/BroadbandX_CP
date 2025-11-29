const mongoose = require('mongoose');

/**
 * Journal Entries Model
 * Double-entry bookkeeping for all billing transactions
 * Immutable once posted for audit compliance
 */
const journalEntrySchema = new mongoose.Schema({
  // Journal entry number (sequential, human-readable)
  entry_number: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Entry type for categorization
  entry_type: {
    type: String,
    enum: [
      'SUBSCRIPTION_CHARGE',    // Monthly subscription billing
      'PRORATION',             // Plan change prorations
      'ADJUSTMENT',            // Manual adjustments
      'PAYMENT_RECEIVED',      // Customer payments
      'REFUND_ISSUED',         // Refunds to customers
      'TAX_CHARGE',            // Tax collection
      'DISCOUNT_APPLIED',      // Discounts and credits
      'WRITE_OFF',             // Bad debt write-offs
      'CORRECTION'             // Accounting corrections
    ],
    required: true,
    index: true
  },
  
  // Transaction date (business date, not necessarily creation date)
  transaction_date: {
    type: Date,
    required: true,
    index: true,
    validate: {
      validator: function(date) {
        const utcDate = new Date(date);
        return utcDate.getUTCHours() === 0 && 
               utcDate.getUTCMinutes() === 0 && 
               utcDate.getUTCSeconds() === 0 &&
               utcDate.getUTCMilliseconds() === 0;
      },
      message: 'Transaction date must be UTC midnight'
    }
  },
  
  // Description of the transaction
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  
  // Reference to related entities
  invoice_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BillingInvoice',
    default: null,
    index: true
  },
  
  subscription_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BillingSubscription',
    default: null,
    index: true
  },
  
  adjustment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BillingAdjustment',
    default: null
  },
  
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Entry status
  status: {
    type: String,
    enum: ['DRAFT', 'POSTED', 'REVERSED'],
    default: 'DRAFT',
    index: true
  },
  
  // When the entry was posted (becomes immutable)
  posted_at: {
    type: Date,
    default: null
  },
  
  // Reference to the reversing entry (if this entry was reversed)
  reversed_by_entry_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JournalEntry',
    default: null
  },
  
  // Reference to the original entry (if this is a reversing entry)
  reverses_entry_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JournalEntry',
    default: null
  },
  
  // Individual line items (debits and credits)
  line_items: [{
    // Account code/name
    account: {
      type: String,
      required: true,
      enum: [
        'ACCOUNTS_RECEIVABLE',     // Customer owes money
        'REVENUE_SUBSCRIPTION',    // Subscription revenue
        'REVENUE_ADJUSTMENT',      // Adjustment revenue
        'TAX_PAYABLE',            // Sales tax owed
        'CASH',                   // Cash received
        'DEFERRED_REVENUE',       // Prepaid subscriptions
        'DISCOUNT_EXPENSE',       // Discounts given
        'BAD_DEBT_EXPENSE',       // Uncollectible receivables
        'REFUNDS_PAYABLE'         // Refunds owed to customers
      ]
    },
    
    // Account description for this transaction
    account_description: {
      type: String,
      required: true
    },
    
    // Debit amount in integer cents (positive values only)
    debit_cents: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Debit amount must be an integer (cents)'
      }
    },
    
    // Credit amount in integer cents (positive values only)
    credit_cents: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Credit amount must be an integer (cents)'
      }
    },
    
    // Line-level metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  }],
  
  // Metadata for additional transaction properties
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
  collection: 'journal_entries'
});

// Indexes for performance and reporting
journalEntrySchema.index({ transaction_date: -1, status: 1 });
journalEntrySchema.index({ customer_id: 1, transaction_date: -1 });
journalEntrySchema.index({ entry_type: 1, transaction_date: -1 });
journalEntrySchema.index({ invoice_id: 1 });
journalEntrySchema.index({ subscription_id: 1, transaction_date: -1 });
journalEntrySchema.index({ 'line_items.account': 1, transaction_date: -1 });

// Virtual for total debits
journalEntrySchema.virtual('total_debits_cents').get(function() {
  return this.line_items.reduce((sum, item) => sum + item.debit_cents, 0);
});

// Virtual for total credits
journalEntrySchema.virtual('total_credits_cents').get(function() {
  return this.line_items.reduce((sum, item) => sum + item.credit_cents, 0);
});

// Virtual to check if entry is balanced
journalEntrySchema.virtual('is_balanced').get(function() {
  return this.total_debits_cents === this.total_credits_cents;
});

// Virtual for formatted totals
journalEntrySchema.virtual('total_debits_formatted').get(function() {
  return `₹${(this.total_debits_cents / 100).toFixed(2)}`;
});

journalEntrySchema.virtual('total_credits_formatted').get(function() {
  return `₹${(this.total_credits_cents / 100).toFixed(2)}`;
});

// Instance method to check if entry is immutable
journalEntrySchema.methods.isImmutable = function() {
  return this.status === 'POSTED' || this.status === 'REVERSED';
};

// Instance method to post the entry
journalEntrySchema.methods.post = async function() {
  if (this.isImmutable()) {
    throw new Error(`Cannot post entry with status: ${this.status}`);
  }
  
  if (!this.is_balanced) {
    throw new Error('Cannot post unbalanced journal entry');
  }
  
  if (this.line_items.length === 0) {
    throw new Error('Cannot post journal entry without line items');
  }
  
  this.status = 'POSTED';
  this.posted_at = new Date();
  
  return this.save();
};

// Instance method to reverse the entry
journalEntrySchema.methods.reverse = async function(description = 'Reversal entry') {
  if (this.status !== 'POSTED') {
    throw new Error('Can only reverse posted entries');
  }
  
  if (this.reversed_by_entry_id) {
    throw new Error('Entry has already been reversed');
  }
  
  // Create reversing entry with opposite debits/credits
  const reversingLineItems = this.line_items.map(item => ({
    account: item.account,
    account_description: `REVERSAL: ${item.account_description}`,
    debit_cents: item.credit_cents,  // Flip debit and credit
    credit_cents: item.debit_cents,
    metadata: { ...item.metadata, is_reversal: true }
  }));
  
  const nextEntryNumber = await this.constructor.generateEntryNumber();
  
  const reversingEntry = new this.constructor({
    entry_number: nextEntryNumber,
    entry_type: 'CORRECTION',
    transaction_date: new Date(new Date().setUTCHours(0, 0, 0, 0)),
    description: description,
    invoice_id: this.invoice_id,
    subscription_id: this.subscription_id,
    adjustment_id: this.adjustment_id,
    customer_id: this.customer_id,
    reverses_entry_id: this._id,
    line_items: reversingLineItems,
    metadata: { ...this.metadata, is_reversal: true }
  });
  
  await reversingEntry.save();
  await reversingEntry.post();
  
  // Mark this entry as reversed
  this.status = 'REVERSED';
  this.reversed_by_entry_id = reversingEntry._id;
  await this.save();
  
  return reversingEntry;
};

// Static method to generate next entry number
journalEntrySchema.statics.generateEntryNumber = async function() {
  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  const prefix = `JE-${currentYear}${currentMonth}-`;
  
  // Find the highest entry number for current month
  const lastEntry = await this.findOne({
    entry_number: { $regex: `^${prefix}` }
  }).sort({ entry_number: -1 });
  
  let nextNumber = 1;
  if (lastEntry) {
    const lastNumber = parseInt(lastEntry.entry_number.replace(prefix, ''));
    nextNumber = lastNumber + 1;
  }
  
  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
};

// Static method to create subscription billing entry
journalEntrySchema.statics.createSubscriptionBillingEntry = async function(invoice, subscription) {
  const entryNumber = await this.generateEntryNumber();
  
  return new this({
    entry_number: entryNumber,
    entry_type: 'SUBSCRIPTION_CHARGE',
    transaction_date: new Date(invoice.issued_at || new Date()).setUTCHours(0, 0, 0, 0),
    description: `Subscription billing - Invoice ${invoice.invoice_number}`,
    invoice_id: invoice._id,
    subscription_id: subscription._id,
    customer_id: subscription.customer_id,
    line_items: [
      {
        account: 'ACCOUNTS_RECEIVABLE',
        account_description: `Customer receivable - ${invoice.customer_info.name}`,
        debit_cents: invoice.total_cents,
        credit_cents: 0
      },
      {
        account: 'REVENUE_SUBSCRIPTION',
        account_description: `Subscription revenue - ${subscription.current_plan_name}`,
        debit_cents: 0,
        credit_cents: invoice.subtotal_cents
      },
      ...(invoice.tax_cents > 0 ? [{
        account: 'TAX_PAYABLE',
        account_description: `Sales tax collected - ${invoice.tax_percentage}%`,
        debit_cents: 0,
        credit_cents: invoice.tax_cents
      }] : [])
    ]
  });
};

// Static method to create payment received entry
journalEntrySchema.statics.createPaymentReceivedEntry = async function(invoice, paymentAmount, paymentReference) {
  const entryNumber = await this.generateEntryNumber();
  
  return new this({
    entry_number: entryNumber,
    entry_type: 'PAYMENT_RECEIVED',
    transaction_date: new Date().setUTCHours(0, 0, 0, 0),
    description: `Payment received - Invoice ${invoice.invoice_number}`,
    invoice_id: invoice._id,
    subscription_id: invoice.subscription_id,
    customer_id: invoice.customer_info.user_id,
    line_items: [
      {
        account: 'CASH',
        account_description: `Cash received - ${paymentReference}`,
        debit_cents: paymentAmount,
        credit_cents: 0,
        metadata: { payment_reference: paymentReference }
      },
      {
        account: 'ACCOUNTS_RECEIVABLE',
        account_description: `Customer payment - ${invoice.customer_info.name}`,
        debit_cents: 0,
        credit_cents: paymentAmount
      }
    ]
  });
};

// Static method to create adjustment entry
journalEntrySchema.statics.createAdjustmentEntry = async function(adjustment, subscription) {
  const entryNumber = await this.generateEntryNumber();
  const isCredit = adjustment.amount_cents < 0;
  const absoluteAmount = Math.abs(adjustment.amount_cents);
  
  return new this({
    entry_number: entryNumber,
    entry_type: 'ADJUSTMENT',
    transaction_date: new Date().setUTCHours(0, 0, 0, 0),
    description: adjustment.description,
    subscription_id: subscription._id,
    adjustment_id: adjustment._id,
    customer_id: subscription.customer_id,
    line_items: isCredit ? [
      {
        account: 'REVENUE_ADJUSTMENT',
        account_description: `Adjustment credit - ${adjustment.reason}`,
        debit_cents: absoluteAmount,
        credit_cents: 0
      },
      {
        account: 'ACCOUNTS_RECEIVABLE',
        account_description: `Customer credit adjustment`,
        debit_cents: 0,
        credit_cents: absoluteAmount
      }
    ] : [
      {
        account: 'ACCOUNTS_RECEIVABLE',
        account_description: `Customer charge adjustment`,
        debit_cents: absoluteAmount,
        credit_cents: 0
      },
      {
        account: 'REVENUE_ADJUSTMENT',
        account_description: `Adjustment charge - ${adjustment.reason}`,
        debit_cents: 0,
        credit_cents: absoluteAmount
      }
    ]
  });
};

// Static method to get trial balance for date range
journalEntrySchema.statics.getTrialBalance = async function(startDate, endDate) {
  const entries = await this.find({
    status: 'POSTED',
    transaction_date: { $gte: startDate, $lte: endDate }
  });
  
  const balances = {};
  
  entries.forEach(entry => {
    entry.line_items.forEach(item => {
      if (!balances[item.account]) {
        balances[item.account] = { debit_cents: 0, credit_cents: 0 };
      }
      balances[item.account].debit_cents += item.debit_cents;
      balances[item.account].credit_cents += item.credit_cents;
    });
  });
  
  return balances;
};

// Pre-save middleware for validation
journalEntrySchema.pre('save', function(next) {
  // Validate that each line item has either debit or credit (but not both)
  for (const item of this.line_items) {
    if (item.debit_cents > 0 && item.credit_cents > 0) {
      return next(new Error('Line item cannot have both debit and credit amounts'));
    }
    if (item.debit_cents === 0 && item.credit_cents === 0) {
      return next(new Error('Line item must have either debit or credit amount'));
    }
  }
  
  // Validate that entry is balanced
  if (this.line_items.length > 0 && !this.is_balanced) {
    return next(new Error('Journal entry must be balanced (total debits = total credits)'));
  }
  
  // Prevent modification of posted entries (except for reversal fields)
  if (!this.isNew && this.isImmutable()) {
    const allowedUpdates = ['status', 'reversed_by_entry_id'];
    const modifiedPaths = this.modifiedPaths();
    const invalidUpdates = modifiedPaths.filter(path => !allowedUpdates.includes(path));
    
    if (invalidUpdates.length > 0) {
      return next(new Error(`Cannot modify posted journal entry. Invalid fields: ${invalidUpdates.join(', ')}`));
    }
  }
  
  next();
});

module.exports = mongoose.model('JournalEntry', journalEntrySchema);