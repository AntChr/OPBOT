const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticateToken = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const { authLimiter, forgotPasswordLimiter } = require('../middleware/rateLimiters');

// Public routes with specific rate limiters
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/forgot-password', forgotPasswordLimiter, authController.forgotPassword);

// Protected routes
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/scoring', authenticateToken, authController.updateScoring);

// Admin/Debug routes
router.get('/users', authenticateToken, adminAuth, authController.getAllUsers);
router.patch('/users/:userId/admin', authenticateToken, adminAuth, authController.promoteToAdmin);
router.post('/impersonate/:userId', authenticateToken, adminAuth, authController.impersonate);

module.exports = router;