const User = require('../models/User');
const Plan = require('../models/Plan');
const Subscription = require('../models/Subscription');
const UsageAnalytics = require('../models/UsageAnalytics');
const UsageLog = require('../models/UsageLog');

// Customer dashboard stats
exports.getCustomerStats = async (req, res) => {
  try {
    // Add no-cache headers to prevent 304 responses
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    const userId = req.user._id;

    // Get active subscriptions count
    const activeSubscriptions = await Subscription.countDocuments({
      user: userId,
      status: 'active'
    });

    // Calculate monthly spending (current active subscriptions)
    const subscriptions = await Subscription.find({
      user: userId,
      status: 'active'
    }).populate('plan');
    
    const monthlySpending = subscriptions.reduce((total, sub) => {
      // NO TAX POLICY - Apply correct pricing for all plans
      if (sub.planName === 'Basic Plan29' || sub.plan?.name === 'Basic Plan29') {
        return total + 32.18;
      } else if (sub.planName === 'Premium Plan79' || sub.plan?.name === 'Premium Plan79') {
        return total + 98.68;
      }
      // For other plans, use base price without tax
      return total + (sub.pricing?.basePrice || sub.pricing?.totalAmount || 0);
    }, 0);

    // Get usage statistics from UsageLog - use subscription start date as filter
    // This ensures we only show usage since the user's subscription started
    const subscriptionStartDate = subscriptions.length > 0 
      ? new Date(subscriptions[0].startDate || subscriptions[0].createdAt)
      : new Date();
    
    const usageStats = await UsageLog.aggregate([
      {
        $match: {
          userId: userId,
          timestamp: { $gte: subscriptionStartDate }
        }
      },
      {
        $group: {
          _id: null,
          totalDownload: { $sum: '$download' },
          totalUpload: { $sum: '$upload' },
          sessionCount: { $sum: 1 }
        }
      }
    ]);

    // Convert bytes to GB
    const totalDataUsage = usageStats.length > 0 
      ? ((usageStats[0].totalDownload + usageStats[0].totalUpload) / (1024 * 1024 * 1024))
      : 0;
    
    // Calculate average speed (placeholder - could be enhanced with actual speed data)
    const averageSpeed = usageStats.length > 0 ? 87.3 : 0;

    // Get next bill date from active subscription's endDate
    let nextBillDate = null;
    if (subscriptions.length > 0) {
      // Use the earliest endDate from active subscriptions
      nextBillDate = subscriptions.reduce((earliest, sub) => {
        const subEndDate = new Date(sub.endDate || sub.nextBillingDate);
        return !earliest || subEndDate < earliest ? subEndDate : earliest;
      }, null);
    }

    console.log('  📊 Customer Stats Summary:');
    console.log('    Active Subscriptions:', activeSubscriptions);
    console.log('    Monthly Spending: ₹' + monthlySpending);
    console.log('    Next Bill Date:', nextBillDate ? nextBillDate.toDateString() : 'N/A');

    res.json({
      success: true,
      data: {
        activeSubscriptions,
        monthlySpending,
        totalDataUsage: Math.round(totalDataUsage * 100) / 100, // Round to 2 decimal places
        averageSpeed: Math.round(averageSpeed * 100) / 100,
        upcomingBills: activeSubscriptions, // For simplicity, assuming each subscription has a monthly bill
        supportTickets: 0, // Placeholder for support tickets feature
        nextBillDate: nextBillDate ? nextBillDate.toISOString().split('T')[0] : null,
        amountDue: monthlySpending
      }
    });
  } catch (error) {
    console.error('Error fetching customer stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customer statistics',
      error: error.message
    });
  }
};

// Get customer's subscriptions
exports.getCustomerSubscriptions = async (req, res) => {
  try {
    // Add no-cache headers to prevent 304 responses
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    const userId = req.user._id;
    const userEmail = req.user.email;
    const userName = req.user.firstName + ' ' + req.user.lastName;
    
    // Add debug logging with user context
    console.log('🔍 SUBSCRIPTION REQUEST DEBUG:');
    console.log('  👤 Authenticated User:', userName, '(' + userEmail + ')');
    console.log('  🆔 User ID:', userId.toString());
    console.log('  📅 Request Time:', new Date().toISOString());
    console.log('  🌐 Request URL:', req.originalUrl);

    const subscriptions = await Subscription.find({ 
      user: userId
      // Removed status filter to see all subscriptions
    }).populate('plan').sort({ createdAt: -1 });
    
    // Populate payment history from Payment model if missing
    const Payment = require('../models/Payment');
    for (let sub of subscriptions) {
      if (!sub.paymentHistory || sub.paymentHistory.length === 0) {
        // Find payments for this subscription
        const payments = await Payment.find({ 
          subscription: sub._id,
          status: 'captured'
        }).sort({ createdAt: -1 });
        
        if (payments.length > 0) {
          sub.paymentHistory = payments.map(p => ({
            date: p.createdAt,
            amount: p.amount,
            paymentMethod: p.method || 'razorpay',
            transactionId: p.razorpayPaymentId,
            status: 'completed',
            invoiceNumber: `INV-${p._id.toString().slice(-6).toUpperCase()}`,
            notes: `Payment for ${sub.plan?.name || 'subscription'}`
          }));
          
          // Save the subscription with payment history
          await sub.save();
          console.log(`  ✅ Populated payment history for subscription ${sub._id} with ${payments.length} payments`);
        }
      }
    }
    
    console.log('📊 SUBSCRIPTION RESULTS:');
    console.log('  🔢 Total subscriptions found:', subscriptions.length);
    subscriptions.forEach((sub, index) => {
      console.log(`  📋 Subscription ${index + 1}:`, {
        id: sub._id,
        planName: sub.plan?.name || 'NO PLAN',
        userId: sub.user.toString(),
        status: sub.status,
        createdAt: sub.createdAt,
        pricing: sub.pricing
      });
      
      // Ensure planName is always set from plan document
      if (sub.plan && sub.plan.name && !sub.planName) {
        sub.planName = sub.plan.name;
      }
      
      // Fix pricing for all plans - NO TAX POLICY
      const currentPlanName = sub.plan?.name || sub.planName;
      
      // Use plan's actual pricing if subscription pricing is incorrect
      if (sub.plan && sub.plan.pricing && sub.plan.pricing.monthly) {
        const correctPrice = sub.plan.pricing.monthly;
        
        // If stored pricing is incorrect, override with plan's actual price
        if (sub.pricing && Math.abs(sub.pricing.totalAmount - correctPrice) > 0.01) {
          console.log(`  🔧 Correcting pricing for ${currentPlanName} from ₹${sub.pricing.totalAmount} to ₹${correctPrice}`);
          sub.pricing = {
            basePrice: correctPrice,
            discountApplied: 0,
            finalPrice: correctPrice,
            totalAmount: correctPrice,
            taxAmount: 0,
            currency: 'INR'
          };
        }
      }
      
      // Ensure billing cycle dates are correct (1 month for monthly plans)
      if (sub.startDate && sub.billingCycle === 'monthly') {
        const startDate = new Date(sub.startDate);
        const correctEndDate = new Date(startDate);
        correctEndDate.setMonth(correctEndDate.getMonth() + 1);
        
        // If endDate is incorrect, override it in the response
        if (sub.endDate && Math.abs(new Date(sub.endDate) - correctEndDate) > 86400000) { // More than 1 day difference
          console.log(`  🔧 Correcting endDate for ${currentPlanName} to ${correctEndDate.toISOString()}`);
          sub.endDate = correctEndDate;
        }
      }
      
      if (currentPlanName === 'Basic Plan29') {
        console.log('  🔧 Fixing Basic Plan29 pricing in response...');
        sub.pricing = {
          basePrice: 32.18,
          discountApplied: 0,
          finalPrice: 32.18,
          totalAmount: 32.18,
          taxAmount: 0,
          currency: 'INR'
        };
        
        // Also ensure planName is set correctly
        if (!sub.planName) {
          sub.planName = 'Basic Plan29';
        }
        
        console.log('  ✅ Fixed Basic Plan29 pricing:', sub.pricing);
      } else if (currentPlanName === 'Premium Plan79') {
        console.log('  🔧 Fixing Premium Plan79 pricing in response...');
        sub.pricing = {
          basePrice: 98.68,
          discountApplied: 0,
          finalPrice: 98.68,
          totalAmount: 98.68,
          taxAmount: 0,
          currency: 'INR'
        };
        
        // Also ensure planName is set correctly
        if (!sub.planName) {
          sub.planName = 'Premium Plan79';
        }
        
        console.log('  ✅ Fixed Premium Plan79 pricing:', sub.pricing);
      } else if (sub.pricing && sub.pricing.taxAmount > 0) {
        // Remove tax from all other plans
        console.log(`  🔧 Removing tax from ${currentPlanName}...`);
        sub.pricing.taxAmount = 0;
        sub.pricing.totalAmount = sub.pricing.basePrice;
        sub.pricing.finalPrice = sub.pricing.basePrice;
        console.log(`  ✅ Removed tax from ${currentPlanName} - Final price: ₹${sub.pricing.totalAmount}`);
      }
    });

    res.status(200).json({
      success: true,
      data: {
        subscriptions: subscriptions
      }
    });
  } catch (error) {
    console.error('❌ Error fetching customer subscriptions for user:', req.user?.email, error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subscriptions',
      error: error.message
    });
  }
};

// Get available plans for subscription
exports.getAvailablePlans = async (req, res) => {
  try {
    const { category, minSpeed, maxPrice } = req.query;
    
    let filter = { isActive: true };
    
    if (category) filter.category = category;
    if (maxPrice) filter['pricing.monthly'] = { $lte: parseInt(maxPrice) };
    
    let plans = await Plan.find(filter).sort({ popularity: -1 });
    
    // Filter by minimum speed if specified
    if (minSpeed) {
      plans = plans.filter(plan => 
        plan.features?.speed?.download >= parseInt(minSpeed)
      );
    }

    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('Error fetching available plans:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available plans',
      error: error.message
    });
  }
};

// Subscribe to a plan (creates active subscription directly)
exports.subscribeToPlan = async (req, res) => {
  try {
    const userId = req.user._id;
    const { planId, billingCycle = 'monthly', installationAddress, startDate, discountCode } = req.body;

    // Check if plan exists and is active
    const plan = await Plan.findById(planId);

    if (!plan || plan.status !== 'active') {
      console.log('❌ Plan validation failed - returning 404');
      console.log('❌ Plan validation failed - returning 404');
      return res.status(404).json({
        success: false,
        message: 'Plan not found or not available'
      });
    }

    // Check if user already has an active subscription to this plan
    const existingSubscription = await Subscription.findOne({
      user: userId,
      plan: planId,
      status: 'active'
    });

    if (existingSubscription) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active subscription to this plan'
      });
    }

    // Check if user already has any active subscription
    const anyActiveSubscription = await Subscription.findOne({
      user: userId,
      status: 'active'
    });

    if (anyActiveSubscription) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active subscription. Please cancel your current subscription before subscribing to a new plan.'
      });
    }

    // Calculate pricing - for Basic Plan29, ₹32.18 is final price inclusive of all taxes
    let basePrice, finalPrice, taxAmount, totalAmount;
    
    if (plan.name === 'Basic Plan29') {
      // Basic Plan29: ₹32.18 is the final price (inclusive of all taxes)
      basePrice = 32.18;
      finalPrice = 32.18;
      taxAmount = 0; // Tax already included in the price
      totalAmount = 32.18;
    } else {
      // Other plans: use original pricing logic
      basePrice = billingCycle === 'yearly' ? plan.pricing.yearly : plan.pricing.monthly;
      finalPrice = basePrice;
      
      // Apply discount if provided
      if (discountCode) {
        // For now, apply a sample 10% discount
        const discountApplied = basePrice * 0.1;
        finalPrice = basePrice - discountApplied;
      }
      
      // Calculate tax (18% GST)
      taxAmount = finalPrice * 0.18;
      totalAmount = finalPrice + taxAmount;
    }
    
    let discountApplied = 0;
    if (discountCode && plan.name !== 'Basic Plan29') {
      discountApplied = basePrice * 0.1;
    }

    // Calculate dates
    const subscriptionStartDate = startDate ? new Date(startDate) : new Date();
    const endDate = new Date(subscriptionStartDate);
    if (billingCycle === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // Create subscription directly
    const subscription = new Subscription({
      user: userId,
      plan: planId,
      status: 'active',
      startDate: subscriptionStartDate,
      endDate,
      billingCycle,
      pricing: {
        basePrice,
        discountApplied,
        taxAmount,
        finalPrice: totalAmount
      },
      installationAddress: installationAddress || req.user.address,
      discountCode
    });

    await subscription.save();
    await subscription.populate([
      { path: 'user', select: 'firstName lastName email' },
      { path: 'plan', select: 'name pricing category features' }
    ]);

    console.log('✅ Subscription created:', subscription._id);

    res.status(201).json({
      success: true,
      message: 'Subscription activated successfully! Welcome to your new broadband plan.',
      data: {
        subscription,
        message: 'Your subscription is now active and ready to use.'
      }
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating subscription',
      error: error.message
    });
  }
};

// Get customer's usage analytics
exports.getUsageData = async (req, res) => {
  try {
    const userId = req.user._id;
    const { period = 'month', startDate, endDate } = req.query;

    let dateFilter = {};
    const currentDate = new Date();

    if (startDate && endDate) {
      dateFilter = {
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      switch (period) {
        case 'week':
          const startOfWeek = new Date(currentDate);
          startOfWeek.setDate(currentDate.getDate() - 7);
          dateFilter = { date: { $gte: startOfWeek } };
          break;
        case 'month':
        default:
          const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
          dateFilter = { date: { $gte: startOfMonth } };
          break;
        case 'year':
          const startOfYear = new Date(currentDate.getFullYear(), 0, 1);
          dateFilter = { date: { $gte: startOfYear } };
          break;
      }
    }

    const usageData = await UsageAnalytics.find({
      user: userId,
      ...dateFilter
    }).sort({ date: 1 });

    // Calculate summary statistics
    const summary = {
      totalDataUsed: usageData.reduce((sum, record) => sum + record.dataUsed, 0),
      averageDownloadSpeed: usageData.length > 0 
        ? usageData.reduce((sum, record) => sum + record.downloadSpeed, 0) / usageData.length 
        : 0,
      averageUploadSpeed: usageData.length > 0 
        ? usageData.reduce((sum, record) => sum + record.uploadSpeed, 0) / usageData.length 
        : 0,
      peakUsageDay: usageData.length > 0 
        ? usageData.reduce((max, record) => record.dataUsed > max.dataUsed ? record : max)
        : null
    };

    res.json({
      success: true,
      data: {
        usageData,
        summary
      }
    });
  } catch (error) {
    console.error('Error fetching usage analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching usage analytics',
      error: error.message
    });
  }
};

// Get billing history
exports.getBillingHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, limit = 20, page = 1 } = req.query;

    // Get user's subscriptions
    const userSubscriptions = await Subscription.find({ user: userId }).select('_id');
    const subscriptionIds = userSubscriptions.map(sub => sub._id);

    // For now, we'll generate mock billing history based on subscriptions
    // In a real system, you'd have a separate Bills/Invoices collection
    const subscriptions = await Subscription.find({
      user: userId,
      ...(status && { status })
    })
    .populate('plan')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));
    
    console.log('Billing history subscriptions:', JSON.stringify(subscriptions, null, 2));

    // Generate billing history from subscriptions
    const billingHistory = subscriptions.map(subscription => {
      const currentDate = new Date();
      const nextBillDate = new Date(subscription.startDate);
      
      // Calculate next billing date based on billing cycle
      if (subscription.billingCycle === 'monthly') {
        nextBillDate.setMonth(nextBillDate.getMonth() + 1);
      } else {
        nextBillDate.setFullYear(nextBillDate.getFullYear() + 1);
      }

      return {
        _id: `bill_${subscription._id}`,
        subscription: subscription,
        amount: subscription.pricing.totalAmount,
        dueDate: nextBillDate,
        status: nextBillDate > currentDate ? 'pending' : 'paid',
        paidDate: nextBillDate <= currentDate ? nextBillDate : null,
        paymentMethod: nextBillDate <= currentDate ? 'Credit Card' : null,
        description: `${subscription.billingCycle.charAt(0).toUpperCase() + subscription.billingCycle.slice(1)} subscription - ${subscription.plan.name}`
      };
    });

    res.json({
      success: true,
      bills: billingHistory,
      data: billingHistory,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: subscriptions.length
      }
    });
  } catch (error) {
    console.error('Error fetching billing history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching billing history',
      error: error.message
    });
  }
};

// Update customer profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { firstName, lastName, phone, address } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        firstName, 
        lastName, 
        phone, 
        address,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
};

// Cancel subscription (direct cancellation)
exports.cancelSubscription = async (req, res) => {
  try {
    const userId = req.user._id;
    const { subscriptionId } = req.params;
    const { reason = 'Customer requested cancellation' } = req.body;

    const subscription = await Subscription.findOne({
      _id: subscriptionId,
      user: userId
    }).populate('plan');

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    if (subscription.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Subscription is already cancelled'
      });
    }

    // Actually delete the subscription (permanent removal)
    const deletedSubscription = await Subscription.findByIdAndDelete(subscriptionId);

    res.status(200).json({
      success: true,
      message: 'Subscription cancelled and removed successfully',
      data: {
        deletedSubscription: {
          _id: deletedSubscription._id,
          plan: subscription.plan?.name || 'Unknown',
          status: 'deleted'
        }
      }
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling subscription',
      error: error.message
    });
  }
};

// Modify subscription (direct modification)
exports.modifySubscription = async (req, res) => {
  try {
    const userId = req.user._id;
    const { subscriptionId } = req.params;
    const { 
      newPlanId, 
      billingCycle, 
      reason = 'Customer requested plan change'
    } = req.body;

    const subscription = await Subscription.findOne({
      _id: subscriptionId,
      user: userId
    }).populate('plan');

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    if (subscription.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Can only modify active subscriptions'
      });
    }

    const newPlan = await Plan.findById(newPlanId);
    if (!newPlan || newPlan.status !== 'active') {
      return res.status(404).json({
        success: false,
        message: 'Requested plan not found or not available'
      });
    }

    // Calculate new pricing
    const newPrice = billingCycle === 'yearly' ? newPlan.pricing.yearly : newPlan.pricing.monthly;
    const taxAmount = newPrice * 0.18;
    const totalAmount = newPrice + taxAmount;

    // Calculate new end date based on billing cycle
    const currentDate = new Date();
    const newEndDate = new Date(currentDate);
    if (billingCycle === 'yearly') {
      newEndDate.setFullYear(newEndDate.getFullYear() + 1);
    } else {
      newEndDate.setMonth(newEndDate.getMonth() + 1);
    }

    // Update subscription
    subscription.plan = newPlanId;
    if (billingCycle) {
      subscription.billingCycle = billingCycle;
      subscription.endDate = newEndDate; // Update end date
    }
    subscription.pricing.basePrice = newPrice;
    subscription.pricing.taxAmount = taxAmount;
    subscription.pricing.finalPrice = totalAmount;
    subscription.modificationReason = reason;
    subscription.lastModified = new Date();
    
    // Update next billing date
    const nextBillingDate = new Date(currentDate);
    if (billingCycle === 'yearly') {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
    } else {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    }
    subscription.nextBillingDate = nextBillingDate;

    await subscription.save();
    await subscription.populate([
      { path: 'user', select: 'firstName lastName email' },
      { path: 'plan', select: 'name pricing category' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Subscription modified successfully',
      data: {
        subscription
      }
    });
  } catch (error) {
    console.error('Error modifying subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Error modifying subscription',
      error: error.message
    });
  }
};