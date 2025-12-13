const express = require('express');
const router = express.Router();
const questionnaireController = require('../controllers/questionnaireController');
const authenticateToken = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// User routes (protected)
router.post('/', authenticateToken, questionnaireController.submitQuestionnaire);

// Admin routes (protected + admin)
router.get('/analytics', authenticateToken, adminAuth, questionnaireController.getAnalytics);
router.get('/:id', authenticateToken, adminAuth, questionnaireController.getQuestionnaireById);

module.exports = router;
