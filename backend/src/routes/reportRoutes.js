const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const auth = require('../middleware/auth');
const adminGuard = require('../middleware/adminGuard');

// User routes
router.post('/', auth, reportController.submitReport);

// Admin routes
router.get('/admin/all', auth, adminGuard, reportController.getAllReports);
router.put('/admin/:id', auth, adminGuard, reportController.updateReportStatus);

module.exports = router;
