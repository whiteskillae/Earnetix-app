const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect, admin } = require('../middleware/auth');

// User routes
router.post('/', protect, reportController.submitReport);

// Admin routes
router.get('/admin/all', protect, admin, reportController.getAllReports);
router.put('/admin/:id', protect, admin, reportController.updateReportStatus);

module.exports = router;
