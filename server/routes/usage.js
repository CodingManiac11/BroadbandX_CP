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
const { usageAnalyticsToCSV, usageLogsToCSV } = require('../utils/csvExport');
const UsageAnalytics = require('../models/UsageAnalytics');
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
 * Export usage data as CSV
 * Query params:
 *   - format: 'aggregated' (default, matches analytics page) or 'detailed' (session logs)
 *   - startDate: Optional start date filter
 *   - endDate: Optional end date filter
 */
router.get('/export/csv', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const isAdmin = req.user.role === 'admin';
    const format = req.query.format || 'aggregated'; // Default to aggregated

    // Get date range from query params (optional)
    const { startDate, endDate } = req.query;
    let dateQuery = {};
    if (startDate || endDate) {
      if (startDate) dateQuery.$gte = new Date(startDate);
      if (endDate) dateQuery.$lte = new Date(endDate);
    }

    let csv;
    let filename;

    if (format === 'detailed') {
      // Export detailed session logs (old behavior)
      let query = {};
      if (!isAdmin) {
        query.userId = userId;
      }
      if (Object.keys(dateQuery).length > 0) {
        query.timestamp = dateQuery;
      }

      const usageLogs = await UsageLog.find(query)
        .populate('userId', 'firstName lastName email')
        .sort({ timestamp: -1 })
        .lean();

      if (usageLogs.length === 0) {
        csv = 'Timestamp,Customer Name,Customer Email,Device Type,Download (GB),Upload (GB),Total (GB),Download Speed (Mbps),Upload Speed (Mbps),Session Duration (min)\n';
      } else {
        csv = usageLogsToCSV(usageLogs);
      }
      filename = `usage_detailed_${new Date().toISOString().split('T')[0]}.csv`;

    } else {
      // Export aggregated analytics (matches usage analytics page - NO DUPLICATES)
      let query = {};
      if (!isAdmin) {
        query.user = userId;
      }
      if (Object.keys(dateQuery).length > 0) {
        query.date = dateQuery;
      }

      const usageAnalytics = await UsageAnalytics.find(query)
        .populate('user', 'firstName lastName email')
        .populate({
          path: 'subscription',
          populate: {
            path: 'plan',
            select: 'name'
          }
        })
        .sort({ date: -1 })
        .lean();

      if (usageAnalytics.length === 0) {
        csv = 'Date,Customer Name,Customer Email,Plan Name,Data Used (GB),Avg Download Speed (Mbps),Avg Upload Speed (Mbps),Total Sessions,Avg Session Duration (min),Uptime (%),Packet Loss (%)\n';
      } else {
        csv = usageAnalyticsToCSV(usageAnalytics);
      }
      filename = `usage_analytics_${new Date().toISOString().split('T')[0]}.csv`;
    }

    // Set headers for CSV download
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