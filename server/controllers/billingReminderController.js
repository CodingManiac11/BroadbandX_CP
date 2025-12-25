const BillingReminder = require('../models/BillingReminder');
const Subscription = require('../models/Subscription');
const emailService = require('../services/emailService');
const asyncHandler = require('../middleware/async');
const { emitToUser } = require('../utils/realTimeEvents');

// @desc    Create billing reminder
// @route   POST /api/billing-reminders
// @access  Private/Admin
exports.createReminder = asyncHandler(async (req, res) => {
  const { user, subscription, type, dueDate, amount, reminderLevel } = req.body;
  
  const reminder = await BillingReminder.create({
    user,
    subscription,
    type,
    dueDate,
    amount,
    reminderLevel
  });
  
  await reminder.populate('user', 'name email');
  await reminder.populate('subscription', 'plan status');
  
  res.status(201).json({
    success: true,
    data: reminder
  });
});

// @desc    Get user's reminders
// @route   GET /api/billing-reminders/my-reminders
// @access  Private
exports.getMyReminders = asyncHandler(async (req, res) => {
  const { status } = req.query;
  
  const reminders = await BillingReminder.getUserReminders(req.user.id, status);
  
  res.status(200).json({
    success: true,
    count: reminders.length,
    data: reminders
  });
});

// @desc    Get all reminders (Admin)
// @route   GET /api/billing-reminders/admin/all
// @access  Private/Admin
exports.getAllReminders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, type } = req.query;
  
  const query = {};
  if (status) query.status = status;
  if (type) query.type = type;
  
  const reminders = await BillingReminder.find(query)
    .populate('user', 'name email phone')
    .populate('subscription', 'plan status endDate')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort('-dueDate');
  
  const count = await BillingReminder.countDocuments(query);
  
  res.status(200).json({
    success: true,
    count,
    data: reminders,
    totalPages: Math.ceil(count / limit),
    currentPage: page
  });
});

// @desc    Get pending reminders (Admin)
// @route   GET /api/billing-reminders/admin/pending
// @access  Private/Admin
exports.getPendingReminders = asyncHandler(async (req, res) => {
  const reminders = await BillingReminder.getPendingReminders();
  
  res.status(200).json({
    success: true,
    count: reminders.length,
    data: reminders
  });
});

// @desc    Send reminder
// @route   POST /api/billing-reminders/:id/send
// @access  Private/Admin
exports.sendReminder = asyncHandler(async (req, res) => {
  const reminder = await BillingReminder.findById(req.params.id)
    .populate('user', 'name email phone')
    .populate('subscription', 'plan status endDate');
  
  if (!reminder) {
    return res.status(404).json({
      success: false,
      error: 'Reminder not found'
    });
  }
  
  try {
    // Send email reminder
    await emailService.sendBillingReminder(reminder.user, {
      type: reminder.type,
      dueDate: reminder.dueDate,
      amount: reminder.amount,
      reminderLevel: reminder.reminderLevel,
      subscription: reminder.subscription
    });
    
    await reminder.markAsSent(['email']);
    
    // Send real-time notification
    emitToUser(reminder.user._id, 'billing:reminder', {
      id: reminder._id,
      type: reminder.type,
      dueDate: reminder.dueDate,
      amount: reminder.amount,
      message: `Payment of ₹${reminder.amount} is due on ${new Date(reminder.dueDate).toLocaleDateString()}`
    });
    
    res.status(200).json({
      success: true,
      message: 'Reminder sent successfully',
      data: reminder
    });
  } catch (error) {
    // Log error but don't fail the request
    console.error('Failed to send reminder:', error);
    
    // Record error and retry
    reminder.metadata.error = error.message;
    await reminder.retry();
    
    res.status(500).json({
      success: false,
      error: 'Failed to send reminder',
      details: error.message
    });
  }
});

// @desc    Acknowledge reminder
// @route   PUT /api/billing-reminders/:id/acknowledge
// @access  Private
exports.acknowledgeReminder = asyncHandler(async (req, res) => {
  const reminder = await BillingReminder.findById(req.params.id);
  
  if (!reminder) {
    return res.status(404).json({
      success: false,
      error: 'Reminder not found'
    });
  }
  
  // Verify user owns this reminder
  if (reminder.user.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to acknowledge this reminder'
    });
  }
  
  await reminder.acknowledge();
  
  res.status(200).json({
    success: true,
    message: 'Reminder acknowledged',
    data: reminder
  });
});

// @desc    Resolve reminder
// @route   PUT /api/billing-reminders/:id/resolve
// @access  Private/Admin
exports.resolveReminder = asyncHandler(async (req, res) => {
  const { resolution } = req.body;
  
  const reminder = await BillingReminder.findById(req.params.id);
  
  if (!reminder) {
    return res.status(404).json({
      success: false,
      error: 'Reminder not found'
    });
  }
  
  await reminder.resolve(resolution);
  
  res.status(200).json({
    success: true,
    message: 'Reminder resolved',
    data: reminder
  });
});

// @desc    Cancel reminders for subscription
// @route   DELETE /api/billing-reminders/subscription/:subscriptionId
// @access  Private/Admin
exports.cancelRemindersForSubscription = asyncHandler(async (req, res) => {
  const result = await BillingReminder.cancelForSubscription(req.params.subscriptionId);
  
  res.status(200).json({
    success: true,
    message: 'Reminders cancelled',
    count: result.modifiedCount
  });
});

// @desc    Process pending reminders (cron job)
// @route   POST /api/billing-reminders/admin/process
// @access  Private/Admin
exports.processPendingReminders = asyncHandler(async (req, res) => {
  const pendingReminders = await BillingReminder.getPendingReminders();
  
  const results = {
    total: pendingReminders.length,
    sent: 0,
    failed: 0,
    errors: []
  };
  
  for (const reminder of pendingReminders) {
    try {
      // Send email reminder
      await emailService.sendBillingReminder(reminder.user, {
        type: reminder.type,
        dueDate: reminder.dueDate,
        amount: reminder.amount,
        reminderLevel: reminder.reminderLevel,
        subscription: reminder.subscription
      });
      
      await reminder.markAsSent(['email']);
      
      // Send real-time notification
      emitToUser(reminder.user._id, 'billing:reminder', {
        id: reminder._id,
        type: reminder.type,
        dueDate: reminder.dueDate,
        amount: reminder.amount
      });
      
      results.sent++;
    } catch (error) {
      console.error(`Failed to send reminder ${reminder._id}:`, error);
      
      reminder.metadata.error = error.message;
      await reminder.retry();
      
      results.failed++;
      results.errors.push({
        reminderId: reminder._id,
        error: error.message
      });
    }
  }
  
  res.status(200).json({
    success: true,
    message: 'Pending reminders processed',
    data: results
  });
});

// @desc    Create reminders for expiring subscriptions
// @route   POST /api/billing-reminders/admin/create-for-expiring
// @access  Private/Admin
exports.createRemindersForExpiringSubscriptions = asyncHandler(async (req, res) => {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  // Find subscriptions expiring in the next 30 days
  const expiringSubscriptions = await Subscription.find({
    status: 'active',
    endDate: {
      $gte: now,
      $lte: thirtyDaysFromNow
    }
  }).populate('user', 'name email')
    .populate('plan', 'name price');
  
  const remindersCreated = [];
  
  for (const subscription of expiringSubscriptions) {
    const daysUntilExpiry = Math.ceil((subscription.endDate - now) / (1000 * 60 * 60 * 24));
    
    // Determine reminder level based on days until expiry
    let reminderLevel;
    if (daysUntilExpiry >= 7) {
      reminderLevel = 1; // 7 days before
    } else if (daysUntilExpiry >= 3) {
      reminderLevel = 2; // 3 days before
    } else if (daysUntilExpiry >= 1) {
      reminderLevel = 3; // 1 day before
    } else {
      reminderLevel = 4; // due date
    }
    
    // Check if reminder already exists
    const existingReminder = await BillingReminder.findOne({
      subscription: subscription._id,
      type: 'expiring_soon',
      reminderLevel,
      status: { $in: ['pending', 'sent'] }
    });
    
    if (!existingReminder) {
      const reminder = await BillingReminder.create({
        user: subscription.user._id,
        subscription: subscription._id,
        type: 'expiring_soon',
        dueDate: subscription.endDate,
        amount: subscription.plan.price,
        reminderLevel
      });
      
      remindersCreated.push(reminder);
    }
  }
  
  res.status(201).json({
    success: true,
    message: `Created ${remindersCreated.length} reminders for expiring subscriptions`,
    count: remindersCreated.length,
    data: remindersCreated
  });
});
