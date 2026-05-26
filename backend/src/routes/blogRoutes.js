const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const adminGuard = require('../middleware/adminGuard');
const {
  createBlog,
  updateBlog,
  deleteBlog,
  getPublicBlogs,
  getBlogById,
  getMyBlogs,
  toggleLikeBlog,
  adminGetAllBlogs,
  adminApproveBlog,
  adminRejectBlog,
  adminDeleteBlog,
  getBlogTasks,
} = require('../controllers/blogController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max per file
});

// ─── PUBLIC ROUTES ────────────────────────────────────────────────
router.get('/', getPublicBlogs);                          // Public gallery
router.get('/detail/:id', optionalAuth, getBlogById);     // Single blog view

// ─── USER ROUTES ──────────────────────────────────────────────────
router.get('/my', auth, getMyBlogs);
router.get('/tasks', auth, getBlogTasks);                 // Blog-type tasks available
router.post('/:id/like', auth, toggleLikeBlog);           // Like/unlike blog
router.post('/', auth, upload.fields([{ name: 'coverImage', maxCount: 1 }, { name: 'inlineImages', maxCount: 20 }]), createBlog);
router.put('/:id', auth, upload.fields([{ name: 'coverImage', maxCount: 1 }, { name: 'inlineImages', maxCount: 20 }]), updateBlog);
router.delete('/:id', auth, deleteBlog);

router.get('/admin/all', auth, adminGuard, adminGetAllBlogs);
router.put('/admin/:id/approve', auth, adminGuard, adminApproveBlog);
router.put('/admin/:id/reject', auth, adminGuard, adminRejectBlog);
router.delete('/admin/:id', auth, adminGuard, adminDeleteBlog);

module.exports = router;
