const express = require('express');
const {
  getDashboardStats,
  getUserManagement,
  getSubscriptionAnalytics,
  getRevenueAnalytics,
  getTopPlans,
  getUsageAnalytics,
  getCustomerInsights,
  getUserById,
  updateUserStatus,
  createAdminUser,
  createUser,
  updateUser,
  deleteUser,
  getSystemHealth,
  getAllSubscriptions,
  activateSubscription
} = require('../controllers/adminController');
const { adminOnly, authenticateToken } = require('../middleware/auth');
const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(adminOnly);

// Dashboard and analytics
router.get('/dashboard', getDashboardStats);
router.get('/subscriptions', getAllSubscriptions);
router.put('/subscriptions/:id/activate', activateSubscription);

// Analytics routes
router.get('/analytics/subscriptions', getSubscriptionAnalytics);
router.get('/analytics/revenue', getRevenueAnalytics);
router.get('/analytics/top-plans', getTopPlans);
router.get('/analytics/usage', getUsageAnalytics);
router.get('/analytics/customers', getCustomerInsights);

// User management
router.get('/users', getUserManagement);
router.post('/users', createUser);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.put('/users/:id/status', updateUserStatus);
router.post('/users/admin', createAdminUser);

// System health
router.get('/health', getSystemHealth);

module.exports = router;