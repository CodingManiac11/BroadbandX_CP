const { asyncHandler } = require('../middleware/errorHandler');
const ErrorResponse = require('../utils/errorResponse');
const Feedback = require('../models/Feedback');
const User = require('../models/User');
const emailService = require('../services/emailService');

// @desc    Submit new feedback
// @route   POST /api/feedback
// @access  Private
exports.submitFeedback = asyncHandler(async (req, res) => {
  req.body.user = req.user.id;

  // Get user's current subscription if not provided
  if (!req.body.subscription) {
    const Subscription = require('../models/Subscription');
    const activeSubscription = await Subscription.findOne({
      user: req.user.id,
      status: 'active'
    }).sort('-createdAt');
    
    if (activeSubscription) {
      req.body.subscription = activeSubscription._id;
    }
  }

  const feedback = await Feedback.create(req.body);

  // If feedback indicates issues, notify support team
  if (feedback.needsAttention()) {
    // TODO: Implement support team notification
    console.log('Urgent feedback needs attention:', feedback._id);
  }

  res.status(201).json({
    success: true,
    data: feedback
  });
});

// @desc    Get all feedback for a user
// @route   GET /api/feedback/user/:userId
// @access  Private
exports.getUserFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.find({ user: req.params.userId })
    .sort('-createdAt')
    .populate('subscription', 'plan.name');

  res.status(200).json({
    success: true,
    count: feedback.length,
    data: feedback
  });
});

// @desc    Get public feedback for display
// @route   GET /api/feedback/public
// @access  Public
exports.getPublicFeedback = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  const query = { isPublic: true };
  
  if (req.query.type) {
    query.type = req.query.type;
  }

  if (req.query.minRating) {
    query['rating.overall'] = { $gte: parseInt(req.query.minRating) };
  }

  const feedback = await Feedback.find(query)
    .sort('-createdAt')
    .skip(startIndex)
    .limit(limit)
    .populate({
      path: 'user',
      select: 'firstName lastName',
      match: { isAnonymous: false }
    });

  const total = await Feedback.countDocuments(query);

  res.status(200).json({
    success: true,
    count: feedback.length,
    pagination: {
      current: page,
      pages: Math.ceil(total / limit),
      total
    },
    data: feedback
  });
});

// @desc    Get feedback statistics and analytics
// @route   GET /api/feedback/stats
// @access  Private/Admin
exports.getFeedbackStats = asyncHandler(async (req, res) => {
  const timeframe = req.query.timeframe || '30d'; // Default to last 30 days
  
  let startDate = new Date();
  switch (timeframe) {
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(startDate.getDate() - 90);
      break;
    case '1y':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    default:
      startDate.setDate(startDate.getDate() - 30);
  }

  const stats = await Feedback.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalFeedback: { $sum: 1 },
        averageRating: { $avg: '$rating.overall' },
        positiveFeedback: {
          $sum: { $cond: [{ $eq: ['$sentiment', 'positive'] }, 1, 0] }
        },
        negativeFeedback: {
          $sum: { $cond: [{ $eq: ['$sentiment', 'negative'] }, 1, 0] }
        },
        neutralFeedback: {
          $sum: { $cond: [{ $eq: ['$sentiment', 'neutral'] }, 1, 0] }
        },
        categoryStats: {
          $push: {
            type: '$type',
            rating: '$rating.overall'
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalFeedback: 1,
        averageRating: { $round: ['$averageRating', 1] },
        positiveFeedback: 1,
        negativeFeedback: 1,
        neutralFeedback: 1,
        sentimentDistribution: {
          positive: { $multiply: [{ $divide: ['$positiveFeedback', '$totalFeedback'] }, 100] },
          negative: { $multiply: [{ $divide: ['$negativeFeedback', '$totalFeedback'] }, 100] },
          neutral: { $multiply: [{ $divide: ['$neutralFeedback', '$totalFeedback'] }, 100] }
        }
      }
    }
  ]);

  // Get average ratings for different aspects
  const averageRatings = await Feedback.getAverageRatings();

  // Get trend data
  const trendData = await Feedback.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        averageRating: { $avg: '$rating.overall' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id': 1 }
    }
  ]);

  res.status(200).json({
    success: true,
    data: {
      ...stats[0],
      averageRatings,
      trends: trendData
    }
  });
});

// @desc    Update feedback status or add response
// @route   PUT /api/feedback/:id
// @access  Private/Admin
exports.updateFeedback = asyncHandler(async (req, res) => {
  let feedback = await Feedback.findById(req.params.id);

  if (!feedback) {
    return next(new ErrorResponse(`Feedback not found with id of ${req.params.id}`, 404));
  }

  // Add response if provided
  if (req.body.response) {
    feedback.response = {
      content: req.body.response,
      respondedBy: req.user.id,
      respondedAt: Date.now()
    };
    feedback.status = 'responded';

    // Send notification email to user (optional - don't fail if email fails)
    try {
      const user = await User.findById(feedback.user);
      if (user && user.email) {
        await emailService.sendFeedbackResponse(user.email, {
          customerName: user.firstName,
          feedbackType: feedback.type,
          response: req.body.response
        });
      }
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError.message);
      // Continue without failing the request
    }
  }

  // Update status if provided
  if (req.body.status) {
    feedback.status = req.body.status;
  }

  feedback = await feedback.save();

  res.status(200).json({
    success: true,
    data: feedback
  });
});

// @desc    Delete feedback
// @route   DELETE /api/feedback/:id
// @access  Private/Admin
exports.deleteFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findById(req.params.id);

  if (!feedback) {
    return next(new ErrorResponse(`Feedback not found with id of ${req.params.id}`, 404));
  }

  // Make sure user owns feedback or is admin
  if (feedback.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse('Not authorized to delete this feedback', 403));
  }

  await feedback.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get all feedback (admin only)
// @route   GET /api/feedback
// @access  Private/Admin
exports.getAllFeedback = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  // Build query
  const query = {};
  
  if (req.query.type) {
    query.type = req.query.type;
  }

  if (req.query.status) {
    query.status = req.query.status;
  }

  if (req.query.sentiment) {
    query.sentiment = req.query.sentiment;
  }

  if (req.query.minRating) {
    query['rating.overall'] = { $gte: parseInt(req.query.minRating) };
  }

  if (req.query.search) {
    query.$or = [
      { comment: { $regex: req.query.search, $options: 'i' } },
      { 'response.content': { $regex: req.query.search, $options: 'i' } }
    ];
  }

  const feedback = await Feedback.find(query)
    .sort('-createdAt')
    .skip(startIndex)
    .limit(limit)
    .populate('user', 'firstName lastName email')
    .populate('subscription', 'plan');

  const total = await Feedback.countDocuments(query);

  res.status(200).json({
    success: true,
    count: feedback.length,
    pagination: {
      page,
      pages: Math.ceil(total / limit),
      total,
      limit
    },
    data: feedback
  });
});