const mongoose = require('mongoose');

const BillingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    required: false // Made optional for payments without subscriptions
  },
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue', 'failed', 'cancelled'],
    default: 'pending'
  },
  dueDate: {
    type: Date,
    required: true
  },
  billingPeriod: {
    start: {
      type: Date,
      required: true
    },
    end: {
      type: Date,
      required: true
    }
  },
  items: [{
    description: String,
    amount: Number,
    quantity: Number,
    total: Number
  }],
  subtotal: {
    type: Number,
    required: true
  },
  tax: {
    type: Number,
    required: true
  },
  discount: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: {
      type: String,
      enum: ['credit_card', 'debit_card', 'bank_transfer', 'other'],
      required: true
    },
    last4: String,
    cardBrand: String,
    expiryMonth: Number,
    expiryYear: Number
  },
  paymentDate: {
    type: Date
  },
  transactionId: {
    type: String
  },
  invoicePdf: {
    type: String  // URL to stored PDF
  },
  notes: {
    type: String
  },
  remindersSent: [{
    type: Date
  }],
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

// Generate invoice number before saving
BillingSchema.pre('save', async function(next) {
  if (this.isNew) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    // Find the latest invoice number for the current month
    const latestInvoice = await this.constructor.findOne({
      invoiceNumber: new RegExp(`^INV-${year}${month}-`)
    }).sort({ invoiceNumber: -1 });

    let sequence = 1;
    if (latestInvoice) {
      sequence = parseInt(latestInvoice.invoiceNumber.split('-')[2]) + 1;
    }

    this.invoiceNumber = `INV-${year}${month}-${String(sequence).padStart(4, '0')}`;
  }
  next();
});

// Index for efficient queries
BillingSchema.index({ user: 1, status: 1 });
BillingSchema.index({ invoiceNumber: 1 }, { unique: true });
BillingSchema.index({ dueDate: 1, status: 1 });

module.exports = mongoose.model('Billing', BillingSchema);