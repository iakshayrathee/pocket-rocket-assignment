const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { 
  getExpenseByCategory, 
  getExpenseByStatus, 
  getExpenseTrend
} = require('../controllers/analyticsController');
const { exportAnalytics } = require('../controllers/exportController');

const router = express.Router();

// All routes are protected and require admin role
router.use(protect);
router.use(authorize('admin'));

// Analytics routes
router.get('/categories', getExpenseByCategory);
router.get('/status', getExpenseByStatus);
router.get('/trend', getExpenseTrend);
router.get('/export', exportAnalytics);

module.exports = router;
