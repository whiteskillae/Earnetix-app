const router = require('express').Router();
const { getDashboard, getUsers, getSubmissions, approveSubmission, rejectSubmission, toggleBlockUser, getTasksWithStats, adjustPoints, blockUserTemporary } = require('../controllers/adminController');
const auth = require('../middleware/auth');
const adminGuard = require('../middleware/adminGuard');
const validate = require('../middleware/validate');
const { rejectSubmissionSchema } = require('../validators/submissionSchema');

router.use(auth, adminGuard); // All admin routes require auth + admin role

router.get('/dashboard', getDashboard);
router.get('/users', getUsers);
router.get('/submissions', getSubmissions);
router.get('/tasks', getTasksWithStats);
router.put('/submissions/:id/approve', approveSubmission);
router.put('/submissions/:id/reject', validate(rejectSubmissionSchema), rejectSubmission);
router.patch('/users/:id/toggle-block', toggleBlockUser);
router.patch('/users/:id/block-temporary', blockUserTemporary);
router.post('/users/:id/adjust-points', adjustPoints);

module.exports = router;
