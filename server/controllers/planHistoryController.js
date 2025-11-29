const Subscription = require('../models/Subscription');
const Plan = require('../models/Plan');
const { asyncHandler } = require('../middleware/errorHandler');

// Function to convert UTC date to IST
const convertToIST = (date) => {
  const utcDate = new Date(date);
  const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  return new Date(utcDate.getTime() + istOffset);
};

// Function to format date in IST
const formatDateIST = (date) => {
  const istDate = convertToIST(date);
  return istDate.toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  });
};

// @desc    Get comprehensive plan history with IST timestamps
// @route   GET /api/subscriptions/plan-history-enhanced
// @access  Private
const getEnhancedPlanHistory = asyncHandler(async (req, res) => {
  try {
    // Extract userId from JWT token
    const userId = req.user._id;

    // Get all subscriptions for the user
    const subscriptions = await Subscription.find({ user: userId })
      .populate('plan', 'name pricing')
      .sort({ createdAt: -1 })
      .lean();

    if (!subscriptions || subscriptions.length === 0) {
      return res.json([]);
    }

    // Process service history from all subscriptions
    let planHistory = [];
    
    subscriptions.forEach(subscription => {
      if (subscription.serviceHistory && subscription.serviceHistory.length > 0) {
        subscription.serviceHistory.forEach(history => {
          // Only include plan-related events
          if (['activated', 'upgraded', 'downgraded', 'cancelled'].includes(history.type)) {
            // Determine change type for display
            let changeType = 'Activated';
            if (history.type === 'upgraded') changeType = 'Upgraded';
            if (history.type === 'downgraded') changeType = 'Downgraded';
            if (history.type === 'cancelled') changeType = 'Cancelled';

            const planChange = {
              id: history._id || `${subscription._id}_${history.date}`,
              date: history.date,
              dateIST: formatDateIST(history.date),
              type: history.type,
              changeType: changeType,
              description: history.description,
              fromPlan: history.metadata?.previousPlan || null,
              toPlan: history.metadata?.newPlan || history.metadata?.planName || (subscription.plan ? subscription.plan.name : 'Unknown'),
              fromPrice: history.metadata?.previousPrice || null,
              toPrice: history.metadata?.newPrice || history.metadata?.price || (subscription.plan ? subscription.plan.pricing?.monthly : null),
              priceChange: history.metadata?.priceChange || null,
              currency: history.metadata?.currency || 'INR',
              billingCycle: history.metadata?.billingCycle || subscription.billingCycle,
              // Final amount without tax (as requested)
              finalAmount: history.metadata?.newPrice ? history.metadata.newPrice.toFixed(2) : 
                          history.metadata?.price ? history.metadata.price.toFixed(2) : null,
              // Payment status for upgrades/downgrades
              paymentStatus: history.type === 'upgraded' ? 'payment_due' : 
                           history.type === 'downgraded' ? 'refund_pending' : 'completed'
            };
            planHistory.push(planChange);
          }
        });
      }
    });

    // Sort by date (oldest first to show progression)
    planHistory = planHistory.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json(planHistory);

  } catch (error) {
    console.error('Enhanced plan history error:', error);
    res.status(500).json({
      error: 'Failed to fetch enhanced plan history',
      details: error.message
    });
  }
});

module.exports = {
  getEnhancedPlanHistory
};