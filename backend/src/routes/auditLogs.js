const express = require('express');
const { getAuditLogs, getAuditLogStats } = require('../controllers/auditLogController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Protect all routes with authentication
router.use(protect);

// Only admins can access audit logs
router.use(authorize('admin'));

router.get('/', getAuditLogs);
router.get('/stats', getAuditLogStats);

module.exports = router;
