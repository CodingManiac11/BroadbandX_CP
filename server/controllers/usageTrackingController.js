const UsageTracking = require('../models/UsageTracking');
const Subscription = require('../models/Subscription');
const emailService = require('../services/emailService');
const asyncHandler = require('../middleware/async');
const { emitToUser } = require('../utils/realTimeEvents');

// @desc    Record usage data
// @route   POST /api/usage-tracking/record
// @access  Private
exports.recordUsage = asyncHandler(async (req, res) => {
  const { dataUsed, uploadData, downloadData, speed, sessionDuration } = req.body;
  
  // Get user's active subscription
  const subscription = await Subscription.findOne({
    user: req.user.id,
    status: 'active'
  }).populate('plan');
  
  if (!subscription) {
    return res.status(404).json({
      success: false,
      error: 'No active subscription found'
    });
  }
  
  // Get or create current period usage
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  
  let usage = await UsageTracking.findOne({
    user: req.user.id,
    subscription: subscription._id,
    periodStart: { $lte: now },
    periodEnd: { $gte: now }
  });
  
  if (!usage) {
    // Create new usage record for this period
    usage = new UsageTracking({
      user: req.user.id,
      subscription: subscription._id,
      periodStart: startOfMonth,
      periodEnd: endOfMonth,
      dataUsed: 0,
      uploadData: 0,
      downloadData: 0,
      dailyUsage: []
    });
  }
  
  // Update usage data
  usage.dataUsed += dataUsed || 0;
  usage.uploadData += (uploadData || 0);
  usage.downloadData += (downloadData || 0);
  usage.totalSessions += 1;
  usage.totalDuration += (sessionDuration || 0);
  
  // Update speed metrics
  if (speed) {
    usage.averageSpeed = ((usage.averageSpeed * (usage.totalSessions - 1)) + speed) / usage.totalSessions;
    if (speed > usage.peakSpeed) {
      usage.peakSpeed = speed;
    }
  }
  
  // Update daily usage
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dailyEntry = usage.dailyUsage.find(entry => 
    new Date(entry.date).getTime() === today.getTime()
  );
  
  if (dailyEntry) {
    dailyEntry.dataUsed += dataUsed || 0;
    dailyEntry.upload += uploadData || 0;
    dailyEntry.download += downloadData || 0;
    dailyEntry.sessions += 1;
    if (speed) {
      dailyEntry.avgSpeed = ((dailyEntry.avgSpeed * (dailyEntry.sessions - 1)) + speed) / dailyEntry.sessions;
    }
  } else {
    usage.dailyUsage.push({
      date: today,
      dataUsed: dataUsed || 0,
      upload: uploadData || 0,
      download: downloadData || 0,
      sessions: 1,
      avgSpeed: speed || 0
    });
  }
  
  await usage.save();
  await usage.populate('subscription');
  
  // Check and send usage alerts
  const dataLimit = subscription.plan.dataLimit || 0;
  const usagePercent = dataLimit > 0 ? (usage.dataUsed / dataLimit) * 100 : 0;
  
  // Check for 80%, 90%, 100% thresholds
  const thresholds = [80, 90, 100];
  for (const threshold of thresholds) {
    if (usagePercent >= threshold && usage.shouldSendAlert(threshold)) {
      usage.recordAlert(`${threshold}_percent`);
      
      // Send alert email
      try {
        await emailService.sendUsageAlertEmail(req.user, {
          threshold,
          dataUsed: usage.dataUsed,
          dataLimit,
          usagePercent: usagePercent.toFixed(2)
        });
      } catch (error) {
        console.error('Failed to send usage alert email:', error);
      }
      
      // Emit real-time alert
      emitToUser(req.user.id, 'usage:alert', {
        type: `${threshold}_percent`,
        dataUsed: usage.dataUsed,
        dataLimit,
        usagePercent: usagePercent.toFixed(2),
        message: `You have used ${usagePercent.toFixed(0)}% of your data limit`
      });
    }
  }
  
  await usage.save();
  
  res.status(200).json({
    success: true,
    data: usage
  });
});

// @desc    Get current usage
// @route   GET /api/usage-tracking/current
// @access  Private
exports.getCurrentUsage = asyncHandler(async (req, res) => {
  const usage = await UsageTracking.getCurrentUsage(req.user.id);
  
  if (!usage) {
    return res.status(404).json({
      success: false,
      error: 'No usage data found for current period'
    });
  }
  
  await usage.populate('subscription');
  
  // Calculate usage percentage
  const dataLimit = usage.subscription?.plan?.dataLimit || 0;
  const usagePercent = dataLimit > 0 ? (usage.dataUsed / dataLimit) * 100 : 0;
  
  res.status(200).json({
    success: true,
    data: {
      ...usage.toObject(),
      usagePercentage: usagePercent.toFixed(2),
      dataLimit,
      remainingData: Math.max(0, dataLimit - usage.dataUsed)
    }
  });
});

// @desc    Get usage history
// @route   GET /api/usage-tracking/history
// @access  Private
exports.getUsageHistory = asyncHandler(async (req, res) => {
  const { months = 6 } = req.query;
  
  const history = await UsageTracking.getUsageHistory(req.user.id, parseInt(months));
  
  res.status(200).json({
    success: true,
    count: history.length,
    data: history
  });
});

// @desc    Get usage statistics
// @route   GET /api/usage-tracking/stats
// @access  Private
exports.getUsageStats = asyncHandler(async (req, res) => {
  const { period = 'month' } = req.query;
  
  const now = new Date();
  let startDate;
  
  switch (period) {
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  
  const usageRecords = await UsageTracking.find({
    user: req.user.id,
    periodStart: { $gte: startDate }
  }).populate('subscription');
  
  // Calculate aggregate stats
  const stats = {
    totalDataUsed: 0,
    totalUpload: 0,
    totalDownload: 0,
    averageSpeed: 0,
    peakSpeed: 0,
    totalSessions: 0,
    totalDuration: 0,
    dailyAverage: 0
  };
  
  usageRecords.forEach(record => {
    stats.totalDataUsed += record.dataUsed;
    stats.totalUpload += record.uploadData;
    stats.totalDownload += record.downloadData;
    stats.totalSessions += record.totalSessions;
    stats.totalDuration += record.totalDuration;
    if (record.peakSpeed > stats.peakSpeed) {
      stats.peakSpeed = record.peakSpeed;
    }
  });
  
  if (usageRecords.length > 0) {
    stats.averageSpeed = usageRecords.reduce((sum, r) => sum + r.averageSpeed, 0) / usageRecords.length;
    const days = Math.max(1, Math.ceil((now - startDate) / (1000 * 60 * 60 * 24)));
    stats.dailyAverage = stats.totalDataUsed / days;
  }
  
  res.status(200).json({
    success: true,
    period,
    data: stats
  });
});

// @desc    Get daily usage breakdown
// @route   GET /api/usage-tracking/daily
// @access  Private
exports.getDailyUsage = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  
  const usage = await UsageTracking.getCurrentUsage(req.user.id);
  
  if (!usage) {
    return res.status(404).json({
      success: false,
      error: 'No usage data found'
    });
  }
  
  // Get last N days
  const dailyData = usage.dailyUsage
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, parseInt(days));
  
  res.status(200).json({
    success: true,
    data: dailyData
  });
});

// @desc    Get all users usage (Admin)
// @route   GET /api/usage-tracking/admin/all
// @access  Private/Admin
exports.getAllUsage = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, status } = req.query;
  
  const query = {};
  
  // Add filters
  if (status === 'fup_reached') {
    query.fupReached = true;
  }
  
  const usageRecords = await UsageTracking.find(query)
    .populate('user', 'name email')
    .populate({
      path: 'subscription',
      populate: {
        path: 'plan',
        select: 'name dataLimit speed'
      }
    })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort('-lastUpdated');
  
  const count = await UsageTracking.countDocuments(query);
  
  res.status(200).json({
    success: true,
    count,
    data: usageRecords,
    totalPages: Math.ceil(count / limit),
    currentPage: page
  });
});

// @desc    Reset user usage (Admin - for testing/corrections)
// @route   PUT /api/usage-tracking/admin/reset/:userId
// @access  Private/Admin
exports.resetUsage = asyncHandler(async (req, res) => {
  const usage = await UsageTracking.findOne({
    user: req.params.userId,
    periodStart: { $lte: new Date() },
    periodEnd: { $gte: new Date() }
  });
  
  if (!usage) {
    return res.status(404).json({
      success: false,
      error: 'No current usage record found'
    });
  }
  
  usage.dataUsed = 0;
  usage.uploadData = 0;
  usage.downloadData = 0;
  usage.fupReached = false;
  usage.fupReachedAt = null;
  usage.alertsSent = [];
  usage.dailyUsage = [];
  
  await usage.save();
  
  res.status(200).json({
    success: true,
    message: 'Usage reset successfully',
    data: usage
  });
});
