const router = require('express').Router();
const auth = require('../middleware/auth');
const adminGuard = require('../middleware/adminGuard');
const { getGalleryItems, deleteGalleryItem, deleteGalleryItemsBulk } = require('../controllers/galleryController');

// All routes are admin-only
router.get('/', auth, adminGuard, getGalleryItems);
router.post('/bulk-delete', auth, adminGuard, deleteGalleryItemsBulk);
router.delete('/:submissionId/:fileField', auth, adminGuard, deleteGalleryItem);


module.exports = router;
