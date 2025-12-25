const mongoose = require('mongoose');

const BillingReminderSchema = new mongoose.Schema({
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
  // Reminder Details
  type: {
    type: String,
    enum: ['renewal', 'overdue', 'expiring_soon', 'payment_failed'],
    required: true
  },
  dueDate: {
    type: Date,
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true
  },
  // Status
  status: {
    type: String,
    enum: ['pending', 'sent', 'acknowledged', 'resolved', 'cancelled'],
    default: 'pending',
    index: true
  },
  // Reminder Schedule
  reminderLevel: {
    type: Number, // 1 = 7 days before, 2 = 3 days before, 3 = 1 day before, 4 = due date, 5 = overdue
    default: 1
  },
  scheduledFor: {
    type: Date,
    required: true,
    index: true
  },
  // Delivery Status
  sentAt: Date,
  sentVia: [{
    type: String,
    enum: ['email', 'sms', 'push', 'in_app']
  }],
  // User Response
  acknowledgedAt: Date,
  resolvedAt: Date,
  resolution: {
    type: String,
    enum: ['paid', 'rescheduled', 'cancelled', 'grace_period']
  },
  // Metadata
  metadata: {
    emailDeliveryStatus: String,
    emailOpenedAt: Date,
    emailClickedAt: Date,
    retryCount: { type: Number, default: 0 },
    lastRetryAt: Date,
    error: String
  }
}, {
  timestamps: true
});

// Compound indexes
BillingReminderSchema.index({ user: 1, dueDate: -1 });
BillingReminderSchema.index({ status: 1, scheduledFor: 1 });
BillingReminderSchema.index({ subscription: 1, type: 1 });

// Method to mark as sent
BillingReminderSchema.methods.markAsSent = function(via = ['email']) {
  this.status = 'sent';
  this.sentAt = new Date();
  this.sentVia = via;
  return this.save();
};

// Method to mark as acknowledged
BillingReminderSchema.methods.acknowledge = function() {
  this.status = 'acknowledged';
  this.acknowledgedAt = new Date();
  return this.save();
};

// Method to resolve
BillingReminderSchema.methods.resolve = function(resolution) {
  this.status = 'resolved';
  this.resolvedAt = new Date();
  this.resolution = resolution;
  return this.save();
};

// Method to retry
BillingReminderSchema.methods.retry = function() {
  this.metadata.retryCount += 1;
  this.metadata.lastRetryAt = new Date();
  return this.save();
};

// Static method to get pending reminders
BillingReminderSchema.statics.getPendingReminders = async function() {
  const now = new Date();
  return this.find({
    status: 'pending',
    scheduledFor: { $lte: now }
  }).populate('user', 'name email phone')
    .populate('subscription', 'plan status endDate');
};

// Static method to get user reminders
BillingReminderSchema.statics.getUserReminders = async function(userId, status = null) {
  const query = { user: userId };
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
    .populate('subscription', 'plan status endDate')
    .sort('-dueDate');
};

// Static method to cancel reminders for subscription
BillingReminderSchema.statics.cancelForSubscription = async function(subscriptionId) {
  return this.updateMany(
    { subscription: subscriptionId, status: 'pending' },
    { $set: { status: 'cancelled' } }
  );
};

// Pre-save middleware
BillingReminderSchema.pre('save', function(next) {
  // Auto-set scheduledFor based on reminder level if not set
  if (this.isNew && !this.scheduledFor && this.dueDate && this.reminderLevel) {
    const daysBeforeDue = {
      1: 7,
      2: 3,
      3: 1,
      4: 0,
      5: -1 // overdue
    };
    
    const daysOffset = daysBeforeDue[this.reminderLevel] || 0;
    this.scheduledFor = new Date(this.dueDate);
    this.scheduledFor.setDate(this.scheduledFor.getDate() - daysOffset);
  }
  
  next();
});

module.exports = mongoose.model('BillingReminder', BillingReminderSchema);
