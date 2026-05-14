const router = require('express').Router();
const { getSkillCategories, createSkillCategory, updateSkillCategory, deleteSkillCategory, getUsersBySkill } = require('../controllers/skillCategoryController');
const auth = require('../middleware/auth');
const adminGuard = require('../middleware/adminGuard');

router.get('/', auth, getSkillCategories);
router.get('/users', auth, adminGuard, getUsersBySkill);
router.post('/', auth, adminGuard, createSkillCategory);
router.put('/:id', auth, adminGuard, updateSkillCategory);
router.delete('/:id', auth, adminGuard, deleteSkillCategory);

module.exports = router;
