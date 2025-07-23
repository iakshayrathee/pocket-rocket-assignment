const express = require('express');
const { check } = require('express-validator');
const {
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
} = require('../controllers/expenseController');
const { protect, authorize } = require('../middleware/auth');
const handleFileUpload = require('../middleware/upload');

const router = express.Router();

// Protect all routes with authentication
router.use(protect);

// Routes for all users (employees and admins)
router
  .route('/')
  .get(getExpenses)
  .post(
    // Temporarily disable file upload for debugging
    // handleFileUpload,
    
    // Then validate the form data
    [
      check('amount', 'Amount is required and must be a positive number')
        .isFloat({ min: 0.01 })
        .toFloat(),
      check('category', 'Category is required')
        .not()
        .isEmpty()
        .isIn(['travel', 'food', 'accommodation', 'office', 'entertainment', 'utilities', 'other'])
        .withMessage('Invalid category'),
      check('date', 'Please include a valid date')
        .optional()
        .isISO8601()
        .toDate(),
      check('description', 'Description cannot be longer than 500 characters')
        .optional()
        .isLength({ max: 500 })
    ],
    createExpense
  );

router
  .route('/:id')
  .get(getExpense)
  .put(
    [
      check('amount', 'Amount must be a positive number')
        .optional()
        .isFloat({ min: 0.01 })
        .toFloat(),
      check('date', 'Please include a valid date').optional().isISO8601(),
      check('status')
        .optional()
        .isIn(['pending', 'approved', 'rejected'])
        .withMessage('Status must be one of: pending, approved, rejected'),
    ],
    updateExpense
  )
  .delete(deleteExpense);

// Admin-only routes
router.use(authorize('admin'));
router.get('/summary', getExpenseSummary);

module.exports = router;
