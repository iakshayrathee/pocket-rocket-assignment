const AuditLog = require('../models/AuditLog');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all audit logs
// @route   GET /api/v1/audit-logs
// @access  Private/Admin
exports.getAuditLogs = async (req, res, next) => {
  try {
    // Only admin can access this endpoint
    if (req.user.role !== 'admin') {
      return next(
        new ErrorResponse('Not authorized to access this route', 403)
      );
    }

    // Build query
    const query = {};
    
    // Filter by action type if provided
    if (req.query.action) {
      query.action = req.query.action;
    }
    
    // Filter by user if provided
    if (req.query.userId) {
      query.user = req.query.userId;
    }

    // Filter by date range if provided
    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) {
        query.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        // Set to end of day
        const endDate = new Date(req.query.endDate);
        endDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDate;
      }
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const skip = (page - 1) * limit;

    // Execute query with population of related documents
    const logs = await AuditLog.find(query)
      .populate('user', 'name email')
      .populate('targetUser', 'name email')
      .populate('targetExpense', 'amount category status')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);

    const total = await AuditLog.countDocuments(query);

    // Calculate pagination
    const pagination = {};
    const endIndex = page * limit;
    
    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (skip > 0) {
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

// @desc    Get stats for audit logs
// @route   GET /api/v1/audit-logs/stats
// @access  Private/Admin
exports.getAuditLogStats = async (req, res, next) => {
  try {
    // Only admin can access this endpoint
    if (req.user.role !== 'admin') {
      return next(
        new ErrorResponse('Not authorized to access this route', 403)
      );
    }

    // Get action counts
    const actionStats = await AuditLog.aggregate([
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Get activity by user
    const userStats = await AuditLog.aggregate([
      {
        $group: {
          _id: '$user',
          count: { $sum: 1 },
          lastActivity: { $max: '$createdAt' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          name: '$user.name',
          email: '$user.email',
          count: 1,
          lastActivity: 1,
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 }, // Top 10 active users
    ]);

    // Get activity by date
    const dateStats = await AuditLog.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: {
                $dateFromParts: {
                  year: '$_id.year',
                  month: '$_id.month',
                  day: '$_id.day',
                },
              },
            },
          },
          count: 1,
        },
      },
      { $sort: { date: 1 } },
      { $limit: 30 }, // Last 30 days
    ]);

    res.status(200).json({
      success: true,
      data: {
        actions: actionStats,
        activeUsers: userStats,
        activityTimeline: dateStats,
      },
    });
  } catch (err) {
    next(err);
  }
};
