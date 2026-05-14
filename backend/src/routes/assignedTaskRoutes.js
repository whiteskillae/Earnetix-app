const router = require('express').Router();
const { createAndAssignTask, getAllAssignedTasks, getMyAssignedTasks, submitAssignedTask } = require('../controllers/assignedTaskController');
const auth = require('../middleware/auth');
const adminGuard = require('../middleware/adminGuard');
const { taskAttachmentUpload, submissionUpload } = require('../middleware/uploadMiddleware');

router.get('/my', auth, getMyAssignedTasks);
router.post('/:id/submit', auth, submissionUpload, submitAssignedTask);

// Admin only
router.get('/', auth, adminGuard, getAllAssignedTasks);
router.post('/', auth, adminGuard, taskAttachmentUpload, createAndAssignTask);

module.exports = router;
