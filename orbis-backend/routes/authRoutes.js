const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

const { requireAuth } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/google', authController.googleLogin);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.put('/profile', requireAuth, authController.updateProfile);

module.exports = router;
