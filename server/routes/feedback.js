const express = require('express');
const {
  submitFeedback,
  getUserFeedback,
  getPublicFeedback,
  getFeedbackStats,
  updateFeedback,
  deleteFeedback,
  getAllFeedback
} = require('../controllers/feedbackController');

const router = express.Router();

const { authenticateToken, authorize } = require('../middleware/auth');

// Public routes
router.get('/public', getPublicFeedback);

// Admin routes
router.get('/all', authenticateToken, authorize('admin'), getAllFeedback);
router.get('/stats', authenticateToken, authorize('admin'), getFeedbackStats);
router.put('/:id', authenticateToken, authorize('admin'), updateFeedback);
router.delete('/:id', authenticateToken, authorize('admin'), deleteFeedback);

// Protected routes
router.post('/', authenticateToken, submitFeedback);
router.get('/user/:userId', authenticateToken, getUserFeedback);

module.exports = router;