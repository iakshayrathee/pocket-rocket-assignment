const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role = 'employee' } = req.body;

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role,
    });

    // Create token
    const token = user.getSignedJwtToken();

    // Log the action
    await AuditLog.create({
      action: 'user:register',
      user: user._id,
      details: { role },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return next(new ErrorResponse('Please provide an email and password', 400));
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Log the action
    await AuditLog.create({
      action: 'user:login',
      user: user._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user profile
// @route   PUT /api/v1/auth/me
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    // Get the user first
    let user = await User.findById(req.user.id).select('+password');
    
    // Update name and email if provided
    if (req.body.name) user.name = req.body.name;
    if (req.body.email) user.email = req.body.email;

    // If password is being updated
    if (req.body.newPassword) {
      // Verify current password
      if (!(await user.matchPassword(req.body.currentPassword))) {
        return next(new ErrorResponse('Current password is incorrect', 401));
      }
      
      // Set the new password (it will be hashed by the pre-save hook)
      user.password = req.body.newPassword;
    }

    // Save the user (this will trigger the pre-save hook for password hashing)
    user = await user.save();

    // Remove password from the response
    user.password = undefined;

    // Log the action
    await AuditLog.create({
      action: 'user:update',
      user: user._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken();

  // Calculate expiration date (30 days from now)
  const daysToExpire = 30;
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + daysToExpire);

  const options = {
    expires: expirationDate,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',  // Helps with CSRF protection
  };

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      role: user.role,
    });
};
