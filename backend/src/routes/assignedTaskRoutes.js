const router = require('express').Router();
const { createAndAssignTask, getAllAssignedTasks, getMyAssignedTasks, updateTaskStatus } = require('../controllers/assignedTaskController');
const auth = require('../middleware/auth');
const adminGuard = require('../middleware/adminGuard');

router.get('/my', auth, getMyAssignedTasks);
router.patch('/:id/status', auth, updateTaskStatus);

// Admin only
router.get('/', auth, adminGuard, getAllAssignedTasks);
router.post('/', auth, adminGuard, createAndAssignTask);

module.exports = router;
