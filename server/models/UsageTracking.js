const mongoose = require('mongoose');

const UsageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    required: true,
    index: true
  },
  // Usage Data
  dataUsed: {
    type: Number, // in GB
    required: true,
    default: 0,
    min: 0
  },
  uploadData: {
    type: Number, // in GB
    default: 0
  },
  downloadData: {
    type: Number, // in GB
    default: 0
  },
  // Time Period
  periodStart: {
    type: Date,
    required: true,
    index: true
  },
  periodEnd: {
    type: Date,
    required: true
  },
  // Speed Metrics
  averageSpeed: {
    type: Number, // in Mbps
    default: 0
  },
  peakSpeed: {
    type: Number, // in Mbps
    default: 0
  },
  // Session Information
  totalSessions: {
    type: Number,
    default: 0
  },
  totalDuration: {
    type: Number, // in hours
    default: 0
  },
  // Daily Breakdown
  dailyUsage: [{
    date: Date,
    dataUsed: Number,
    upload: Number,
    download: Number,
    sessions: Number,
    avgSpeed: Number
  }],
  // Alerts
  alertsSent: [{
    type: {
      type: String,
      enum: ['80_percent', '90_percent', '100_percent', 'fup_limit']
    },
    sentAt: Date,
    dataUsedAtAlert: Number
  }],
  // FUP Status
  fupReached: {
    type: Boolean,
    default: false
  },
  fupReachedAt: Date,
  // Metadata
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
UsageSchema.index({ user: 1, periodStart: -1 });
UsageSchema.index({ subscription: 1, periodStart: -1 });
UsageSchema.index({ periodStart: 1, periodEnd: 1 });

// Virtual for usage percentage
UsageSchema.virtual('usagePercentage').get(function() {
  if (!this.subscription || !this.subscription.plan) return 0;
  const dataLimit = this.subscription.plan.dataLimit || 0;
  if (dataLimit === 0) return 0;
  return Math.min((this.dataUsed / dataLimit) * 100, 100);
});

// Method to check if alert should be sent
UsageSchema.methods.shouldSendAlert = function(threshold) {
  // Check if alert already sent for this threshold
  const alertType = `${threshold}_percent`;
  const alreadySent = this.alertsSent.some(alert => alert.type === alertType);
  
  if (alreadySent) return false;
  
  // Calculate current usage percentage
  const usagePercent = this.usagePercentage;
  return usagePercent >= threshold;
};

// Method to record alert
UsageSchema.methods.recordAlert = function(type) {
  this.alertsSent.push({
    type,
    sentAt: new Date(),
    dataUsedAtAlert: this.dataUsed
  });
};

// Static method to get user's current usage
UsageSchema.statics.getCurrentUsage = async function(userId) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  return this.findOne({
    user: userId,
    periodStart: { $lte: now },
    periodEnd: { $gte: now }
  }).populate('subscription', 'plan status');
};

// Static method to get usage history
UsageSchema.statics.getUsageHistory = async function(userId, months = 6) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  
  return this.find({
    user: userId,
    periodStart: { $gte: startDate, $lte: endDate }
  }).sort('-periodStart');
};

// Pre-save middleware to check FUP
UsageSchema.pre('save', async function(next) {
  if (this.isModified('dataUsed')) {
    // Populate subscription if not already populated
    if (!this.subscription.plan) {
      await this.populate('subscription');
    }
    
    const dataLimit = this.subscription?.plan?.dataLimit || 0;
    
    if (dataLimit > 0 && this.dataUsed >= dataLimit && !this.fupReached) {
      this.fupReached = true;
      this.fupReachedAt = new Date();
    }
    
    this.lastUpdated = new Date();
  }
  next();
});

module.exports = mongoose.model('UsageTracking', UsageSchema);
