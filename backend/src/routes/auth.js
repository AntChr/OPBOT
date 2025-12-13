const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticateToken = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/scoring', authenticateToken, authController.updateScoring);

// Admin/Debug routes
router.get('/users', authenticateToken, adminAuth, authController.getAllUsers);
router.patch('/users/:userId/admin', authenticateToken, adminAuth, authController.promoteToAdmin);

module.exports = router;