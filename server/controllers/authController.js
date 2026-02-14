const User = require('../models/User');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { dbOperation } = require('../middleware/dbHealthCheck');
const emailService = require('../services/emailService');
const { logSecurityEvent } = require('../middleware/securityLogger');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Password strength regex (same as Joi validator for double-check)
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const passwordErrorMsg = 'Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)';

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    password,
    phone,
    address,
    role = 'customer'
  } = req.body;

  // Validate password strength
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      status: 'error',
      message: passwordErrorMsg
    });
  }

  // Check if user exists
  const existingUser = await User.findByEmail(email);
  if (existingUser) {
    return res.status(400).json({
      status: 'error',
      message: 'User already exists with this email'
    });
  }

  // Create user
  const user = await User.create({
    firstName,
    lastName,
    email,
    password,
    phone,
    address,
    role: role === 'admin' ? 'customer' : role, // Prevent admin registration through public endpoint
    emailVerificationToken: crypto.randomBytes(32).toString('hex')
  });

  // Generate tokens
  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user);

  // Remove password from response
  user.password = undefined;

  // Log registration event
  logSecurityEvent({
    action: 'create',
    entityId: user._id,
    userId: user._id,
    userEmail: user.email,
    userRole: user.role,
    req,
    success: true,
    details: { event: 'user_registration' }
  });

  // Note: Welcome email will be sent after user purchases a subscription

  res.status(201).json({
    status: 'success',
    message: 'User registered successfully',
    data: {
      user,
      token,
      refreshToken
    }
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password, role } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({
      status: 'error',
      message: 'Please provide email and password'
    });
  }

  // Check database connection
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      status: 'error',
      message: 'Database temporarily unavailable. Please try again later.'
    });
  }

  try {
    // Get user with password using timeout wrapper
    const user = await dbOperation(
      () => User.findByEmail(email).select('+password +loginAttempts +lockUntil'),
      null
    );

    if (!user) {
      // Log failed login - unknown email
      logSecurityEvent({
        action: 'login',
        entityId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        userEmail: email,
        userRole: 'customer',
        req,
        success: false,
        errorMessage: 'Invalid credentials - email not found',
        details: { event: 'login_failed', reason: 'unknown_email' }
      });
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      // Log failed login - account locked
      logSecurityEvent({
        action: 'login',
        entityId: user._id,
        userId: user._id,
        userEmail: user.email,
        userRole: user.role,
        req,
        success: false,
        errorMessage: 'Account locked',
        details: { event: 'login_failed', reason: 'account_locked' }
      });
      return res.status(423).json({
        status: 'error',
        message: 'Account temporarily locked due to too many failed login attempts'
      });
    }

    // Check role if specified (for separate login portals)
    if (role && user.role !== role) {
      await user.incLoginAttempts();
      // Log failed login - wrong role
      logSecurityEvent({
        action: 'login',
        entityId: user._id,
        userId: user._id,
        userEmail: user.email,
        userRole: user.role,
        req,
        success: false,
        errorMessage: `Invalid credentials for ${role} portal`,
        details: { event: 'login_failed', reason: 'wrong_role', attemptedRole: role }
      });
      return res.status(401).json({
        status: 'error',
        message: `Invalid credentials for ${role} portal`
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      await user.incLoginAttempts();

      // Check if this attempt causes a lockout (5th failed attempt)
      if (user.loginAttempts + 1 >= 5) {
        // Send lockout email notification
        try {
          await emailService.sendAccountLockoutEmail(user.email, {
            name: `${user.firstName} ${user.lastName}`,
            attempts: user.loginAttempts + 1,
            ipAddress: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.ip || 'Unknown',
            time: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            lockDuration: '2 hours'
          });
          console.log(`🔒 Lockout email sent to ${user.email}`);
        } catch (emailErr) {
          console.error('⚠️  Failed to send lockout email:', emailErr.message);
        }
      }

      // Log failed login - wrong password
      logSecurityEvent({
        action: 'login',
        entityId: user._id,
        userId: user._id,
        userEmail: user.email,
        userRole: user.role,
        req,
        success: false,
        errorMessage: 'Invalid password',
        details: { event: 'login_failed', reason: 'wrong_password', loginAttempts: user.loginAttempts + 1 }
      });

      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      // Log failed login - inactive account
      logSecurityEvent({
        action: 'login',
        entityId: user._id,
        userId: user._id,
        userEmail: user.email,
        userRole: user.role,
        req,
        success: false,
        errorMessage: 'Account not active',
        details: { event: 'login_failed', reason: 'inactive_account', status: user.status }
      });
      return res.status(401).json({
        status: 'error',
        message: 'Account is not active. Please contact support.'
      });
    }

    // Reset login attempts and update last login
    await user.resetLoginAttempts();
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // Remove password from response
    user.password = undefined;

    // Log successful login
    logSecurityEvent({
      action: 'login',
      entityId: user._id,
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      req,
      success: true,
      details: { event: 'login_success' }
    });

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user,
        token,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Login failed due to server error'
    });
  }
});

// @desc    Refresh access token
// @route   POST /api/auth/refresh-token
// @access  Public
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'Refresh token is required'
    });
  }

  try {
    const decoded = verifyRefreshToken(token);

    // Get user
    const user = await User.findById(decoded.id);
    if (!user || user.status !== 'active') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid refresh token'
      });
    }

    // Generate new tokens
    const newToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);

    res.status(200).json({
      status: 'success',
      data: {
        token: newToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid refresh token'
    });
  }
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res) => {
  // In a production app, you might want to blacklist the token
  // For now, we'll just send a success response
  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully'
  });
});

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'Email is required'
      });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'No user found with this email'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save({ validateBeforeSave: false });

    // Send password reset email
    const resetURL = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

    try {
      await emailService.sendPasswordResetEmail(user.email, {
        name: `${user.firstName} ${user.lastName}`,
        resetURL,
        expiresIn: '10 minutes'
      });

      res.status(200).json({
        status: 'success',
        message: 'Password reset link sent to your email'
      });
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        status: 'error',
        message: 'Email service is currently unavailable. Please try again later or contact support.',
        error: emailError.message
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'An error occurred while processing your request',
      error: error.message
    });
  }
});

// @desc    Reset password
// @route   POST /api/auth/reset-password/:token
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const resetToken = req.params.token;

  // Hash the token and find user
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  if (!user) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid or expired reset token'
    });
  }

  // Validate password strength before setting
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      status: 'error',
      message: passwordErrorMsg
    });
  }

  // Set new password
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // Log password reset event
  logSecurityEvent({
    action: 'update',
    entityId: user._id,
    userId: user._id,
    userEmail: user.email,
    userRole: user.role,
    req,
    success: true,
    details: { event: 'password_reset' }
  });

  res.status(200).json({
    status: 'success',
    message: 'Password reset successful'
  });
});

// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
// @access  Public
const verifyEmail = asyncHandler(async (req, res) => {
  const token = req.params.token;

  const user = await User.findOne({ emailVerificationToken: token });
  if (!user) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid verification token'
    });
  }

  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  await user.save();

  res.status(200).json({
    status: 'success',
    message: 'Email verified successfully'
  });
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getCurrentUser = asyncHandler(async (req, res) => {
  res.status(200).json({
    status: 'success',
    data: {
      user: req.user
    }
  });
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    phone,
    address,
    preferences,
    dateOfBirth
  } = req.body;

  const user = await User.findById(req.user._id);

  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;
  if (phone) user.phone = phone;
  if (address) user.address = { ...user.address, ...address };
  if (preferences) user.preferences = { ...user.preferences, ...preferences };
  if (dateOfBirth) user.dateOfBirth = dateOfBirth;

  await user.save();

  res.status(200).json({
    status: 'success',
    message: 'Profile updated successfully',
    data: {
      user
    }
  });
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Validate new password strength
  if (!passwordRegex.test(newPassword)) {
    return res.status(400).json({
      status: 'error',
      message: passwordErrorMsg
    });
  }

  const user = await User.findById(req.user._id).select('+password');

  // Check current password
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    // Log failed password change
    logSecurityEvent({
      action: 'update',
      entityId: user._id,
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      req,
      success: false,
      errorMessage: 'Current password incorrect',
      details: { event: 'password_change_failed' }
    });
    return res.status(400).json({
      status: 'error',
      message: 'Current password is incorrect'
    });
  }

  // Update password
  user.password = newPassword;
  // Increment tokenVersion to invalidate all existing tokens
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  // Log successful password change
  logSecurityEvent({
    action: 'update',
    entityId: user._id,
    userId: user._id,
    userEmail: user.email,
    userRole: user.role,
    req,
    success: true,
    details: { event: 'password_changed', tokenVersionIncremented: true }
  });

  // Generate new token with updated version
  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user);

  res.status(200).json({
    status: 'success',
    message: 'Password changed successfully. All other sessions have been logged out.',
    data: {
      token,
      refreshToken
    }
  });
});

// @desc    Logout from all devices (invalidate all tokens)
// @route   POST /api/auth/logout-all
// @access  Private
const logoutAll = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found'
    });
  }

  // Increment tokenVersion to invalidate all existing tokens
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  // Log logout-all event
  logSecurityEvent({
    action: 'logout',
    entityId: user._id,
    userId: user._id,
    userEmail: user.email,
    userRole: user.role,
    req,
    success: true,
    details: { event: 'logout_all_devices', newTokenVersion: user.tokenVersion }
  });

  // Generate new token for current session
  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user);

  res.status(200).json({
    status: 'success',
    message: 'Successfully logged out from all devices. You have been issued a new session.',
    data: {
      token,
      refreshToken
    }
  });
});

module.exports = {
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
};