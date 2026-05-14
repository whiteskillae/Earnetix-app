const router = require('express').Router();
const auth = require('../middleware/auth');
const adminGuard = require('../middleware/adminGuard');
const { getGalleryItems, deleteGalleryItem } = require('../controllers/galleryController');

// All routes are admin-only
router.get('/', auth, adminGuard, getGalleryItems);
router.delete('/:submissionId/:fileField', auth, adminGuard, deleteGalleryItem);

module.exports = router;
