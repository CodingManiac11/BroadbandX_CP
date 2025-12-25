const express = require('express');
const router = express.Router();
const {
  recordUsage,
  getCurrentUsage,
  getUsageHistory,
  getUsageStats,
  getDailyUsage,
  getAllUsage,
  resetUsage
} = require('../controllers/usageTrackingController');
const { authenticateToken, authorize } = require('../middleware/auth');

// User routes
router.post('/record', authenticateToken, recordUsage);
router.get('/current', authenticateToken, getCurrentUsage);
router.get('/history', authenticateToken, getUsageHistory);
router.get('/stats', authenticateToken, getUsageStats);
router.get('/daily', authenticateToken, getDailyUsage);

// Admin routes
router.get('/admin/all', authenticateToken, authorize('admin'), getAllUsage);
router.put('/admin/reset/:userId', authenticateToken, authorize('admin'), resetUsage);

module.exports = router;
