const router = require('express').Router();
const { 
  getDashboard, getUsers, getSubmissions, approveSubmission, rejectSubmission, 
  toggleBlockUser, getTasksWithStats, adjustPoints, blockUserTemporary,
  getPendingAssignedTasks, approveAssignedTask, rejectAssignedTask,
  approveSubmissionsBulk, rejectSubmissionsBulk, blockUsersBulk,
  getBlockedUsers, unblockUser, deleteUser, getAdminLogs
} = require('../controllers/adminController');
const { getAnalytics } = require('../controllers/adminAnalyticsController');
const auth = require('../middleware/auth');
const adminGuard = require('../middleware/adminGuard');
const validate = require('../middleware/validate');
const { rejectSubmissionSchema } = require('../validators/submissionSchema');
const { adminLimiter } = require('../middleware/rateLimiter');

router.use(auth, adminGuard, adminLimiter); // All admin routes require auth + admin role + admin rate limit

router.get('/dashboard', getDashboard);
router.get('/analytics', getAnalytics);
router.get('/users', getUsers);
router.get('/submissions', getSubmissions);
router.get('/tasks', getTasksWithStats);
router.get('/assigned-tasks/pending', getPendingAssignedTasks);
router.put('/submissions/:id/approve', approveSubmission);
router.put('/submissions/:id/reject', validate(rejectSubmissionSchema), rejectSubmission);
router.put('/assigned-tasks/:id/approve', approveAssignedTask);
router.put('/assigned-tasks/:id/reject', rejectAssignedTask);
router.patch('/users/:id/toggle-block', toggleBlockUser);
router.patch('/users/:id/block-temporary', blockUserTemporary);
router.post('/users/:id/adjust-points', adjustPoints);

// Bulk Actions
router.post('/submissions/bulk-approve', approveSubmissionsBulk);
router.post('/submissions/bulk-reject', rejectSubmissionsBulk);
router.post('/users/bulk-block', blockUsersBulk);

// Block Management
router.get('/users/blocked', getBlockedUsers);
router.post('/users/:id/unblock', unblockUser);

// Delete User (Hard Delete)
router.delete('/users/:id', deleteUser);

// Admin Activity Logs
router.get('/logs', getAdminLogs);

module.exports = router;
