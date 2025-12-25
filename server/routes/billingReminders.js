const express = require('express');
const router = express.Router();
const {
  createReminder,
  getMyReminders,
  getAllReminders,
  getPendingReminders,
  sendReminder,
  acknowledgeReminder,
  resolveReminder,
  cancelRemindersForSubscription,
  processPendingReminders,
  createRemindersForExpiringSubscriptions
} = require('../controllers/billingReminderController');
const { authenticateToken, authorize } = require('../middleware/auth');

// User routes
router.get('/my-reminders', authenticateToken, getMyReminders);
router.put('/:id/acknowledge', authenticateToken, acknowledgeReminder);

// Admin routes
router.post('/', authenticateToken, authorize('admin'), createReminder);
router.get('/admin/all', authenticateToken, authorize('admin'), getAllReminders);
router.get('/admin/pending', authenticateToken, authorize('admin'), getPendingReminders);
router.post('/:id/send', authenticateToken, authorize('admin'), sendReminder);
router.put('/:id/resolve', authenticateToken, authorize('admin'), resolveReminder);
router.delete('/subscription/:subscriptionId', authenticateToken, authorize('admin'), cancelRemindersForSubscription);
router.post('/admin/process', authenticateToken, authorize('admin'), processPendingReminders);
router.post('/admin/create-for-expiring', authenticateToken, authorize('admin'), createRemindersForExpiringSubscriptions);

module.exports = router;
