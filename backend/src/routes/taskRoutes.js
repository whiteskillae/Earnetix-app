const router = require('express').Router();
const { getTasks, getTaskById, createTask, updateTask, deleteTask } = require('../controllers/taskController');
const auth = require('../middleware/auth');
const adminGuard = require('../middleware/adminGuard');
const validate = require('../middleware/validate');
const { createTaskSchema, updateTaskSchema } = require('../validators/taskSchema');

const { taskAttachmentUpload } = require('../middleware/uploadMiddleware');

router.get('/', auth, getTasks);
router.get('/:id', auth, getTaskById);
router.post('/', auth, adminGuard, taskAttachmentUpload, validate(createTaskSchema), createTask);
router.put('/:id', auth, adminGuard, taskAttachmentUpload, validate(updateTaskSchema), updateTask);
router.delete('/:id', auth, adminGuard, deleteTask);

module.exports = router;
