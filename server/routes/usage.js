const express = require('express');
const {
  getCurrentUsage,
  getDailyUsage,
  getMonthlyUsage,
  getHourlyUsage,
  getDeviceDistribution,
  generateSampleUsage,
  generateUsageForAll,
} = require('../controllers/usageController');
const { usageLogsToCSV } = require('../utils/csvExport');
const UsageLog = require('../models/UsageLog');

const router = express.Router();
const { protect, authenticateToken } = require('../middleware/auth');

// Use authenticateToken middleware (which is used in server.js)
const authMiddleware = authenticateToken || protect;

// Current usage endpoint (without userId in path since we get it from token)
router.get('/current', authMiddleware, getCurrentUsage);

// Usage history endpoint  
router.get('/history', authMiddleware, getDailyUsage);

// Generate usage data (for admin/debug)
router.post('/generate', authMiddleware, generateSampleUsage);
router.post('/generate/:userId', authMiddleware, generateSampleUsage);
router.post('/generate-all', authMiddleware, generateUsageForAll);

// Other endpoints with userId
router.get('/current/:userId', authMiddleware, getCurrentUsage);
router.get('/daily/:userId', authMiddleware, getDailyUsage);
router.get('/monthly/:userId', authMiddleware, getMonthlyUsage);
router.get('/hourly/:userId', authMiddleware, getHourlyUsage);
router.get('/devices/:userId', authMiddleware, getDeviceDistribution);

/**
 * GET /api/usage/export/csv
 * Export usage logs as CSV
 */
router.get('/export/csv', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Build query based on user role
    let query = {};
    if (!isAdmin) {
      query = { user: userId };
    }

    // Get date range from query params (optional)
    const { startDate, endDate } = req.query;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // Get usage logs with populated fields
    const usageLogs = await UsageLog.find(query)
      .populate('user', 'firstName lastName email')
      .populate({
        path: 'subscription',
        populate: { path: 'plan', select: 'name' }
      })
      .sort({ date: -1 })
      .lean();

    if (usageLogs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No usage data found'
      });
    }

    // Convert to CSV
    const csv = usageLogsToCSV(usageLogs);

    // Set headers for CSV download
    const filename = `usage_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    res.send(csv);
  } catch (error) {
    console.error('Error exporting usage to CSV:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export usage data',
      error: error.message
    });
  }
});

module.exports = router;