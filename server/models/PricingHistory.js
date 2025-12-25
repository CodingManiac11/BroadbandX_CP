// DEPRECATED: This model is part of the complex billing system that's not being used
// Keeping this file for reference but commenting out to prevent collection creation

/*
const mongoose = require('mongoose');

const pricingHistorySchema = new mongoose.Schema({
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: true
  },
  proposedPrice: {
    type: Number,
    required: true,
    min: [0, 'Proposed price must be positive']
  },
  finalPrice: {
    type: Number,
    required: true,
    min: [0, 'Final price must be positive']
  },
  previousPrice: {
    type: Number,
    required: true
  },
  priceChangePercentage: {
    type: Number,
    default: 0
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approved: {
    type: Boolean,
    default: false
  },
  approvalDate: {
    type: Date
  },
  mlRecommendation: {
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    factors: [{
      factor: String,
      weight: Number,
      impact: String // 'positive', 'negative', 'neutral'
    }],
    modelVersion: String
  },
  marketConditions: {
    competitorPrices: [Number],
    demandLevel: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    seasonality: String
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'implemented'],
    default: 'pending'
  },
  implementedAt: Date,
  reason: String,
  notes: String
}, {
  timestamps: true
});

// Indexes for efficient querying
pricingHistorySchema.index({ planId: 1, createdAt: -1 });
pricingHistorySchema.index({ approvedBy: 1 });
pricingHistorySchema.index({ status: 1 });

// Calculate price change percentage before saving
pricingHistorySchema.pre('save', function(next) {
  if (this.previousPrice && this.finalPrice) {
    this.priceChangePercentage = ((this.finalPrice - this.previousPrice) / this.previousPrice) * 100;
  }
  next();
});

// Virtual for price change direction
pricingHistorySchema.virtual('priceChangeDirection').get(function() {
  if (this.priceChangePercentage > 0) return 'increase';
  if (this.priceChangePercentage < 0) return 'decrease';
  return 'no-change';
});

// module.exports = mongoose.model('PricingHistory', pricingHistorySchema);
*/

// Placeholder export to prevent import errors
module.exports = {};