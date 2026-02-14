const express = require('express');
const {
  register,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
  getCurrentUser,
  updateProfile,
  changePassword,
  logoutAll
} = require('../controllers/authController');
const { authenticateToken, userRateLimit } = require('../middleware/auth');
const { validate } = require('../validators/authValidators');
const router = express.Router();

// Public routes (with Joi validation)
router.post('/register', validate('register'), register);
router.post('/login', validate('login'), userRateLimit(50, 15 * 60 * 1000), login);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', validate('forgotPassword'), userRateLimit(10, 60 * 60 * 1000), forgotPassword);
router.post('/reset-password/:token', validate('resetPassword'), resetPassword);
router.get('/verify-email/:token', verifyEmail);

// Protected routes
router.use(authenticateToken);
router.get('/me', getCurrentUser);
router.put('/profile', validate('updateProfile'), updateProfile);
router.put('/change-password', validate('changePassword'), changePassword);
router.post('/logout', logout);
router.post('/logout-all', logoutAll);

module.exports = router;