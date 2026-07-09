const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

const { requireAuth } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/google', authController.googleLogin);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.put('/profile', requireAuth, authController.updateProfile);
router.get('/profile', requireAuth, authController.getProfile);

module.exports = router;
