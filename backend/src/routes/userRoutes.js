const router = require('express').Router();
const { getProfile, updateProfile, getLeaderboard } = require('../controllers/userController');
const auth = require('../middleware/auth');

router.get('/profile', auth, getProfile);
router.put('/profile', auth, updateProfile);
router.get('/leaderboard', auth, getLeaderboard);

module.exports = router;
