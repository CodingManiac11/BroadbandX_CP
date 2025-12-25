const express = require('express');
const router = express.Router();
const {
  createOrder,
  verifyPayment,
  getPaymentHistory,
  getPayment,
  handleWebhook
} = require('../controllers/razorpayController');

const { authenticateToken, authorize } = require('../middleware/auth');

// Public routes
router.post('/webhook', handleWebhook);

// Protected routes
router.post('/create-order', authenticateToken, createOrder);
router.post('/verify', authenticateToken, verifyPayment);
router.get('/history', authenticateToken, getPaymentHistory);
router.get('/:id', authenticateToken, getPayment);

module.exports = router;
