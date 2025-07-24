const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getAllExpenses,
  getExpenseAnalytics,
  getAuditLogs,
} = require('../controllers/adminController');

const router = express.Router();

// Protect all routes with authentication and admin authorization
router.use(protect);
router.use(authorize('admin'));

// User management routes
router.route('/users')
  .get(getUsers);

router.route('/users/:id')
  .get(getUser)
  .put(updateUser)
  .delete(deleteUser);

// Expense management routes
router.route('/expenses')
  .get(getAllExpenses);

// Analytics routes
router.route('/analytics/expenses')
  .get(getExpenseAnalytics);

// Audit log routes
router.route('/audit-logs')
  .get(getAuditLogs);

module.exports = router;
