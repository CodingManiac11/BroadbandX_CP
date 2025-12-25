const express = require('express');
const router = express.Router();
const BillingService = require('../services/BillingService');
const AdjustmentService = require('../services/AdjustmentService');
const BillingPlan = require('../models/BillingPlan');
const BillingSubscription = require('../models/BillingSubscription');
const BillingInvoice = require('../models/BillingInvoice');
const InvoiceLineItem = require('../models/InvoiceLineItem');
const { authenticateToken } = require('../middleware/auth');
const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array()
    });
  }
  next();
};

/**
 * Middleware for idempotency support
 */
const idempotencyMiddleware = (req, res, next) => {
  const idempotencyKey = req.headers['idempotency-key'];
  if (idempotencyKey) {
    req.idempotencyKey = idempotencyKey;
    // In production, you would check cache/database for existing operations
    // For now, we'll just pass the key through
  }
  next();
};

/**
 * GET /api/billing/plans
 * Get all active billing plans
 */
router.get('/plans', async (req, res) => {
  try {
    const plans = await BillingPlan.findActive();
    
    const formattedPlans = plans.map(plan => ({
      id: plan._id,
      name: plan.name,
      description: plan.description,
      monthly_price: parseFloat((plan.monthly_price_cents / 100).toFixed(2)),
      monthly_price_formatted: plan.monthly_price_formatted,
      features: plan.features,
      data_limit_gb: plan.data_limit_gb,
      speed_mbps: plan.speed_mbps,
      auto_renew_allowed: plan.auto_renew_allowed,
      is_popular: plan.metadata?.is_popular || false
    }));
    
    res.json({
      success: true,
      plans: formattedPlans
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch billing plans',
      error: error.message
    });
  }
});

/**
 * GET /api/billing/subscription/:subscriptionId
 * Get subscription details with current billing info
 */
router.get('/subscription/:subscriptionId', [
  authenticateToken,
  param('subscriptionId').isMongoId().withMessage('Invalid subscription ID')
], handleValidationErrors, async (req, res) => {
  try {
    const subscription = await BillingSubscription.findById(req.params.subscriptionId)
      .populate('current_plan_id')
      .populate('customer_id', 'name email');
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }
    
    // Check if user owns this subscription
    if (subscription.customer_id._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const billingPeriod = subscription.current_billing_period;
    
    res.json({
      success: true,
      subscription: {
        id: subscription._id,
        status: subscription.status,
        current_plan: {
          id: subscription.current_plan_id._id,
          name: subscription.current_plan_id.name,
          monthly_price: parseFloat((subscription.monthly_price_cents / 100).toFixed(2)),
          monthly_price_formatted: subscription.monthly_price_formatted
        },
        billing_cycle_anchor: subscription.billing_cycle_anchor,
        current_billing_period: {
          start: billingPeriod.start,
          end: billingPeriod.end,
          days_remaining: billingPeriod.days_remaining
        },
        next_billing_date: subscription.next_billing_date,
        created_at: subscription.created_at,
        last_plan_change_date: subscription.last_plan_change_date
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription',
      error: error.message
    });
  }
});

/**
 * POST /api/billing/subscription/:subscriptionId/change-plan
 * Change subscription plan with proration
 */
router.post('/subscription/:subscriptionId/change-plan', [
  authenticateToken,
  idempotencyMiddleware,
  param('subscriptionId').isMongoId().withMessage('Invalid subscription ID'),
  body('new_plan_id').isMongoId().withMessage('Invalid plan ID'),
  body('effective_date').optional().isISO8601().withMessage('Invalid date format'),
  body('reason').optional().isString().isLength({ max: 500 }).withMessage('Reason too long')
], handleValidationErrors, async (req, res) => {
  try {
    const { new_plan_id, effective_date, reason } = req.body;
    
    // Verify subscription ownership
    const subscription = await BillingSubscription.findById(req.params.subscriptionId)
      .populate('customer_id', '_id');
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }
    
    if (subscription.customer_id._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Parse effective date if provided
    const parsedEffectiveDate = effective_date ? new Date(effective_date) : null;
    
    // Execute plan change
    const result = await BillingService.changePlan(
      req.params.subscriptionId,
      new_plan_id,
      parsedEffectiveDate,
      reason || 'Customer requested plan change'
    );
    
    res.json({
      success: true,
      message: 'Plan change initiated successfully',
      data: {
        subscription_id: result.subscription_id,
        old_plan: result.old_plan,
        new_plan: result.new_plan,
        effective_date: result.effective_date,
        proration_type: result.proration_type,
        adjustment_amount: result.adjustment_amount_cents ? 
          parseFloat((result.adjustment_amount_cents / 100).toFixed(2)) : 0,
        adjustment_amount_formatted: result.adjustment_amount_cents ? 
          `₹${Math.abs(result.adjustment_amount_cents / 100).toFixed(2)}` : '₹0.00',
        is_upgrade: result.adjustment_amount_cents > 0,
        is_downgrade: result.adjustment_amount_cents < 0,
        plan_history_id: result.plan_history_id
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/billing/subscription/:subscriptionId/cancel
 * Cancel subscription with optional proration
 */
router.post('/subscription/:subscriptionId/cancel', [
  authenticateToken,
  idempotencyMiddleware,
  param('subscriptionId').isMongoId().withMessage('Invalid subscription ID'),
  body('cancellation_date').optional().isISO8601().withMessage('Invalid date format'),
  body('reason').optional().isString().isLength({ max: 500 }).withMessage('Reason too long'),
  body('immediate').optional().isBoolean().withMessage('Immediate must be boolean')
], handleValidationErrors, async (req, res) => {
  try {
    const { cancellation_date, reason, immediate = true } = req.body;
    
    // Verify subscription ownership
    const subscription = await BillingSubscription.findById(req.params.subscriptionId)
      .populate('customer_id', '_id');
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }
    
    if (subscription.customer_id._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Parse cancellation date if provided
    const parsedCancellationDate = cancellation_date ? new Date(cancellation_date) : null;
    
    // Execute cancellation
    const result = await BillingService.cancelSubscription(
      req.params.subscriptionId,
      parsedCancellationDate,
      reason || 'Customer requested cancellation',
      immediate
    );
    
    res.json({
      success: true,
      message: 'Subscription cancellation processed successfully',
      data: {
        subscription_id: result.subscription_id,
        cancellation_type: result.cancellation_type,
        effective_cancellation_date: result.effective_cancellation_date,
        refund_amount: result.refund_amount_cents ? 
          parseFloat((result.refund_amount_cents / 100).toFixed(2)) : 0,
        refund_amount_formatted: result.refund_amount_cents ? 
          `₹${(result.refund_amount_cents / 100).toFixed(2)}` : '₹0.00',
        status: result.status,
        plan_history_id: result.plan_history_id
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/billing/subscription/:subscriptionId/invoices
 * Get invoices for a subscription
 */
router.get('/subscription/:subscriptionId/invoices', [
  authenticateToken,
  param('subscriptionId').isMongoId().withMessage('Invalid subscription ID'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be >= 1'),
  query('status').optional().isIn(['DRAFT', 'FINAL', 'PAID', 'CANCELLED']).withMessage('Invalid status')
], handleValidationErrors, async (req, res) => {
  try {
    // Verify subscription ownership
    const subscription = await BillingSubscription.findById(req.params.subscriptionId)
      .populate('customer_id', '_id');
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }
    
    if (subscription.customer_id._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    
    // Build query
    const query = { subscription_id: req.params.subscriptionId };
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    // Get invoices with pagination
    const [invoices, total] = await Promise.all([
      BillingInvoice.find(query)
        .sort({ created_at: -1 })
        .limit(limit)
        .skip(skip),
      BillingInvoice.countDocuments(query)
    ]);
    
    const formattedInvoices = invoices.map(invoice => ({
      id: invoice._id,
      invoice_number: invoice.invoice_number,
      status: invoice.status,
      period_start: invoice.period_start,
      period_end: invoice.period_end,
      issued_at: invoice.issued_at,
      due_date: invoice.due_date,
      paid_at: invoice.paid_at,
      subtotal: parseFloat((invoice.subtotal_cents / 100).toFixed(2)),
      tax: parseFloat((invoice.tax_cents / 100).toFixed(2)),
      total: parseFloat((invoice.total_cents / 100).toFixed(2)),
      subtotal_formatted: invoice.subtotal_formatted,
      tax_formatted: invoice.tax_formatted,
      total_formatted: invoice.total_formatted,
      tax_percentage: invoice.tax_percentage
    }));
    
    res.json({
      success: true,
      invoices: formattedInvoices,
      pagination: {
        page: page,
        limit: limit,
        total: total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoices',
      error: error.message
    });
  }
});

/**
 * GET /api/billing/invoice/:invoiceId
 * Get detailed invoice with line items
 */
router.get('/invoice/:invoiceId', [
  authenticateToken,
  param('invoiceId').isMongoId().withMessage('Invalid invoice ID')
], handleValidationErrors, async (req, res) => {
  try {
    // Get invoice with subscription info for ownership check
    const invoice = await BillingInvoice.findById(req.params.invoiceId)
      .populate({
        path: 'subscription_id',
        populate: {
          path: 'customer_id',
          select: '_id'
        }
      });
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    // Check ownership
    if (invoice.subscription_id.customer_id._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Get line items
    const lineItems = await InvoiceLineItem.getByInvoice(req.params.invoiceId);
    
    const formattedLineItems = lineItems.map(item => ({
      id: item._id,
      line_number: item.line_number,
      item_type: item.item_type,
      description: item.detailed_description,
      quantity: item.quantity,
      unit_price: parseFloat((item.unit_price_cents / 100).toFixed(2)),
      total: parseFloat((item.total_cents / 100).toFixed(2)),
      unit_price_formatted: item.unit_price_formatted,
      total_formatted: item.total_formatted,
      taxable: item.taxable,
      period_start: item.period_start,
      period_end: item.period_end
    }));
    
    res.json({
      success: true,
      invoice: {
        id: invoice._id,
        invoice_number: invoice.invoice_number,
        status: invoice.status,
        period_start: invoice.period_start,
        period_end: invoice.period_end,
        issued_at: invoice.issued_at,
        due_date: invoice.due_date,
        paid_at: invoice.paid_at,
        subtotal: parseFloat((invoice.subtotal_cents / 100).toFixed(2)),
        tax: parseFloat((invoice.tax_cents / 100).toFixed(2)),
        total: parseFloat((invoice.total_cents / 100).toFixed(2)),
        subtotal_formatted: invoice.subtotal_formatted,
        tax_formatted: invoice.tax_formatted,
        total_formatted: invoice.total_formatted,
        tax_percentage: invoice.tax_percentage,
        customer_info: invoice.customer_info,
        company_info: invoice.company_info,
        notes: invoice.notes,
        payment_terms: invoice.payment_terms
      },
      line_items: formattedLineItems
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoice',
      error: error.message
    });
  }
});

/**
 * POST /api/billing/invoice/:invoiceId/finalize
 * Finalize a draft invoice
 */
router.post('/invoice/:invoiceId/finalize', [
  authenticateToken,
  param('invoiceId').isMongoId().withMessage('Invalid invoice ID')
], handleValidationErrors, async (req, res) => {
  try {
    const invoice = await BillingInvoice.findById(req.params.invoiceId)
      .populate({
        path: 'subscription_id',
        populate: {
          path: 'customer_id',
          select: '_id'
        }
      });
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }
    
    // Check ownership
    if (invoice.subscription_id.customer_id._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Finalize invoice
    await invoice.finalize();
    
    res.json({
      success: true,
      message: 'Invoice finalized successfully',
      invoice: {
        id: invoice._id,
        invoice_number: invoice.invoice_number,
        status: invoice.status,
        issued_at: invoice.issued_at,
        total_formatted: invoice.total_formatted
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/billing/adjustment
 * Create billing adjustment
 */
router.post('/adjustment', [
  authenticateToken,
  body('subscription_id').isMongoId().withMessage('Invalid subscription ID'),
  body('amount_cents').isInt().withMessage('Amount must be an integer'),
  body('adjustment_type').isIn(['CREDIT', 'CHARGE', 'CORRECTION']).withMessage('Invalid adjustment type'),
  body('reason').isString().isLength({ min: 1, max: 200 }).withMessage('Reason required'),
  body('description').isString().isLength({ min: 1, max: 500 }).withMessage('Description required'),
  body('effective_date').optional().isISO8601().withMessage('Invalid date format'),
  body('taxable').optional().isBoolean().withMessage('Taxable must be boolean')
], handleValidationErrors, async (req, res) => {
  try {
    const {
      subscription_id,
      amount_cents,
      adjustment_type,
      reason,
      description,
      effective_date,
      taxable = false
    } = req.body;
    
    // Verify subscription ownership
    const subscription = await BillingSubscription.findById(subscription_id)
      .populate('customer_id', '_id');
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }
    
    if (subscription.customer_id._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const parsedEffectiveDate = effective_date ? new Date(effective_date) : null;
    
    const result = await AdjustmentService.createAdjustment(
      subscription_id,
      amount_cents,
      adjustment_type,
      reason,
      description,
      parsedEffectiveDate,
      { taxable: taxable }
    );
    
    res.json({
      success: true,
      message: 'Adjustment created successfully',
      adjustment: {
        id: result.adjustment._id,
        amount_formatted: result.amount_formatted,
        type: result.type,
        description: description,
        status: result.adjustment.status,
        effective_date: result.adjustment.effective_date
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/billing/subscription/:subscriptionId/adjustments
 * Get adjustment summary for subscription
 */
router.get('/subscription/:subscriptionId/adjustments', [
  authenticateToken,
  param('subscriptionId').isMongoId().withMessage('Invalid subscription ID'),
  query('start_date').optional().isISO8601().withMessage('Invalid start date'),
  query('end_date').optional().isISO8601().withMessage('Invalid end date')
], handleValidationErrors, async (req, res) => {
  try {
    // Verify subscription ownership
    const subscription = await BillingSubscription.findById(req.params.subscriptionId)
      .populate('customer_id', '_id');
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }
    
    if (subscription.customer_id._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const startDate = req.query.start_date ? new Date(req.query.start_date) : null;
    const endDate = req.query.end_date ? new Date(req.query.end_date) : null;
    
    const summary = await AdjustmentService.getAdjustmentSummary(
      req.params.subscriptionId,
      startDate,
      endDate
    );
    
    // Format the response
    const formattedSummary = {
      total_credits: parseFloat((summary.total_credits_cents / 100).toFixed(2)),
      total_charges: parseFloat((summary.total_charges_cents / 100).toFixed(2)),
      net_adjustment: parseFloat((summary.net_adjustment_cents / 100).toFixed(2)),
      pending_adjustments: parseFloat((summary.pending_adjustments_cents / 100).toFixed(2)),
      applied_adjustments: parseFloat((summary.applied_adjustments_cents / 100).toFixed(2)),
      adjustment_count: summary.adjustment_count,
      adjustments_by_reason: Object.keys(summary.adjustments_by_reason).reduce((acc, reason) => {
        const data = summary.adjustments_by_reason[reason];
        acc[reason] = {
          count: data.count,
          total: parseFloat((data.total_cents / 100).toFixed(2)),
          total_formatted: `₹${Math.abs(data.total_cents / 100).toFixed(2)}`
        };
        return acc;
      }, {}),
      recent_adjustments: summary.adjustments.slice(0, 10).map(adj => ({
        id: adj._id,
        amount: parseFloat((adj.amount_cents / 100).toFixed(2)),
        amount_formatted: `₹${Math.abs(adj.amount_cents / 100).toFixed(2)}`,
        type: adj.adjustment_type,
        reason: adj.reason,
        description: adj.description,
        status: adj.status,
        effective_date: adj.effective_date,
        created_at: adj.created_at
      }))
    };
    
    res.json({
      success: true,
      summary: formattedSummary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch adjustment summary',
      error: error.message
    });
  }
});

// Import billing controller functions
const { 
  processModificationPayment, 
  getOutstandingBalance, 
  processRefund,
  processUpgradePayment,
  createUpgradeScenario,
  getUserInvoices 
} = require('../controllers/billingController');

// Routes for plan modification payments
router.post('/process-modification-payment', authenticateToken, processModificationPayment);
router.get('/outstanding-balance/:subscriptionId', authenticateToken, getOutstandingBalance);
router.post('/process-refund', authenticateToken, processRefund);

// Routes for upgrade billing scenario
router.post('/create-upgrade-scenario', authenticateToken, createUpgradeScenario);
router.post('/process-upgrade-payment/:invoiceId', authenticateToken, processUpgradePayment);
router.get('/invoices/:userId', authenticateToken, getUserInvoices);

// Payment completion endpoint
router.post('/complete-payment', async (req, res) => {
  try {
    const { invoiceId, paymentId, transactionId } = req.body;
    console.log('🎯 Payment completion request:', { invoiceId, paymentId, transactionId });

    if (!invoiceId && !paymentId) {
      return res.status(400).json({ error: 'Invoice ID or Payment ID is required' });
    }

    // Import Subscription model (check if it exists)
    const Subscription = require('../models/Subscription');

    // Find the subscription with the pending payment
    const subscription = await Subscription.findOne({
      'paymentHistory._id': paymentId || invoiceId
    });

    if (!subscription) {
      console.log('❌ Subscription not found for payment:', paymentId || invoiceId);
      return res.status(404).json({ error: 'Payment not found' });
    }

    console.log('📋 Found subscription:', subscription._id);

    // Update the specific payment in paymentHistory
    const paymentIndex = subscription.paymentHistory.findIndex(
      p => p._id.toString() === (paymentId || invoiceId)
    );

    if (paymentIndex === -1) {
      console.log('❌ Payment not found in history');
      return res.status(404).json({ error: 'Payment not found in history' });
    }

    // Update payment status
    subscription.paymentHistory[paymentIndex].status = 'completed';
    subscription.paymentHistory[paymentIndex].paymentMethod = 'upi';
    subscription.paymentHistory[paymentIndex].transactionId = transactionId || `TXN${Date.now()}`;
    subscription.paymentHistory[paymentIndex].date = new Date();

    // Save the updated subscription
    await subscription.save();

    console.log('✅ Payment status updated successfully');

    res.json({
      success: true,
      message: 'Payment completed successfully',
      payment: subscription.paymentHistory[paymentIndex]
    });

  } catch (error) {
    console.error('❌ Error completing payment:', error);
    res.status(500).json({ error: 'Failed to complete payment' });
  }
});

module.exports = router;