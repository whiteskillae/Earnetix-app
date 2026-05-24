const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const adminGuard = require('../middleware/adminGuard');
const {
  createBlog,
  updateBlog,
  deleteBlog,
  getPublicBlogs,
  getBlogById,
  getMyBlogs,
  adminGetAllBlogs,
  adminApproveBlog,
  adminRejectBlog,
  adminBlockBlog,
  getBlogTasks,
} = require('../controllers/blogController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max per file
});

// ─── PUBLIC ROUTES ────────────────────────────────────────────────
router.get('/', getPublicBlogs);                          // Public gallery
router.get('/detail/:id', getBlogById);                   // Single blog view

// ─── USER ROUTES ──────────────────────────────────────────────────
router.get('/my', auth, getMyBlogs);
router.get('/tasks', auth, getBlogTasks);                 // Blog-type tasks available
router.post('/', auth, upload.fields([{ name: 'coverImage', maxCount: 1 }]), createBlog);
router.put('/:id', auth, upload.fields([{ name: 'coverImage', maxCount: 1 }]), updateBlog);
router.delete('/:id', auth, deleteBlog);

// ─── ADMIN ROUTES ─────────────────────────────────────────────────
router.get('/admin/all', auth, adminGuard, adminGetAllBlogs);
router.put('/admin/:id/approve', auth, adminGuard, adminApproveBlog);
router.put('/admin/:id/reject', auth, adminGuard, adminRejectBlog);
router.put('/admin/:id/block', auth, adminGuard, adminBlockBlog);

module.exports = router;
