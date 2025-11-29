const mongoose = require('mongoose');

const planRequestSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requestType: {
    type: String,
    enum: ['new_subscription', 'plan_change', 'cancel_subscription', 'plan_upgrade', 'plan_downgrade'],
    required: true
  },
  currentSubscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    required: function() {
      return ['plan_change', 'cancel_subscription', 'plan_upgrade', 'plan_downgrade'].includes(this.requestType);
    }
  },
  requestedPlan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: function() {
      return ['new_subscription', 'plan_change', 'plan_upgrade', 'plan_downgrade'].includes(this.requestType);
    }
  },
  previousPlan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  requestDetails: {
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    reason: {
      type: String,
      maxLength: 500
    },
    urgency: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    }
  },
  pricing: {
    currentAmount: Number,
    newAmount: Number,
    priceDifference: Number,
    prorationAmount: Number,
    refundAmount: Number
  },
  adminAction: {
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    comments: {
      type: String,
      maxLength: 1000
    },
    internalNotes: {
      type: String,
      maxLength: 1000
    }
  },
  customerNotes: {
    type: String,
    maxLength: 500
  },
  documents: [{
    name: String,
    url: String,
    type: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  history: [{
    action: {
      type: String,
      enum: ['submitted', 'reviewed', 'approved', 'rejected', 'cancelled', 'modified']
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    comments: String,
    metadata: mongoose.Schema.Types.Mixed
  }],
  autoApprovalEligible: {
    type: Boolean,
    default: false
  },
  priority: {
    type: Number,
    default: 5,
    min: 1,
    max: 10
  },
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from creation
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for request age in hours
planRequestSchema.virtual('requestAge').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60));
});

// Virtual for time until expiration
planRequestSchema.virtual('timeUntilExpiration').get(function() {
  return Math.max(0, Math.floor((this.expiresAt - Date.now()) / (1000 * 60 * 60)));
});

// Virtual for request summary
planRequestSchema.virtual('summary').get(function() {
  const typeMap = {
    'new_subscription': 'New Subscription Request',
    'plan_change': 'Plan Change Request', 
    'cancel_subscription': 'Cancellation Request',
    'plan_upgrade': 'Plan Upgrade Request',
    'plan_downgrade': 'Plan Downgrade Request'
  };
  return typeMap[this.requestType] || this.requestType;
});

// Index for performance
planRequestSchema.index({ customer: 1, status: 1 });
planRequestSchema.index({ requestType: 1, status: 1 });
planRequestSchema.index({ 'adminAction.reviewedBy': 1 });
planRequestSchema.index({ createdAt: -1 });
planRequestSchema.index({ expiresAt: 1 });

// Method to add history entry
planRequestSchema.methods.addHistoryEntry = function(action, performedBy, comments, metadata) {
  this.history.push({
    action,
    performedBy,
    comments,
    metadata,
    timestamp: new Date()
  });
  return this.save();
};

// Method to approve request
planRequestSchema.methods.approve = function(adminId, comments, internalNotes) {
  this.status = 'approved';
  this.adminAction = {
    reviewedBy: adminId,
    reviewedAt: new Date(),
    comments: comments,
    internalNotes: internalNotes
  };
  
  return this.addHistoryEntry('approved', adminId, comments);
};

// Method to reject request
planRequestSchema.methods.reject = function(adminId, comments, internalNotes) {
  this.status = 'rejected';
  this.adminAction = {
    reviewedBy: adminId,
    reviewedAt: new Date(),
    comments: comments,
    internalNotes: internalNotes
  };
  
  return this.addHistoryEntry('rejected', adminId, comments);
};

// Auto-expire requests
planRequestSchema.methods.checkExpiration = function() {
  if (this.status === 'pending' && this.expiresAt < new Date()) {
    this.status = 'cancelled';
    return this.addHistoryEntry('cancelled', null, 'Request expired after 7 days');
  }
  return Promise.resolve(this);
};

// Static method to get pending requests count
planRequestSchema.statics.getPendingCount = function() {
  return this.countDocuments({ status: 'pending' });
};

// Static method to get requests by priority
planRequestSchema.statics.getByPriority = function(limit = 10) {
  return this.find({ status: 'pending' })
    .sort({ priority: -1, createdAt: 1 })
    .limit(limit)
    .populate('customer', 'firstName lastName email')
    .populate('requestedPlan', 'name pricing category')
    .populate('currentSubscription')
    .populate('previousPlan', 'name pricing');
};

module.exports = mongoose.model('PlanRequest', planRequestSchema);