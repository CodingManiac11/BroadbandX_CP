const express = require('express');
const {
  createSubscription,
  getUserSubscriptions,
  getSubscriptionById,
  updateSubscription,
  cancelSubscription,
  upgradePlan,
  downgradePlan,
  renewSubscription,
  pauseSubscription,
  resumeSubscription,
  getSubscriptionUsage,
  updateUsage,
  scheduleInstallation,
  addPayment,
  getPaymentHistory,
  getPlanHistory
} = require('../controllers/subscriptionController');
const { getEnhancedPlanHistory } = require('../controllers/planHistoryController');
const { authenticateToken, ownerOrAdmin, adminOnly } = require('../middleware/auth');
const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Customer routes
router.post('/', createSubscription);
router.get('/my-subscriptions', getUserSubscriptions);
router.get('/plan-history', getEnhancedPlanHistory); // Use enhanced version
router.get('/plan-history-old', getPlanHistory); // Keep old version as backup
router.get('/:id', ownerOrAdmin('user'), getSubscriptionById);
router.put('/:id/cancel', ownerOrAdmin('user'), cancelSubscription);
router.put('/:id/upgrade', ownerOrAdmin('user'), upgradePlan);
router.put('/:id/downgrade', ownerOrAdmin('user'), downgradePlan);
router.put('/:id/renew', ownerOrAdmin('user'), renewSubscription);
router.put('/:id/pause', ownerOrAdmin('user'), pauseSubscription);
router.put('/:id/resume', ownerOrAdmin('user'), resumeSubscription);
router.get('/:id/usage', ownerOrAdmin('user'), getSubscriptionUsage);
router.post('/:id/schedule-installation', ownerOrAdmin('user'), scheduleInstallation);
router.post('/:id/payment', ownerOrAdmin('user'), addPayment);
router.get('/:id/payments', ownerOrAdmin('user'), getPaymentHistory);

// Admin routes
router.put('/:id', adminOnly, updateSubscription);
router.put('/:id/usage', adminOnly, updateUsage);

module.exports = router;