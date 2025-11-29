const PlanRequest = require('../models/PlanRequest');
const Plan = require('../models/Plan');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');

// @desc    Create a new plan request (for customers)
// @route   POST /api/plan-requests
// @access  Private/Customer
const createPlanRequest = asyncHandler(async (req, res) => {
  const {
    requestType,
    requestedPlanId,
    currentSubscriptionId,
    billingCycle = 'monthly',
    reason,
    urgency = 'medium',
    customerNotes
  } = req.body;

  // Validate request type
  const validTypes = ['new_subscription', 'plan_change', 'cancel_subscription', 'plan_upgrade', 'plan_downgrade'];
  if (!validTypes.includes(requestType)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid request type'
    });
  }

  // Check if user already has pending request
  const existingRequest = await PlanRequest.findOne({
    customer: req.user._id,
    status: 'pending'
  });

  if (existingRequest) {
    return res.status(400).json({
      status: 'error',
      message: 'You already have a pending request. Please wait for admin approval or cancel the existing request.'
    });
  }

  let currentSubscription = null;
  let requestedPlan = null;
  let previousPlan = null;
  let pricing = {};

  // Validate and fetch related data based on request type
  if (['plan_change', 'cancel_subscription', 'plan_upgrade', 'plan_downgrade'].includes(requestType)) {
    currentSubscription = await Subscription.findById(currentSubscriptionId)
      .populate('plan');
    
    if (!currentSubscription || currentSubscription.user.toString() !== req.user._id.toString()) {
      return res.status(404).json({
        status: 'error',
        message: 'Subscription not found or access denied'
      });
    }

    pricing.currentAmount = currentSubscription.pricing.finalPrice;
    previousPlan = currentSubscription.plan._id;
  }

  if (['new_subscription', 'plan_change', 'plan_upgrade', 'plan_downgrade'].includes(requestType)) {
    requestedPlan = await Plan.findById(requestedPlanId);
    
    if (!requestedPlan || requestedPlan.status !== 'active') {
      return res.status(404).json({
        status: 'error',
        message: 'Requested plan not found or not available'
      });
    }

    const planPrice = billingCycle === 'yearly' 
      ? requestedPlan.pricing.yearly || requestedPlan.pricing.monthly * 12
      : requestedPlan.pricing.monthly;
    
    pricing.newAmount = planPrice;
    
    if (pricing.currentAmount) {
      pricing.priceDifference = pricing.newAmount - pricing.currentAmount;
    }
  }

  // Calculate priority based on request type and urgency
  let priority = 5;
  const priorityMap = {
    'cancel_subscription': { low: 7, medium: 8, high: 9 },
    'new_subscription': { low: 3, medium: 5, high: 7 },
    'plan_upgrade': { low: 4, medium: 6, high: 8 },
    'plan_downgrade': { low: 2, medium: 4, high: 6 },
    'plan_change': { low: 3, medium: 5, high: 7 }
  };
  
  if (priorityMap[requestType] && priorityMap[requestType][urgency]) {
    priority = priorityMap[requestType][urgency];
  }

  // Check for auto-approval eligibility (simple rules)
  let autoApprovalEligible = false;
  if (requestType === 'plan_upgrade' && pricing.priceDifference > 0) {
    autoApprovalEligible = true; // Upgrades that increase revenue
  }

  const planRequest = new PlanRequest({
    customer: req.user._id,
    requestType,
    currentSubscription: currentSubscriptionId,
    requestedPlan: requestedPlanId,
    previousPlan,
    requestDetails: {
      billingCycle,
      reason,
      urgency
    },
    pricing,
    customerNotes,
    priority,
    autoApprovalEligible
  });

  // Add initial history entry
  await planRequest.addHistoryEntry('submitted', req.user._id, 'Request submitted by customer');
  
  await planRequest.save();

  // Populate for response
  await planRequest.populate([
    { path: 'customer', select: 'firstName lastName email' },
    { path: 'requestedPlan', select: 'name pricing category' },
    { path: 'currentSubscription', populate: { path: 'plan', select: 'name pricing' } }
  ]);

  // Emit real-time event
  if (global.realTimeEvents) {
    global.realTimeEvents.planRequestCreated(req.user._id, planRequest);
  }

  res.status(201).json({
    status: 'success',
    message: 'Plan request submitted successfully. An admin will review your request.',
    data: {
      request: planRequest
    }
  });
});

// @desc    Get customer's plan requests
// @route   GET /api/plan-requests/my-requests
// @access  Private/Customer
const getMyPlanRequests = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  const filter = { customer: req.user._id };
  if (status) filter.status = status;

  const requests = await PlanRequest.find(filter)
    .populate('requestedPlan', 'name pricing category')
    .populate('currentSubscription', 'status')
    .populate('adminAction.reviewedBy', 'firstName lastName')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await PlanRequest.countDocuments(filter);

  res.status(200).json({
    status: 'success',
    data: {
      requests,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
      }
    }
  });
});

// @desc    Cancel a plan request
// @route   PUT /api/plan-requests/:id/cancel
// @access  Private/Customer
const cancelPlanRequest = asyncHandler(async (req, res) => {
  const request = await PlanRequest.findById(req.params.id);

  if (!request) {
    return res.status(404).json({
      status: 'error',
      message: 'Plan request not found'
    });
  }

  if (request.customer.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      status: 'error',
      message: 'Access denied'
    });
  }

  if (request.status !== 'pending') {
    return res.status(400).json({
      status: 'error',
      message: 'Can only cancel pending requests'
    });
  }

  request.status = 'cancelled';
  await request.addHistoryEntry('cancelled', req.user._id, 'Request cancelled by customer');

  // Emit real-time event
  if (global.realTimeEvents) {
    global.realTimeEvents.planRequestCancelled(req.user._id, request);
  }

  res.status(200).json({
    status: 'success',
    message: 'Plan request cancelled successfully',
    data: {
      request
    }
  });
});

module.exports = {
  createPlanRequest,
  getMyPlanRequests,
  cancelPlanRequest
};