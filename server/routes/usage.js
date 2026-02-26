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
      // Export aggregated analytics from UsageLog (always has latest data)
      let matchQuery = {};
      if (!isAdmin) {
        matchQuery.userId = userId;
      }
      if (Object.keys(dateQuery).length > 0) {
        matchQuery.timestamp = dateQuery;
      }

      // Aggregate UsageLog by date and user
      const aggregated = await UsageLog.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
              userId: '$userId'
            },
            totalDownload: { $sum: '$download' },
            totalUpload: { $sum: '$upload' },
            avgDownloadSpeed: { $avg: '$downloadSpeed' },
            avgUploadSpeed: { $avg: '$uploadSpeed' },
            totalSessions: { $sum: 1 },
            avgSessionDuration: { $avg: '$sessionDuration' },
            avgLatency: { $avg: '$latency' },
            avgPacketLoss: { $avg: '$packetLoss' },
            avgUptime: { $avg: { $ifNull: ['$uptime', 99] } }
          }
        },
        { $sort: { '_id.date': -1 } }
      ]);

      // Get unique user IDs and fetch user + subscription info
      const User = require('../models/User');
      const Subscription = require('../models/Subscription');

      const userIds = [...new Set(aggregated.map(r => r._id.userId.toString()))];
      const users = await User.find({ _id: { $in: userIds } }).select('firstName lastName email').lean();
      const userMap = {};
      users.forEach(u => { userMap[u._id.toString()] = u; });

      const subs = await Subscription.find({ user: { $in: userIds }, status: 'active' }).populate('plan', 'name').lean();
      const subMap = {};
      subs.forEach(s => { subMap[s.user.toString()] = s; });

      const GB = 1073741824;
      const rows = aggregated.map(r => {
        const uid = r._id.userId.toString();
        const u = userMap[uid];
        const sub = subMap[uid];
        const name = u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : 'Unknown';
        const email = u?.email || 'N/A';
        const planName = sub?.plan?.name || 'N/A';
        const dataUsedGB = ((r.totalDownload + r.totalUpload) / GB).toFixed(2);

        return `${r._id.date},"${name}","${email}","${planName}",${dataUsedGB},${(r.avgDownloadSpeed || 0).toFixed(2)},${(r.avgUploadSpeed || 0).toFixed(2)},${r.totalSessions},${(r.avgSessionDuration || 0).toFixed(2)},${(r.avgUptime || 99).toFixed(2)},${(r.avgPacketLoss || 0).toFixed(2)}`;
      });

      csv = 'Date,Customer Name,Customer Email,Plan Name,Data Used (GB),Avg Download Speed (Mbps),Avg Upload Speed (Mbps),Total Sessions,Avg Session Duration (min),Uptime (%),Packet Loss (%)\n' + rows.join('\n');
      filename = `all_usage_${new Date().toISOString().split('T')[0]}.csv`;
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

/**
 * GET /api/usage/export/user-summary
 * Export usage per user as CSV with both current month and subscription period totals
 */
router.get('/export/user-summary', authMiddleware, async (req, res) => {
  try {
    // Only admins can access this
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const Subscription = require('../models/Subscription');

    // Get all active subscriptions with user and plan data
    const subscriptions = await Subscription.find({
      status: { $in: ['active', 'trial'] }
    })
      .populate('user', 'firstName lastName email')
      .populate('plan', 'name')
      .lean();

    // For each subscription, get usage stats
    const userSummaries = await Promise.all(subscriptions.map(async (sub) => {
      if (!sub.user) return null;

      const userId = sub.user._id;
      const subscriptionStart = new Date(sub.startDate);
      const currentMonthStart = new Date();
      currentMonthStart.setDate(1);
      currentMonthStart.setHours(0, 0, 0, 0);

      // Get current month usage
      const currentMonthUsage = await UsageLog.aggregate([
        { $match: { userId: userId, timestamp: { $gte: currentMonthStart } } },
        {
          $group: {
            _id: null,
            totalDownload: { $sum: '$download' },
            totalUpload: { $sum: '$upload' },
            avgDownloadSpeed: { $avg: '$downloadSpeed' },
            avgUploadSpeed: { $avg: '$uploadSpeed' },
            sessions: { $sum: 1 }
          }
        }
      ]);

      // Get subscription period usage
      const subscriptionUsage = await UsageLog.aggregate([
        { $match: { userId: userId, timestamp: { $gte: subscriptionStart } } },
        {
          $group: {
            _id: null,
            totalDownload: { $sum: '$download' },
            totalUpload: { $sum: '$upload' },
            avgDownloadSpeed: { $avg: '$downloadSpeed' },
            avgUploadSpeed: { $avg: '$uploadSpeed' },
            sessions: { $sum: 1 }
          }
        }
      ]);

      const cm = currentMonthUsage[0] || { totalDownload: 0, totalUpload: 0, avgDownloadSpeed: 0, avgUploadSpeed: 0, sessions: 0 };
      const sp = subscriptionUsage[0] || { totalDownload: 0, totalUpload: 0, avgDownloadSpeed: 0, avgUploadSpeed: 0, sessions: 0 };
      const GB = 1073741824;

      return {
        userName: `${sub.user.firstName || ''} ${sub.user.lastName || ''}`.trim() || 'Unknown',
        userEmail: sub.user.email || 'N/A',
        planName: sub.plan?.name || 'No Plan',
        subscriptionStart: sub.startDate ? new Date(sub.startDate).toISOString().split('T')[0] : 'N/A',
        cmDownload: Math.round((cm.totalDownload / GB) * 100) / 100,
        cmUpload: Math.round((cm.totalUpload / GB) * 100) / 100,
        cmTotal: Math.round(((cm.totalDownload + cm.totalUpload) / GB) * 100) / 100,
        cmSessions: cm.sessions,
        spDownload: Math.round((sp.totalDownload / GB) * 100) / 100,
        spUpload: Math.round((sp.totalUpload / GB) * 100) / 100,
        spTotal: Math.round(((sp.totalDownload + sp.totalUpload) / GB) * 100) / 100,
        spSessions: sp.sessions,
        avgDlSpeed: Math.round((sp.avgDownloadSpeed || 0) * 100) / 100,
        avgUlSpeed: Math.round((sp.avgUploadSpeed || 0) * 100) / 100
      };
    }));

    const validSummaries = userSummaries.filter(s => s !== null);

    const headers = 'Customer Name,Email,Plan,Subscription Start,Current Month Download (GB),Current Month Upload (GB),Current Month Total (GB),Current Month Sessions,Subscription Total Download (GB),Subscription Total Upload (GB),Subscription Total Usage (GB),Subscription Total Sessions,Avg Download Speed (Mbps),Avg Upload Speed (Mbps)\n';

    const rows = validSummaries.map(u =>
      `"${u.userName}","${u.userEmail}","${u.planName}","${u.subscriptionStart}",${u.cmDownload},${u.cmUpload},${u.cmTotal},${u.cmSessions},${u.spDownload},${u.spUpload},${u.spTotal},${u.spSessions},${u.avgDlSpeed},${u.avgUlSpeed}`
    ).join('\n');

    const csv = headers + rows;
    const filename = `user_usage_summary_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);

  } catch (error) {
    console.error('Error exporting user summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export user summary',
      error: error.message
    });
  }
});

module.exports = router;