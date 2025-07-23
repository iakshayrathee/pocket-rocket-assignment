const Expense = require('../models/Expense');
const AuditLog = require('../models/AuditLog');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Create new expense
// @route   POST /api/v1/expenses
// @access  Private
exports.createExpense = async (req, res, next) => {
  try {
    // Log incoming request data
    // console.log('=== INCOMING REQUEST DATA ===');
    // console.log('Request body:', JSON.stringify(req.body, null, 2));
    // console.log('Request file:', req.file);
    // console.log('Request query:', req.query);
    // console.log('Request params:', req.params);
    // console.log('Request headers:', req.headers);
    // console.log('Request user:', req.user);
    // console.log('=============================');

    // Prepare expense data
    const expenseData = {
      ...req.body,
      user: req.user.id
    };

    //console.log('Creating expense with data:', JSON.stringify(expenseData, null, 2));
    
    // Create the expense
    const expense = await Expense.create(expenseData);
    
    // Populate user data in the response
    await expense.populate('user', 'name email');

    // Log the action
    await AuditLog.create({
      action: 'expense:create',
      user: req.user.id,
      targetExpense: expense._id,
      details: {
        amount: expense.amount,
        category: expense.category,
        status: expense.status,
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(201).json({
      success: true,
      data: expense,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all expenses
// @route   GET /api/v1/expenses
// @access  Private
exports.getExpenses = async (req, res, next) => {
  try {
    let query;

    // If not admin, only show user's expenses
    if (req.user.role === 'admin') {
      query = Expense.find().populate('user', 'name email');
    } else {
      query = Expense.find({ user: req.user.id });
    }

    // Filtering
    const reqQuery = { ...req.query };
    const removeFields = ['select', 'sort', 'page', 'limit'];
    removeFields.forEach((param) => delete reqQuery[param]);

    let queryStr = JSON.stringify(reqQuery);
    queryStr = queryStr.replace(
      /\b(gt|gte|lt|lte|in)\b/g,
      (match) => `$${match}`
    );

    query = query.find(JSON.parse(queryStr));

    // Select fields
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

    // Execute query
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

// @desc    Get single expense
// @route   GET /api/v1/expenses/:id
// @access  Private
exports.getExpense = async (req, res, next) => {
  try {
    let expense = await Expense.findById(req.params.id).populate(
      'user',
      'name email'
    );

    if (!expense) {
      return next(
        new ErrorResponse(`Expense not found with id of ${req.params.id}`, 404)
      );
    }

    // Make sure user is expense owner or admin
    if (
      expense.user._id.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return next(
        new ErrorResponse(
          `User ${req.user.id} is not authorized to view this expense`,
          401
        )
      );
    }

    res.status(200).json({
      success: true,
      data: expense,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update expense
// @route   PUT /api/v1/expenses/:id
// @access  Private
exports.updateExpense = async (req, res, next) => {
  try {
    let expense = await Expense.findById(req.params.id);

    if (!expense) {
      return next(
        new ErrorResponse(`Expense not found with id of ${req.params.id}`, 404)
      );
    }

    // Make sure user is expense owner or admin
    if (
      expense.user.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return next(
        new ErrorResponse(
          `User ${req.user.id} is not authorized to update this expense`,
          401
        )
      );
    }

    // If admin is updating status, log the change
    const statusChanged =
      req.body.status && req.body.status !== expense.status;
    
    expense = await Expense.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    // Log the action
    if (statusChanged) {
      await AuditLog.create({
        action: 'expense:status_change',
        user: req.user.id,
        targetUser: expense.user,
        targetExpense: expense._id,
        details: {
          oldStatus: expense.status,
          newStatus: req.body.status,
          rejectionReason: req.body.rejectionReason,
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
    } else {
      await AuditLog.create({
        action: 'expense:update',
        user: req.user.id,
        targetExpense: expense._id,
        details: req.body,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
    }

    res.status(200).json({
      success: true,
      data: expense,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete expense
// @route   DELETE /api/v1/expenses/:id
// @access  Private
exports.deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return next(
        new ErrorResponse(`Expense not found with id of ${req.params.id}`, 404)
      );
    }

    // Make sure user is expense owner or admin
    if (
      expense.user.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return next(
        new ErrorResponse(
          `User ${req.user.id} is not authorized to delete this expense`,
          401
        )
      );
    }

    await expense.deleteOne();

    // Log the action
    await AuditLog.create({
      action: 'expense:delete',
      user: req.user.id,
      targetExpense: expense._id,
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

// @desc    Get expense summary
// @route   GET /api/v1/expenses/summary
// @access  Private/Admin
exports.getExpenseSummary = async (req, res, next) => {
  try {
    // Only admin can access this endpoint
    if (req.user.role !== 'admin') {
      return next(
        new ErrorResponse('Not authorized to access this route', 403)
      );
    }

    // Group by category
    const categorySummary = await Expense.aggregate([
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    // Group by month
    const monthlySummary = await Expense.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        byCategory: categorySummary,
        byMonth: monthlySummary,
      },
    });
  } catch (err) {
    next(err);
  }
};
