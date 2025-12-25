const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    required: false // Optional since new plan purchases create subscription after payment
  },
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BillingInvoice'
  },
  // Payment Gateway Details
  razorpayOrderId: {
    type: String,
    required: true,
    unique: true
  },
  razorpayPaymentId: {
    type: String,
    sparse: true
  },
  razorpaySignature: {
    type: String
  },
  // Payment Information
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD']
  },
  status: {
    type: String,
    enum: ['created', 'pending', 'authorized', 'captured', 'failed', 'refunded', 'partial_refund'],
    default: 'created',
    index: true
  },
  // Payment Method
  method: {
    type: String,
    enum: ['card', 'netbanking', 'upi', 'wallet', 'emi', 'cardless_emi']
  },
  bank: String,
  wallet: String,
  vpa: String, // UPI ID
  // Card Details (last 4 digits only)
  cardLast4: String,
  cardNetwork: String,
  cardType: String,
  // Transaction Details
  description: String,
  notes: {
    type: Map,
    of: String
  },
  // Refund Information
  refundAmount: {
    type: Number,
    default: 0
  },
  refundReason: String,
  refundedAt: Date,
  // Failure Information
  errorCode: String,
  errorDescription: String,
  errorReason: String,
  // Metadata
  ipAddress: String,
  userAgent: String,
  attemptCount: {
    type: Number,
    default: 1
  },
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  authorizedAt: Date,
  capturedAt: Date,
  failedAt: Date
}, {
  timestamps: true
});

// Indexes for efficient queries
PaymentSchema.index({ user: 1, createdAt: -1 });
PaymentSchema.index({ subscription: 1, status: 1 });
PaymentSchema.index({ razorpayOrderId: 1 });
PaymentSchema.index({ status: 1, createdAt: -1 });

// Virtual for payment age
PaymentSchema.virtual('paymentAge').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60)); // in minutes
});

// Method to check if payment is successful
PaymentSchema.methods.isSuccessful = function() {
  return this.status === 'captured' || this.status === 'authorized';
};

// Method to check if payment is pending
PaymentSchema.methods.isPending = function() {
  return this.status === 'created' || this.status === 'pending';
};

// Static method to get user payment history
PaymentSchema.statics.getUserPayments = async function(userId, limit = 10) {
  return this.find({ user: userId })
    .sort('-createdAt')
    .limit(limit)
    .populate('subscription', 'plan status')
    .populate('invoice', 'invoiceNumber');
};

// Static method to get payment statistics
PaymentSchema.statics.getPaymentStats = async function(startDate, endDate) {
  const stats = await this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);
  
  return stats;
};

module.exports = mongoose.model('Payment', PaymentSchema);
