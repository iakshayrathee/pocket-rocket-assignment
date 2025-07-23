const User = require('../models/User');
const Expense = require('../models/Expense');
const AuditLog = require('../models/AuditLog');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all users (admin only)
// @route   GET /api/v1/admin/users
// @access  Private/Admin
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password');
    
    // Log the action
    await AuditLog.create({
      action: 'admin:listUsers',
      user: req.user.id,
      details: { count: users.length },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single user (admin only)
// @route   GET /api/v1/admin/users/:id
// @access  Private/Admin
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return next(
        new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
      );
    }

    // Log the action
    await AuditLog.create({
      action: 'admin:viewUser',
      user: req.user.id,
      targetUser: user._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user (admin only)
// @route   PUT /api/v1/admin/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res, next) => {
  try {
    let user = await User.findById(req.params.id);

    if (!user) {
      return next(
        new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
      );
    }

    // Prevent updating password through this route
    if (req.body.password) {
      delete req.body.password;
    }

    user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).select('-password');

    // Log the action
    await AuditLog.create({
      action: 'admin:updateUser',
      user: req.user.id,
      targetUser: user._id,
      details: { updatedFields: Object.keys(req.body) },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete user (admin only)
// @route   DELETE /api/v1/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(
        new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
      );
    }

    // Prevent deleting own account
    if (user._id.toString() === req.user.id) {
      return next(
        new ErrorResponse('You cannot delete your own account', 400)
      );
    }

    await user.remove();

    // Log the action
    await AuditLog.create({
      action: 'admin:deleteUser',
      user: req.user.id,
      targetUser: user._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all expenses (admin only)
// @route   GET /api/v1/admin/expenses
// @access  Private/Admin
exports.getAllExpenses = async (req, res, next) => {
  try {
    // Copy req.query
    const reqQuery = { ...req.query };

    // Fields to exclude from filtering
    const removeFields = ['select', 'sort', 'page', 'limit'];

    // Loop over removeFields and delete them from reqQuery
    removeFields.forEach((param) => delete reqQuery[param]);

    // Create query string
    let queryStr = JSON.stringify(reqQuery);

    // Create operators ($gt, $gte, etc)
    queryStr = queryStr.replace(
      /\b(gt|gte|lt|lte|in)\b/g,
      (match) => `$${match}`
    );

    // Finding resource
    let query = Expense.find(JSON.parse(queryStr)).populate({
      path: 'user',
      select: 'name email',
    });

    // Select Fields
    if (req.query.select) {
      const fields = req.query.select.split(',').join(' ');
      query = query.select(fields);
    }

    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Expense.countDocuments(JSON.parse(queryStr));

    query = query.skip(startIndex).limit(limit);

    // Executing query
    const expenses = await query;

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    // Log the action
    await AuditLog.create({
      action: 'admin:listAllExpenses',
      user: req.user.id,
      details: { count: expenses.length, query: req.query },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      count: expenses.length,
      pagination,
      data: expenses,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get expense analytics (admin only)
// @route   GET /api/v1/admin/analytics/expenses
// @access  Private/Admin
exports.getExpenseAnalytics = async (req, res, next) => {
  try {
    // Group expenses by category and calculate total amount
    const categoryStats = await Expense.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          avgAmount: { $avg: '$amount' },
          minAmount: { $min: '$amount' },
          maxAmount: { $max: '$amount' },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    // Group expenses by status
    const statusStats = await Expense.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    // Group expenses by month
    const monthlyStats = await Expense.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }, // Last 12 months
    ]);

    // Format monthly data for charting
    const monthlyData = monthlyStats.map((item) => ({
      month: new Date(item._id.year, item._id.month - 1).toLocaleString('default', {
        month: 'short',
        year: '2-digit',
      }),
      count: item.count,
      totalAmount: item.totalAmount,
    }));

    // Log the action
    await AuditLog.create({
      action: 'admin:viewAnalytics',
      user: req.user.id,
      details: {
        categories: categoryStats.length,
        statuses: statusStats.length,
        months: monthlyData.length,
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      data: {
        categories: categoryStats,
        statuses: statusStats,
        monthly: monthlyData,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get audit logs (admin only)
// @route   GET /api/v1/admin/audit-logs
// @access  Private/Admin
exports.getAuditLogs = async (req, res, next) => {
  try {
    // Copy req.query
    const reqQuery = { ...req.query };

    // Fields to exclude from filtering
    const removeFields = ['select', 'sort', 'page', 'limit'];

    // Loop over removeFields and delete them from reqQuery
    removeFields.forEach((param) => delete reqQuery[param]);

    // Create query string
    let queryStr = JSON.stringify(reqQuery);

    // Create operators ($gt, $gte, etc)
    queryStr = queryStr.replace(
      /\b(gt|gte|lt|lte|in)\b/g,
      (match) => `$${match}`
    );

    // Finding resource
    let query = AuditLog.find(JSON.parse(queryStr))
      .populate({
        path: 'user',
        select: 'name email',
      })
      .populate({
        path: 'targetUser',
        select: 'name email',
      });

    // Select Fields
    if (req.query.select) {
      const fields = req.query.select.split(',').join(' ');
      query = query.select(fields);
    }

    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await AuditLog.countDocuments(JSON.parse(queryStr));

    query = query.skip(startIndex).limit(limit);

    // Executing query
    const logs = await query;

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    res.status(200).json({
      success: true,
      count: logs.length,
      pagination,
      data: logs,
    });
  } catch (err) {
    next(err);
  }
};
