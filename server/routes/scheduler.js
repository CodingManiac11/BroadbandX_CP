const express = require('express');
const router = express.Router();
const schedulerService = require('../services/SchedulerService');
const { authenticateToken, authorize } = require('../middleware/auth');
const { body, param, validationResult } = require('express-validator');

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
 * GET /api/scheduler/status
 * Get scheduler status and job information
 */
router.get('/status', [
  authenticateToken,
  authorize('admin')
], async (req, res) => {
  try {
    const status = schedulerService.getStatus();
    
    res.json({
      success: true,
      status: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get scheduler status',
      error: error.message
    });
  }
});

/**
 * POST /api/scheduler/start
 * Start the scheduler service
 */
router.post('/start', [
  authenticateToken,
  authorize('admin')
], async (req, res) => {
  try {
    await schedulerService.start();
    
    res.json({
      success: true,
      message: 'Scheduler started successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to start scheduler',
      error: error.message
    });
  }
});

/**
 * POST /api/scheduler/stop
 * Stop the scheduler service
 */
router.post('/stop', [
  authenticateToken,
  authorize('admin')
], async (req, res) => {
  try {
    schedulerService.stop();
    
    res.json({
      success: true,
      message: 'Scheduler stopped successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to stop scheduler',
      error: error.message
    });
  }
});

/**
 * POST /api/scheduler/run-job/:jobName
 * Manually run a specific scheduler job
 */
router.post('/run-job/:jobName', [
  authenticateToken,
  authorize('admin'),
  param('jobName').isIn([
    'dailyInvoiceGeneration',
    'processScheduledChanges', 
    'processScheduledCancellations',
    'finalizeDraftInvoices',
    'sendPaymentReminders',
    'cleanupOldRecords'
  ]).withMessage('Invalid job name')
], handleValidationErrors, async (req, res) => {
  try {
    const result = await schedulerService.runJob(req.params.jobName);
    
    res.json({
      success: true,
      message: `Job ${req.params.jobName} completed successfully`,
      result: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Job ${req.params.jobName} failed`,
      error: error.message
    });
  }
});

/**
 * POST /api/scheduler/generate-invoice
 * Manually trigger invoice generation
 */
router.post('/generate-invoice', [
  authenticateToken,
  authorize('admin'),
  body('subscription_id').optional().isMongoId().withMessage('Invalid subscription ID')
], handleValidationErrors, async (req, res) => {
  try {
    const { subscription_id } = req.body;
    
    const result = await schedulerService.triggerInvoiceGeneration(subscription_id);
    
    res.json({
      success: true,
      message: result.message || 'Invoice generation completed',
      result: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Invoice generation failed',
      error: error.message
    });
  }
});

module.exports = router;