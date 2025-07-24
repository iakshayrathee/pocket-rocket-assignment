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

    // If there's a receipt in the request, add it to the expense data
    if (req.body.receipt) {
      expenseData.receipt = req.body.receipt;
    }

    console.log('Creating expense with data:', JSON.stringify(expenseData, null, 2));
    
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

    // Handle date range filtering
    if (reqQuery.startDate || reqQuery.endDate) {
      if (reqQuery.startDate) {
        const startDate = new Date(reqQuery.startDate);
        startDate.setUTCHours(0, 0, 0, 0);
        query = query.where('date').gte(startDate);
        delete reqQuery.startDate;
      }
      
      if (reqQuery.endDate) {
        const endDate = new Date(reqQuery.endDate);
        endDate.setUTCHours(23, 59, 59, 999);
        query = query.where('date').lte(endDate);
        delete reqQuery.endDate;
      }
    }

    // Handle other query parameters
    let queryStr = JSON.stringify(reqQuery);
    queryStr = queryStr.replace(
      /\b(gt|gte|lt|lte|in)\b/g,
      (match) => `$${match}`
    );

    // Apply other filters if any
    const filters = JSON.parse(queryStr);
    if (Object.keys(filters).length > 0) {
      query = query.find(filters);
    }

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
    
    // Get total count with the same filters
    const total = await Expense.countDocuments(JSON.parse(queryStr));
    const totalPages = Math.ceil(total / limit);

    query = query.skip(startIndex).limit(limit);

    // Execute query
    const expenses = await query;

    // Pagination result
    const pagination = {
      total,
      pages: totalPages,
      page,
      limit,
      totalResults: total
    };

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
      total,
      pages: totalPages,
      page,
      limit
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

    // Check if status is being updated
    const isStatusUpdate = req.body.status && req.body.status !== expense.status;
    const previousStatus = expense.status;
    const previousData = {
      amount: expense.amount,
      category: expense.category,
      description: expense.description,
      date: expense.date,
      status: expense.status
    };

    // Make sure request is not empty
    if (!req.body) {
      return next(new ErrorResponse('Please provide data to update', 400));
    }

    // Prepare update data
    const updateData = { ...req.body };

    // If there's a new receipt, update it
    if (req.body.receipt) {
      updateData.receipt = req.body.receipt;
    } else if (req.body.removeReceipt) {
      // If removeReceipt flag is set, remove the receipt
      updateData.$unset = { receipt: '' };
    }

    // Update the expense
    expense = await Expense.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate('user', 'name email');

    // Get the updated fields
    const updatedFields = {};
    for (const key in req.body) {
      if (JSON.stringify(previousData[key]) !== JSON.stringify(expense[key])) {
        updatedFields[key] = {
          from: previousData[key],
          to: expense[key]
        };
      }
    }

    // Log the action
    await AuditLog.create({
      action: isStatusUpdate ? 'expense:status_change' : 'expense:update',
      user: req.user.id,
      targetExpense: expense._id,
      targetUser: expense.user._id.toString() !== req.user.id ? expense.user._id : undefined,
      details: {
        ...(isStatusUpdate && {
          previousStatus,
          newStatus: expense.status
        }),
        updatedFields: Object.keys(updatedFields).length > 0 ? updatedFields : undefined,
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

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
    const expense = await Expense.findById(req.params.id).populate('user', 'name email');

    if (!expense) {
      return next(
        new ErrorResponse(`Expense not found with id of ${req.params.id}`, 404)
      );
    }

    // Make sure user is expense owner or admin
    if (expense.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(
        new ErrorResponse(
          `User ${req.user.id} is not authorized to delete this expense`,
          401
        )
      );
    }

    // Log the action before deleting
    await AuditLog.create({
      action: 'expense:delete',
      user: req.user.id,
      targetExpense: expense._id,
      targetUser: expense.user._id.toString() !== req.user.id ? expense.user._id : undefined,
      details: {
        amount: expense.amount,
        category: expense.category,
        status: expense.status,
        description: expense.description,
        date: expense.date
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    await expense.deleteOne();

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
