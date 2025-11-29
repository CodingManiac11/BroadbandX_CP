const User = require('../models/User');
const Plan = require('../models/Plan');
const Subscription = require('../models/Subscription');
const UsageAnalytics = require('../models/UsageAnalytics');
const PlanRequest = require('../models/PlanRequest');
const { asyncHandler } = require('../middleware/errorHandler');
const { activateSubscription } = require('./subscriptionController');
const mongoose = require('mongoose');

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private/Admin
const getDashboardStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  // Get basic counts
  const [
    totalUsers,
    totalCustomers,
    totalPlans,
    activeSubscriptions,
    totalRevenue,
    monthlyRevenue,
    newUsersThisMonth,
    expiringSoon
  ] = await Promise.all([
    User.countDocuments(), // All users (including admins)
    User.countDocuments({ role: 'customer' }), // Only customers
    Plan.countDocuments({ status: 'active' }),
    Subscription.countDocuments({ status: 'active' }),
    Subscription.aggregate([
      { $match: { status: { $in: ['active', 'expired'] } } },
      { $group: { _id: null, total: { $sum: '$pricing.totalAmount' } } }
    ]),
    Subscription.aggregate([
      { 
        $match: { 
          status: 'active',
          createdAt: { $gte: startOfMonth }
        }
      },
      { $group: { _id: null, total: { $sum: '$pricing.totalAmount' } } }
    ]),
    User.countDocuments({
      role: 'customer',
      customerSince: { $gte: startOfMonth }
    }),
    Subscription.countDocuments({
      status: 'active',
      endDate: { 
        $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        $gte: now
      }
    })
  ]);

  // Calculate growth rates
  const lastMonthUsers = await User.countDocuments({
    role: 'customer',
    customerSince: { $gte: lastMonth, $lt: startOfMonth }
  });

  const userGrowthRate = lastMonthUsers > 0 ? 
    ((newUsersThisMonth - lastMonthUsers) / lastMonthUsers * 100) : 0;

  // Get subscription distribution
  const subscriptionsByStatus = await Subscription.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Get popular plans this month
  const popularPlansThisMonth = await Subscription.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfMonth }
      }
    },
    {
      $group: {
        _id: '$plan',
        count: { $sum: 1 },
        revenue: { $sum: '$pricing.totalAmount' }
      }
    },
    {
      $lookup: {
        from: 'plans',
        localField: '_id',
        foreignField: '_id',
        as: 'planDetails'
      }
    },
    {
      $unwind: '$planDetails'
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: 5
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      totalUsers,
      totalCustomers,
      totalPlans,
      activeSubscriptions,
      totalRevenue: totalRevenue[0]?.total || 0,
      monthlyRevenue: monthlyRevenue[0]?.total || 0,
      newUsersThisMonth,
      userGrowthRate: Math.round(userGrowthRate * 100) / 100,
      expiringSoon,
      subscriptionsByStatus,
      popularPlansThisMonth,
      recentUsers: [], // TODO: Add recent users query
      recentSubscriptions: [] // TODO: Add recent subscriptions query
    }
  });
});

// @desc    Get user management data
// @route   GET /api/admin/users
// @access  Private/Admin
const getUserManagement = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    role,
    search,
    sortBy = 'customerSince',
    sortOrder = 'desc'
  } = req.query;

  // Build filter
  const filter = {};
  if (status) filter.status = status;
  if (role) filter.role = role;
  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  // Build sort
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const users = await User.find(filter)
    .select('-password')
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await User.countDocuments(filter);

  // Get user statistics
  const userStats = await User.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      users,
      userStats,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    }
  });
});

// @desc    Get subscription analytics
// @route   GET /api/admin/analytics/subscriptions
// @access  Private/Admin
const getSubscriptionAnalytics = asyncHandler(async (req, res) => {
  const { period = 'month', year = new Date().getFullYear() } = req.query;

  let groupBy, dateRange;
  
  if (period === 'year') {
    groupBy = { year: { $year: '$createdAt' } };
    dateRange = {};
  } else {
    groupBy = { 
      year: { $year: '$createdAt' },
      month: { $month: '$createdAt' }
    };
    dateRange = {
      createdAt: {
        $gte: new Date(year, 0, 1),
        $lt: new Date(parseInt(year) + 1, 0, 1)
      }
    };
  }

  const subscriptionTrends = await Subscription.aggregate([
    { $match: dateRange },
    {
      $group: {
        _id: groupBy,
        newSubscriptions: { $sum: 1 },
        revenue: { $sum: '$pricing.totalAmount' },
        avgValue: { $avg: '$pricing.totalAmount' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  // Churn analysis
  const churnData = await Subscription.aggregate([
    {
      $match: {
        status: 'cancelled',
        'cancellation.requestDate': { $gte: new Date(year, 0, 1) }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$cancellation.requestDate' },
          month: { $month: '$cancellation.requestDate' }
        },
        churnedSubscriptions: { $sum: 1 },
        reasons: { $push: '$cancellation.reason' }
      }
    }
  ]);

  // Plan performance
  const planPerformance = await Subscription.aggregate([
    { $match: dateRange },
    {
      $group: {
        _id: '$plan',
        subscriptions: { $sum: 1 },
        revenue: { $sum: '$pricing.totalAmount' }
      }
    },
    {
      $lookup: {
        from: 'plans',
        localField: '_id',
        foreignField: '_id',
        as: 'planDetails'
      }
    },
    { $unwind: '$planDetails' },
    { $sort: { subscriptions: -1 } }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      subscriptionTrends,
      churnData,
      planPerformance
    }
  });
});

// @desc    Get revenue analytics
// @route   GET /api/admin/analytics/revenue
// @access  Private/Admin
const getRevenueAnalytics = asyncHandler(async (req, res) => {
  const { year = new Date().getFullYear() } = req.query;

  // Monthly revenue breakdown
  const monthlyRevenue = await Subscription.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(year, 0, 1),
          $lt: new Date(parseInt(year) + 1, 0, 1)
        }
      }
    },
    {
      $group: {
        _id: { month: { $month: '$createdAt' } },
        totalRevenue: { $sum: '$pricing.totalAmount' },
        subscriptionCount: { $sum: 1 },
        avgRevenuePerUser: { $avg: '$pricing.totalAmount' }
      }
    },
    { $sort: { '_id.month': 1 } }
  ]);

  // Revenue by plan category
  const revenueByCategory = await Subscription.aggregate([
    {
      $lookup: {
        from: 'plans',
        localField: 'plan',
        foreignField: '_id',
        as: 'planDetails'
      }
    },
    { $unwind: '$planDetails' },
    {
      $group: {
        _id: '$planDetails.category',
        revenue: { $sum: '$pricing.totalAmount' },
        count: { $sum: 1 }
      }
    }
  ]);

  // Payment method analysis
  const paymentMethodStats = await Subscription.aggregate([
    { $unwind: '$paymentHistory' },
    {
      $group: {
        _id: '$paymentHistory.paymentMethod',
        totalAmount: { $sum: '$paymentHistory.amount' },
        transactionCount: { $sum: 1 }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      monthlyRevenue,
      revenueByCategory,
      paymentMethodStats
    }
  });
});

// @desc    Get top plans analytics
// @route   GET /api/admin/analytics/top-plans
// @access  Private/Admin
const getTopPlans = asyncHandler(async (req, res) => {
  const { 
    period = 'current-month',
    limit = 10 
  } = req.query;

  let dateFilter = {};
  const now = new Date();

  switch (period) {
    case 'current-month':
      dateFilter = {
        createdAt: {
          $gte: new Date(now.getFullYear(), now.getMonth(), 1)
        }
      };
      break;
    case 'last-month':
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      dateFilter = {
        createdAt: {
          $gte: lastMonth,
          $lte: endOfLastMonth
        }
      };
      break;
    case 'current-year':
      dateFilter = {
        createdAt: {
          $gte: new Date(now.getFullYear(), 0, 1)
        }
      };
      break;
    case 'all-time':
    default:
      dateFilter = {};
  }

  const topPlans = await Subscription.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: '$plan',
        subscriptions: { $sum: 1 },
        totalRevenue: { $sum: '$pricing.totalAmount' },
        avgRevenue: { $avg: '$pricing.totalAmount' }
      }
    },
    {
      $lookup: {
        from: 'plans',
        localField: '_id',
        foreignField: '_id',
        as: 'planDetails'
      }
    },
    { $unwind: '$planDetails' },
    {
      $project: {
        planName: '$planDetails.name',
        category: '$planDetails.category',
        subscriptions: 1,
        totalRevenue: 1,
        avgRevenue: 1,
        speed: '$planDetails.features.speed',
        pricing: '$planDetails.pricing'
      }
    },
    { $sort: { subscriptions: -1 } },
    { $limit: parseInt(limit) }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      topPlans,
      period
    }
  });
});

// @desc    Get usage analytics
// @route   GET /api/admin/analytics/usage
// @access  Private/Admin
const getUsageAnalytics = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Average usage by plan
  const usageByPlan = await UsageAnalytics.aggregate([
    { $match: { date: { $gte: startDate } } },
    {
      $lookup: {
        from: 'subscriptions',
        localField: 'subscription',
        foreignField: '_id',
        as: 'subscriptionDetails'
      }
    },
    { $unwind: '$subscriptionDetails' },
    {
      $lookup: {
        from: 'plans',
        localField: 'subscriptionDetails.plan',
        foreignField: '_id',
        as: 'planDetails'
      }
    },
    { $unwind: '$planDetails' },
    {
      $group: {
        _id: '$planDetails.name',
        avgDailyUsage: { $avg: '$metrics.dataUsed' },
        totalUsers: { $addToSet: '$user' },
        avgSpeed: { $avg: '$averageSpeed.download' }
      }
    },
    {
      $project: {
        planName: '$_id',
        avgDailyUsage: 1,
        totalUsers: { $size: '$totalUsers' },
        avgSpeed: 1
      }
    }
  ]);

  // Peak usage hours
  const peakUsageHours = await UsageAnalytics.aggregate([
    { $match: { date: { $gte: startDate } } },
    { $unwind: '$metrics.sessionMetrics.peakUsageHours' },
    {
      $group: {
        _id: '$metrics.sessionMetrics.peakUsageHours.hour',
        totalUsage: { $sum: '$metrics.sessionMetrics.peakUsageHours.dataUsed' },
        userCount: { $addToSet: '$user' }
      }
    },
    {
      $project: {
        hour: '$_id',
        totalUsage: 1,
        userCount: { $size: '$userCount' }
      }
    },
    { $sort: { hour: 1 } }
  ]);

  // Application usage patterns
  const appUsagePatterns = await UsageAnalytics.aggregate([
    { $match: { date: { $gte: startDate } } },
    { $unwind: '$applicationUsage' },
    {
      $group: {
        _id: '$applicationUsage.application',
        totalDataUsed: { $sum: '$applicationUsage.dataUsed' },
        totalDuration: { $sum: '$applicationUsage.duration' },
        avgQuality: { $avg: '$applicationUsage.qualityScore' },
        userCount: { $addToSet: '$user' }
      }
    },
    {
      $project: {
        application: '$_id',
        totalDataUsed: 1,
        totalDuration: 1,
        avgQuality: 1,
        userCount: { $size: '$userCount' }
      }
    },
    { $sort: { totalDataUsed: -1 } }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      usageByPlan,
      peakUsageHours,
      appUsagePatterns
    }
  });
});

// @desc    Get customer insights
// @route   GET /api/admin/analytics/customers
// @access  Private/Admin
const getCustomerInsights = asyncHandler(async (req, res) => {
  // Customer lifetime value
  const customerLTV = await Subscription.aggregate([
    {
      $group: {
        _id: '$user',
        totalRevenue: { $sum: '$pricing.totalAmount' },
        subscriptionCount: { $sum: 1 },
        avgSubscriptionValue: { $avg: '$pricing.totalAmount' },
        customerSince: { $min: '$createdAt' }
      }
    },
    {
      $project: {
        userId: '$_id',
        totalRevenue: 1,
        subscriptionCount: 1,
        avgSubscriptionValue: 1,
        customerSince: 1,
        monthsActive: {
          $divide: [
            { $subtract: [new Date(), '$customerSince'] },
            1000 * 60 * 60 * 24 * 30
          ]
        }
      }
    },
    { $sort: { totalRevenue: -1 } },
    { $limit: 100 }
  ]);

  // Customer segments
  const customerSegments = await User.aggregate([
    { $match: { role: 'customer' } },
    {
      $lookup: {
        from: 'subscriptions',
        localField: '_id',
        foreignField: 'user',
        as: 'subscriptions'
      }
    },
    {
      $project: {
        totalSpent: { $sum: '$subscriptions.pricing.totalAmount' },
        subscriptionCount: { $size: '$subscriptions' },
        lastSubscription: { $max: '$subscriptions.createdAt' }
      }
    },
    {
      $bucket: {
        groupBy: '$totalSpent',
        boundaries: [0, 100, 500, 1000, 5000],
        default: 'high-value',
        output: {
          count: { $sum: 1 },
          avgSpent: { $avg: '$totalSpent' }
        }
      }
    }
  ]);

  // Churn risk analysis
  const churnRisk = await Subscription.aggregate([
    {
      $match: {
        status: 'active',
        endDate: { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
      }
    },
    {
      $lookup: {
        from: 'usageanalytics',
        localField: '_id',
        foreignField: 'subscription',
        as: 'usage'
      }
    },
    {
      $project: {
        user: 1,
        plan: 1,
        endDate: 1,
        daysUntilExpiry: {
          $divide: [
            { $subtract: ['$endDate', new Date()] },
            1000 * 60 * 60 * 24
          ]
        },
        recentUsage: { $slice: ['$usage', -7] }
      }
    },
    { $sort: { daysUntilExpiry: 1 } }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      customerLTV: customerLTV.slice(0, 20), // Top 20 customers
      customerSegments,
      churnRisk: churnRisk.slice(0, 50) // Top 50 at-risk customers
    }
  });
});

// @desc    Get user by ID
// @route   GET /api/admin/users/:id
// @access  Private/Admin
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');

  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found'
    });
  }

  // Get user's subscriptions
  const subscriptions = await Subscription.find({ user: req.params.id })
    .populate('plan')
    .sort({ createdAt: -1 });

  // Get user's usage analytics
  const usageStats = await UsageAnalytics.getUserUsageSummary(req.params.id);

  res.status(200).json({
    status: 'success',
    data: {
      user,
      subscriptions,
      usageStats: usageStats[0] || {}
    }
  });
});

// @desc    Update user status
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
const updateUserStatus = asyncHandler(async (req, res) => {
  const { status, reason } = req.body;

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found'
    });
  }

  res.status(200).json({
    status: 'success',
    message: `User status updated to ${status}`,
    data: {
      user
    }
  });
});

// @desc    Create admin user
// @route   POST /api/admin/users/admin
// @access  Private/Admin
const createAdminUser = asyncHandler(async (req, res) => {
  const userData = {
    ...req.body,
    role: 'admin',
    emailVerified: true
  };

  const admin = await User.create(userData);
  admin.password = undefined;

  res.status(201).json({
    status: 'success',
    message: 'Admin user created successfully',
    data: {
      user: admin
    }
  });
});

// @desc    Create user
// @route   POST /api/admin/users
// @access  Private/Admin
const createUser = asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    phone,
    role = 'customer',
    password, // Allow admin to set custom password
    address,
    status = 'active'
  } = req.body;

  // Generate a secure random password if not provided
  const defaultPassword = password || 'BroadbandX' + Math.random().toString(36).slice(-8) + '!';

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      status: 'error',
      message: 'User with this email already exists'
    });
  }

  // Provide default address if not provided
  const userAddress = address || {
    street: 'Not Provided',
    city: 'Not Provided', 
    state: 'Not Provided',
    zipCode: '00000',
    country: 'USA'
  };

  // Create user data
  const userData = {
    firstName,
    lastName,
    email,
    phone,
    password: defaultPassword,
    role,
    address: userAddress,
    status,
    emailVerified: true, // Admin-created users are verified by default
    customerSince: new Date(),
    mustChangePassword: !password // Force password change if using default password
  };

  const user = await User.create(userData);
  
  // Remove password from response but include it in a separate field for admin
  user.password = undefined;

  res.status(201).json({
    status: 'success',
    message: 'User created successfully',
    data: {
      user,
      // Include temporary password for admin to share with user (only if generated)
      temporaryPassword: !password ? defaultPassword : undefined
    }
  });
});

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
const updateUser = asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    phone,
    address,
    status,
    role
  } = req.body;

  // Check if user exists
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found'
    });
  }

  // Check if email is being changed and already exists
  if (email && email !== user.email) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User with this email already exists'
      });
    }
  }

  // Update user data
  const updateData = {
    ...(firstName && { firstName }),
    ...(lastName && { lastName }),
    ...(email && { email }),
    ...(phone && { phone }),
    ...(address && { address }),
    ...(status && { status }),
    ...(role && { role })
  };

  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  ).select('-password');

  res.status(200).json({
    status: 'success',
    message: 'User updated successfully',
    data: {
      user: updatedUser
    }
  });
});

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  // Check if user exists
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found'
    });
  }

  // Prevent deleting admin users
  if (user.role === 'admin') {
    return res.status(400).json({
      status: 'error',
      message: 'Cannot delete admin users'
    });
  }

  // Check if user has active subscriptions
  const activeSubscriptions = await Subscription.countDocuments({
    user: req.params.id,
    status: 'active'
  });

  if (activeSubscriptions > 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Cannot delete user with active subscriptions. Please cancel all subscriptions first.'
    });
  }

  // Delete user
  await User.findByIdAndDelete(req.params.id);

  res.status(200).json({
    status: 'success',
    message: 'User deleted successfully'
  });
});

// @desc    Get system health
// @route   GET /api/admin/health
// @access  Private/Admin
const getSystemHealth = asyncHandler(async (req, res) => {
  const dbStats = await mongoose.connection.db.stats();
  
  const systemHealth = {
    database: {
      connected: mongoose.connection.readyState === 1,
      collections: dbStats.collections,
      dataSize: dbStats.dataSize,
      indexSize: dbStats.indexSize
    },
    server: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version
    },
    timestamp: new Date().toISOString()
  };

  res.status(200).json({
    status: 'success',
    data: systemHealth
  });
});

// @desc    Get all subscriptions (Admin only)
// @route   GET /api/admin/subscriptions
// @access  Private/Admin
const getAllSubscriptions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, search } = req.query;
  
  let query = {};
  
  // Filter by status if provided
  if (status && status !== 'all') {
    query.status = status;
  }
  
  // Search by user email or plan name
  if (search) {
    const users = await User.find({
      $or: [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ]
    }).select('_id');
    
    const plans = await Plan.find({
      name: { $regex: search, $options: 'i' }
    }).select('_id');
    
    query.$or = [
      { user: { $in: users.map(u => u._id) } },
      { plan: { $in: plans.map(p => p._id) } }
    ];
  }
  
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const subscriptions = await Subscription.find(query)
    .populate('user', 'email firstName lastName')
    .populate('plan', 'name category pricing status')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));
  
  const total = await Subscription.countDocuments(query);
  
  res.status(200).json({
    success: true,
    data: subscriptions,
    pagination: {
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      total,
      limit: parseInt(limit)
    }
  });
});

// @desc    Get all plan requests for admin review
// @route   GET /api/admin/plan-requests
// @access  Private/Admin
const getAllPlanRequests = asyncHandler(async (req, res) => {
  const { 
    status = 'pending', 
    requestType, 
    priority, 
    page = 1, 
    limit = 10,
    search 
  } = req.query;

  let query = {};
  
  // Filter by status
  if (status && status !== 'all') {
    query.status = status;
  }
  
  // Filter by request type
  if (requestType) {
    query.requestType = requestType;
  }
  
  // Filter by priority
  if (priority) {
    query.priority = { $gte: parseInt(priority) };
  }
  
  // Search by customer name or email
  if (search) {
    const customers = await User.find({
      $or: [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    }).select('_id');
    
    query.customer = { $in: customers.map(c => c._id) };
  }

  const requests = await PlanRequest.find(query)
    .populate('customer', 'firstName lastName email phone')
    .populate('requestedPlan', 'name pricing category features')
    .populate('previousPlan', 'name pricing category')
    .populate({
      path: 'currentSubscription',
      populate: { path: 'plan', select: 'name pricing category' }
    })
    .populate('adminAction.reviewedBy', 'firstName lastName')
    .sort({ priority: -1, createdAt: 1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await PlanRequest.countDocuments(query);
  
  // Get summary statistics
  const stats = await PlanRequest.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const pendingCount = await PlanRequest.countDocuments({ status: 'pending' });
  const urgentCount = await PlanRequest.countDocuments({ 
    status: 'pending', 
    'requestDetails.urgency': 'high' 
  });

  res.status(200).json({
    success: true,
    data: requests,
    pagination: {
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      total,
      limit: parseInt(limit)
    },
    summary: {
      totalPending: pendingCount,
      urgentRequests: urgentCount,
      statusBreakdown: stats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    }
  });
});

// @desc    Get plan request details
// @route   GET /api/admin/plan-requests/:id
// @access  Private/Admin
const getPlanRequestById = asyncHandler(async (req, res) => {
  const request = await PlanRequest.findById(req.params.id)
    .populate('customer', 'firstName lastName email phone address')
    .populate('requestedPlan', 'name pricing category features')
    .populate('previousPlan', 'name pricing category')
    .populate({
      path: 'currentSubscription',
      populate: { path: 'plan', select: 'name pricing category features' }
    })
    .populate('adminAction.reviewedBy', 'firstName lastName')
    .populate('history.performedBy', 'firstName lastName');

  if (!request) {
    return res.status(404).json({
      status: 'error',
      message: 'Plan request not found'
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      request
    }
  });
});

// @desc    Approve a plan request
// @route   PUT /api/admin/plan-requests/:id/approve
// @access  Private/Admin
const approvePlanRequest = asyncHandler(async (req, res) => {
  const { comments, internalNotes } = req.body;
  
  const request = await PlanRequest.findById(req.params.id)
    .populate('customer')
    .populate('requestedPlan')
    .populate('currentSubscription');

  if (!request) {
    return res.status(404).json({
      status: 'error',
      message: 'Plan request not found'
    });
  }

  if (request.status !== 'pending') {
    return res.status(400).json({
      status: 'error',
      message: 'Can only approve pending requests'
    });
  }

  // Approve the request
  await request.approve(req.user._id, comments, internalNotes);
  
  // Execute the actual plan change based on request type
  try {
    let result = {};
    
    switch (request.requestType) {
      case 'new_subscription':
        // Create new subscription
        const newSubscription = new Subscription({
          user: request.customer._id,
          plan: request.requestedPlan._id,
          billingCycle: request.requestDetails.billingCycle,
          status: 'active',
          pricing: {
            basePrice: request.requestedPlan.pricing.monthly,
            finalPrice: request.pricing.newAmount,
            currency: 'INR'
          }
        });
        await newSubscription.save();
        result.subscription = newSubscription;
        break;
        
      case 'plan_change':
      case 'plan_upgrade':
      case 'plan_downgrade':
        // Update existing subscription
        if (request.currentSubscription) {
          request.currentSubscription.plan = request.requestedPlan._id;
          request.currentSubscription.pricing.finalPrice = request.pricing.newAmount;
          await request.currentSubscription.save();
          result.subscription = request.currentSubscription;
        }
        break;
        
      case 'cancel_subscription':
        // Cancel subscription
        if (request.currentSubscription) {
          request.currentSubscription.status = 'cancelled';
          await request.currentSubscription.save();
          result.subscription = request.currentSubscription;
        }
        break;
    }

    // Emit real-time event for approval
    if (global.realTimeEvents) {
      global.realTimeEvents.planRequestApproved(request.customer._id, request, req.user._id);
    }

    res.status(200).json({
      status: 'success',
      message: 'Plan request approved successfully',
      data: {
        request,
        result
      }
    });

  } catch (error) {
    // If execution fails, revert the approval
    request.status = 'pending';
    await request.save();
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to execute plan change after approval',
      error: error.message
    });
  }
});

// @desc    Reject a plan request
// @route   PUT /api/admin/plan-requests/:id/reject
// @access  Private/Admin
const rejectPlanRequest = asyncHandler(async (req, res) => {
  const { comments, internalNotes } = req.body;
  
  const request = await PlanRequest.findById(req.params.id);

  if (!request) {
    return res.status(404).json({
      status: 'error',
      message: 'Plan request not found'
    });
  }

  if (request.status !== 'pending') {
    return res.status(400).json({
      status: 'error',
      message: 'Can only reject pending requests'
    });
  }

  await request.reject(req.user._id, comments, internalNotes);

  // Emit real-time event for rejection
  if (global.realTimeEvents) {
    global.realTimeEvents.planRequestRejected(request.customer, request, req.user._id, comments);
  }

  res.status(200).json({
    status: 'success',
    message: 'Plan request rejected successfully',
    data: {
      request
    }
  });
});

// @desc    Get plan request analytics
// @route   GET /api/admin/plan-requests/analytics
// @access  Private/Admin
const getPlanRequestAnalytics = asyncHandler(async (req, res) => {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  
  // Request volume by type
  const requestsByType = await PlanRequest.aggregate([
    {
      $group: {
        _id: '$requestType',
        count: { $sum: 1 },
        pending: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        approved: {
          $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
        },
        rejected: {
          $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
        }
      }
    }
  ]);
  
  // Average approval time
  const approvalTimes = await PlanRequest.aggregate([
    {
      $match: { status: { $in: ['approved', 'rejected'] } }
    },
    {
      $project: {
        approvalTime: {
          $subtract: ['$adminAction.reviewedAt', '$createdAt']
        }
      }
    },
    {
      $group: {
        _id: null,
        avgApprovalTime: { $avg: '$approvalTime' }
      }
    }
  ]);
  
  // Monthly trend
  const monthlyTrend = await PlanRequest.aggregate([
    {
      $match: {
        createdAt: { $gte: lastMonth }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          status: '$status'
        },
        count: { $sum: 1 }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      requestsByType,
      averageApprovalTimeHours: approvalTimes[0]?.avgApprovalTime ? 
        Math.round(approvalTimes[0].avgApprovalTime / (1000 * 60 * 60) * 100) / 100 : 0,
      monthlyTrend
    }
  });
});

module.exports = {
  getDashboardStats,
  getUserManagement,
  getSubscriptionAnalytics,
  getRevenueAnalytics,
  getTopPlans,
  getUsageAnalytics,
  getCustomerInsights,
  getUserById,
  updateUserStatus,
  createUser,
  updateUser,
  deleteUser,
  createAdminUser,
  getSystemHealth,
  getAllSubscriptions,
  activateSubscription,
  getAllPlanRequests,
  getPlanRequestById,
  approvePlanRequest,
  rejectPlanRequest,
  getPlanRequestAnalytics
};