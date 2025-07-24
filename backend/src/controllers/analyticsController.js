const Expense = require('../models/Expense');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const { jsonToCsv, generateFilename } = require('../utils/csvGenerator');

// @desc    Get expense statistics by category
// @route   GET /api/v1/expenses/analytics/categories
// @access  Private/Admin
exports.getExpenseByCategory = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  // Build match object for date range
  const match = {};
  if (startDate || endDate) {
    match.date = {};
    if (startDate) match.date.$gte = new Date(startDate);
    if (endDate) match.date.$lte = new Date(endDate);
  }

  const expensesByCategory = await Expense.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        averageAmount: { $avg: '$amount' }
      }
    },
    { $sort: { totalAmount: -1 } }
  ]);

  res.status(200).json({
    success: true,
    count: expensesByCategory.length,
    data: expensesByCategory
  });
});

// @desc    Get expense statistics by status
// @route   GET /api/v1/expenses/analytics/status
// @access  Private/Admin
exports.getExpenseByStatus = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  // Build match object for date range
  const match = {};
  if (startDate || endDate) {
    match.date = {};
    if (startDate) match.date.$gte = new Date(startDate);
    if (endDate) match.date.$lte = new Date(endDate);
  }

  const expensesByStatus = await Expense.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        averageAmount: { $avg: '$amount' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  res.status(200).json({
    success: true,
    count: expensesByStatus.length,
    data: expensesByStatus
  });
});

// @desc    Get expense trend data
// @route   GET /api/v1/expenses/analytics/trend
// @access  Private/Admin
exports.getExpenseTrend = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  // Default to last 30 days if no date range provided
  const start = startDate ? new Date(startDate) : new Date();
  start.setDate(start.getDate() - 30);
  const end = endDate ? new Date(endDate) : new Date();

  // Generate date range
  const dateMap = new Map();
  let currentDate = new Date(start);
  
  while (currentDate <= end) {
    const dateKey = currentDate.toISOString().split('T')[0];
    dateMap.set(dateKey, {
      _id: dateKey,
      count: 0,
      totalAmount: 0
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Get expenses in date range
  const expenses = await Expense.aggregate([
    {
      $match: {
        date: {
          $gte: start,
          $lte: end
        }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Merge actual data with date range
  expenses.forEach(expense => {
    if (dateMap.has(expense._id)) {
      dateMap.set(expense._id, {
        _id: expense._id,
        count: expense.count,
        totalAmount: expense.totalAmount
      });
    }
  });

  const trendData = Array.from(dateMap.values());

  res.status(200).json({
    success: true,
    count: trendData.length,
    data: trendData
  });
});
