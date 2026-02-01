const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const UsageLog = require('../models/UsageLog');
const emailService = require('../services/emailService');
const mongoose = require('mongoose');

// @desc    Get current usage statistics
// @route   GET /api/usage/current/:userId
// @access  Private
exports.getCurrentUsage = asyncHandler(async (req, res) => {
  const userId = req.params.userId || req.user._id || req.user.id;

  console.log('🔍 getCurrentUsage - User ID:', userId);
  console.log('🔍 req.user:', req.user);

  // Get user's subscription with populated plan details
  const subscription = await Subscription.findOne({ user: userId, status: 'active' }).populate('plan');
  if (!subscription) {
    return res.status(200).json({
      success: true,
      data: {
        totalDownload: 0,
        totalUpload: 0,
        dataLimit: 0,
        usagePercentage: 0,
        period: 'current',
        billingCycle: {
          start: new Date().toISOString(),
          end: new Date().toISOString()
        },
        lastUpdated: new Date().toISOString()
      },
      message: 'No active subscription found'
    });
  }

  // Handle case where plan was deleted but subscription still exists
  if (!subscription.plan) {
    return res.status(200).json({
      success: true,
      data: {
        totalDownload: 0,
        totalUpload: 0,
        dataLimit: 0,
        usagePercentage: 0,
        period: 'current',
        billingCycle: {
          start: subscription.startDate?.toISOString() || new Date().toISOString(),
          end: subscription.endDate?.toISOString() || new Date().toISOString()
        },
        lastUpdated: new Date().toISOString()
      },
      message: 'Subscription plan not found - plan may have been deleted'
    });
  }

  // Get usage from subscription start date (not start of month)
  // This ensures users only see usage from when they actually subscribed
  const subscriptionStartDate = new Date(subscription.startDate || subscription.createdAt);

  // Convert userId to ObjectId for aggregation
  const userObjectId = mongoose.Types.ObjectId.isValid(userId)
    ? new mongoose.Types.ObjectId(userId)
    : userId;

  console.log('🔍 Querying UsageLog with userId:', userObjectId);
  console.log('🔍 Subscription start date:', subscriptionStartDate);

  const usage = await UsageLog.aggregate([
    {
      $match: {
        userId: userObjectId,
        timestamp: { $gte: subscriptionStartDate },
      },
    },
    {
      $group: {
        _id: null,
        totalDownload: { $sum: '$download' },
        totalUpload: { $sum: '$upload' },
        averageLatency: { $avg: '$latency' },
        averagePacketLoss: { $avg: '$packetLoss' },
        maxDownloadSpeed: { $max: '$downloadSpeed' },
        maxUploadSpeed: { $max: '$uploadSpeed' },
        activeDevices: { $addToSet: '$deviceId' },
      },
    },
  ]);

  console.log('📊 Usage aggregation result:', usage);

  // Check if approaching data limit
  if (usage.length > 0 && subscription.plan.features?.dataLimit?.amount) {
    const totalUsage = usage[0].totalDownload + usage[0].totalUpload;
    const dataLimitGB = subscription.plan.features.dataLimit.amount;
    const dataLimitBytes = dataLimitGB * 1024 * 1024 * 1024;
    const usagePercentage = (totalUsage / dataLimitBytes) * 100;

    // Send alert if usage is above 80%
    if (usagePercentage >= 80) {
      const user = await User.findById(userId);
      await emailService.sendUsageAlert(user.email, {
        customerName: user.firstName,
        currentUsage: Math.round(totalUsage / (1024 * 1024 * 1024)), // Convert to GB
        monthlyLimit: dataLimitGB,
        usagePercentage: Math.round(usagePercentage),
        remainingData: Math.round((dataLimitBytes - totalUsage) / (1024 * 1024 * 1024)), // Convert to GB
        daysLeft: Math.round((new Date(subscription.endDate || subscription.nextBillingDate) - new Date()) / (1000 * 60 * 60 * 24)),
      });
    }
  }

  const usageData = usage[0] || {
    totalDownload: 0,
    totalUpload: 0,
    averageLatency: 0,
    averagePacketLoss: 0,
    maxDownloadSpeed: 0,
    maxUploadSpeed: 0,
    activeDevices: [],
  };

  const totalUsage = usageData.totalDownload + usageData.totalUpload;

  // Debug: Check plan structure
  console.log('🔍 PLAN DEBUG:');
  console.log('Plan Name:', subscription.plan?.name);
  console.log('Plan Features:', JSON.stringify(subscription.plan?.features, null, 2));
  console.log('Data Limit Path:', subscription.plan?.features?.dataLimit);

  // Convert data limit from GB to bytes for comparison (assuming features.dataLimit.amount is in GB)
  const dataLimitGB = subscription.plan?.features?.dataLimit?.amount || 0;
  const dataLimitBytes = dataLimitGB * 1024 * 1024 * 1024;
  const usagePercentage = dataLimitBytes > 0 ? (totalUsage / dataLimitBytes) * 100 : 0;

  console.log('✅ Data Limit GB:', dataLimitGB);
  console.log('✅ Data Limit Bytes:', dataLimitBytes);
  console.log('✅ Usage Percentage:', usagePercentage);

  res.status(200).json({
    success: true,
    data: {
      ...usageData,
      totalUsage,
      downloadUsage: usageData.totalDownload,
      uploadUsage: usageData.totalUpload,
      dataLimit: dataLimitBytes,
      dataLimitGB: dataLimitGB, // Add GB value for easier frontend display
      usagePercentage: Math.round(usagePercentage * 100) / 100,
      period: 'current',
      billingCycle: {
        start: (subscription.startDate || subscription.createdAt).toISOString(),
        end: (subscription.endDate || subscription.nextBillingDate || new Date()).toISOString()
      },
      lastUpdated: new Date().toISOString()
    },
  });
});

// @desc    Get daily usage statistics
// @route   GET /api/usage/daily/:userId
// @access  Private
exports.getDailyUsage = asyncHandler(async (req, res) => {
  const userId = req.params.userId || req.user._id || req.user.id;
  const days = parseInt(req.query.limit) || parseInt(req.query.days) || 7;

  console.log('🔍 getDailyUsage - User ID:', userId);

  // Get subscription to check start date
  const subscription = await Subscription.findOne({ user: userId, status: 'active' });

  if (!subscription) {
    return res.status(404).json({
      success: false,
      message: 'No active subscription found'
    });
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Use subscription start date as minimum date
  const subscriptionStartDate = new Date(subscription.startDate || subscription.createdAt);
  const filterStartDate = startDate > subscriptionStartDate ? startDate : subscriptionStartDate;

  // Convert userId to ObjectId for aggregation
  const userObjectId = mongoose.Types.ObjectId.isValid(userId)
    ? new mongoose.Types.ObjectId(userId)
    : userId;

  console.log('🔍 Querying UsageLog with userId:', userObjectId);
  console.log('🔍 Filter start date:', filterStartDate);

  const usage = await UsageLog.aggregate([
    {
      $match: {
        userId: userObjectId,
        timestamp: { $gte: filterStartDate }
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$timestamp' },
        },
        download: { $sum: '$download' },
        upload: { $sum: '$upload' },
        totalBandwidth: { $sum: { $add: ['$download', '$upload'] } },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  console.log('📊 Daily usage result:', usage);

  // Transform data to match frontend expectations
  const formattedData = usage.map(item => ({
    date: item._id,
    download: item.download || 0,
    upload: item.upload || 0,
    total: item.totalBandwidth || 0
  }));

  res.status(200).json({
    success: true,
    data: formattedData,
  });
});

// @desc    Get monthly usage statistics
// @route   GET /api/usage/monthly/:userId
// @access  Private
exports.getMonthlyUsage = asyncHandler(async (req, res) => {
  const userId = req.params.userId;
  const months = parseInt(req.query.months) || 6;

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const usage = await UsageLog.aggregate([
    {
      $match: {
        userId,
        timestamp: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
        },
        download: { $sum: '$download' },
        upload: { $sum: '$upload' },
        totalBandwidth: { $sum: { $add: ['$download', '$upload'] } },
      },
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 },
    },
  ]);

  res.status(200).json({
    success: true,
    data: usage,
  });
});

// @desc    Get hourly usage statistics
// @route   GET /api/usage/hourly/:userId
// @access  Private
exports.getHourlyUsage = asyncHandler(async (req, res) => {
  const userId = req.params.userId;
  const hours = parseInt(req.query.hours) || 24;

  const startDate = new Date();
  startDate.setHours(startDate.getHours() - hours);

  const usage = await UsageLog.aggregate([
    {
      $match: {
        userId,
        timestamp: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d %H:00', date: '$timestamp' },
        },
        bandwidth: { $avg: { $add: ['$downloadSpeed', '$uploadSpeed'] } },
        users: { $addToSet: '$deviceId' },
      },
    },
    {
      $project: {
        _id: 1,
        bandwidth: 1,
        users: { $size: '$users' },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  res.status(200).json({
    success: true,
    data: usage,
  });
});

// @desc    Generate sample usage data for user (Admin/Debug)
// @route   POST /api/usage/generate/:userId
// @access  Private
exports.generateSampleUsage = asyncHandler(async (req, res) => {
  const userId = req.params.userId || req.user.id;

  // Get user's active subscription
  const subscription = await Subscription.findOne({ user: userId, status: 'active' }).populate('plan');

  if (!subscription) {
    return res.status(404).json({
      success: false,
      message: 'No active subscription found'
    });
  }

  // Handle deleted plan
  if (!subscription.plan) {
    return res.status(400).json({
      success: false,
      message: 'Subscription plan not found - plan may have been deleted'
    });
  }

  // Check if user already has usage data
  const existingLogs = await UsageLog.countDocuments({ userId });
  if (existingLogs > 0) {
    return res.status(400).json({
      success: false,
      message: `User already has ${existingLogs} usage logs. Delete them first if you want to regenerate.`
    });
  }

  const sampleLogs = [];
  const now = new Date();
  const startDate = new Date(subscription.startDate || subscription.createdAt);

  // Generate usage for the past 7 days or since subscription start
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // Only generate data from subscription start date onwards
    if (date >= startDate) {
      date.setHours(12, 0, 0, 0);

      // Random realistic usage between 0.5-3 GB per day
      const downloadBytes = (Math.random() * 2.5 + 0.5) * 1024 * 1024 * 1024; // 0.5-3 GB
      const uploadBytes = (Math.random() * 0.4 + 0.1) * 1024 * 1024 * 1024; // 0.1-0.5 GB

      sampleLogs.push({
        userId,
        deviceId: `device-${userId.toString().slice(-6)}`,
        deviceType: ['Desktop', 'Mobile', 'Tablet'][Math.floor(Math.random() * 3)],
        ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        timestamp: date,
        download: downloadBytes,
        upload: uploadBytes,
        downloadSpeed: subscription.plan.features?.speed?.download || 25,
        uploadSpeed: subscription.plan.features?.speed?.upload || 5,
        latency: Math.random() * 20 + 10, // 10-30ms
        packetLoss: Math.random() * 2, // 0-2%
        sessionDuration: Math.floor(Math.random() * 120 + 30) // 30-150 minutes
      });
    }
  }

  await UsageLog.insertMany(sampleLogs);

  const totalDownload = sampleLogs.reduce((sum, log) => sum + log.download, 0);
  const totalUpload = sampleLogs.reduce((sum, log) => sum + log.upload, 0);
  const totalGB = (totalDownload + totalUpload) / (1024 * 1024 * 1024);

  res.status(200).json({
    success: true,
    message: `Generated ${sampleLogs.length} usage logs`,
    data: {
      logsCreated: sampleLogs.length,
      totalUsageGB: totalGB.toFixed(2),
      downloadGB: (totalDownload / (1024 * 1024 * 1024)).toFixed(2),
      uploadGB: (totalUpload / (1024 * 1024 * 1024)).toFixed(2)
    }
  });
});

// @desc    Generate usage data for all users with 0 usage (Admin)
// @route   POST /api/usage/generate-all
// @access  Private (Admin only)
exports.generateUsageForAll = asyncHandler(async (req, res) => {
  const { daysBack = 30, forceRegenerate = false } = req.body;

  const { generateUsageForAllUsers } = require('../utils/usageGenerator');

  // Generate realistic usage data for all users
  const result = await generateUsageForAllUsers(parseInt(daysBack));

  res.status(200).json({
    success: true,
    message: `Generated usage for ${result.generated} users, skipped ${result.skipped} users`,
    data: result
  });
});

// @desc    Get device distribution
// @route   GET /api/usage/devices/:userId
// @access  Private
exports.getDeviceDistribution = asyncHandler(async (req, res) => {
  const userId = req.params.userId;

  const devices = await UsageLog.aggregate([
    {
      $match: {
        userId,
        timestamp: {
          $gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    },
    {
      $group: {
        _id: '$deviceType',
        count: { $sum: 1 },
      },
    },
  ]);

  // Calculate percentages
  const total = devices.reduce((sum, device) => sum + device.count, 0);
  const distribution = devices.map(device => ({
    name: device._id || 'Unknown',
    value: Math.round((device.count / total) * 100),
  }));

  res.status(200).json({
    success: true,
    data: distribution,
  });
});