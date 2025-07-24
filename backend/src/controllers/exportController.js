const Expense = require('../models/Expense');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const { jsonToCsv, generateFilename } = require('../utils/csvGenerator');

// @desc    Export analytics data to CSV
// @route   GET /api/v1/expenses/analytics/export
// @access  Private/Admin
exports.exportAnalytics = asyncHandler(async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Build match object for date range
    const match = {};
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = new Date(startDate);
      if (endDate) match.date.$lte = new Date(endDate);
    }

    // Get all analytics data
    const [byCategory, byStatus, trend] = await Promise.all([
      Expense.aggregate([
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
      ]),
      
      Expense.aggregate([
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
      ]),
      
      Expense.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    // Format data for CSV
    const formatCurrency = (amount) => {
      return amount ? parseFloat(amount).toFixed(2) : '0.00';
    };

    // Format category data
    const categoryData = byCategory.map(item => ({
      'Category': item._id || 'Uncategorized',
      'Expense Count': item.count || 0,
      'Total Amount': formatCurrency(item.totalAmount),
      'Average Amount': formatCurrency(item.averageAmount)
    }));

    // Format status data
    const statusData = byStatus.map(item => ({
      'Status': item._id ? item._id.charAt(0).toUpperCase() + item._id.slice(1) : 'Unknown',
      'Expense Count': item.count || 0,
      'Total Amount': formatCurrency(item.totalAmount),
      'Average Amount': formatCurrency(item.averageAmount)
    }));

    // Format trend data
    const trendData = trend.map(item => ({
      'Date': item._id,
      'Expense Count': item.count || 0,
      'Total Amount': formatCurrency(item.totalAmount)
    }));

    // Generate CSV content for each dataset with proper headers
    const categoryCsv = jsonToCsv(categoryData, {
      includeHeader: true,
      headerRow: ['Category', 'Expense Count', 'Total Amount', 'Average Amount']
    }) + '\n\n';
    
    const statusCsv = jsonToCsv(statusData, {
      includeHeader: true,
      headerRow: ['Status', 'Expense Count', 'Total Amount', 'Average Amount']
    }) + '\n\n';
    
    const trendCsv = jsonToCsv(trendData, {
      includeHeader: true,
      headerRow: ['Date', 'Expense Count', 'Total Amount']
    });

    // Combine all CSV data
    const csvData = categoryCsv + statusCsv + trendCsv;

    // Set response headers for file download
    const filename = generateFilename('analytics_report');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Send the CSV data
    res.status(200).send(csvData);
  } catch (err) {
    console.error('Error exporting analytics data to CSV:', err);
    next(err);
  }
});
