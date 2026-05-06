const router = require('express').Router();
const { getAnnouncements, createAnnouncement, deleteAnnouncement, toggleAnnouncement } = require('../controllers/announcementController');
const auth = require('../middleware/auth');
const adminGuard = require('../middleware/adminGuard');

router.get('/', auth, getAnnouncements);
router.post('/', auth, adminGuard, createAnnouncement);
router.patch('/:id/toggle', auth, adminGuard, toggleAnnouncement);
router.delete('/:id', auth, adminGuard, deleteAnnouncement);

module.exports = router;
