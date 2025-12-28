/**
 * Routes API pour l'Évaluation des Compétences
 */

const express = require('express');
const router = express.Router();
const SkillsAssessment = require('../models/SkillsAssessment');
const authenticateToken = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

/**
 * POST /api/skills-assessment/save
 * Sauvegarde une évaluation de compétences (depuis n8n ou frontend)
 *
 * Body: {
 *   userId, targetJob, assessedSkills, entryLevel,
 *   skillGaps, strengths, transferableExperience, etc.
 * }
 */
router.post('/save', async (req, res) => {
  try {
    const {
      userId,
      careerId,
      conversationId,
      targetJob,
      assessedSkills,
      transferableExperience,
      entryLevel,
      skillGaps,
      strengths,
      recommendations,
      assessmentMethod
    } = req.body;

    // Validation des champs requis
    if (!userId || !targetJob) {
      return res.status(400).json({
        success: false,
        error: 'userId et targetJob sont requis'
      });
    }

    // Créer la nouvelle évaluation
    const skillsAssessment = new SkillsAssessment({
      userId,
      careerId,
      conversationId,
      targetJob,
      assessedSkills: assessedSkills || new Map(),
      transferableExperience: transferableExperience || '',
      entryLevel: entryLevel || 'beginner',
      skillGaps: skillGaps || [],
      strengths: strengths || [],
      recommendations: recommendations || {},
      assessmentMethod: assessmentMethod || 'conversation'
    });

    // Calculer le niveau d'entrée si des compétences sont fournies
    if (assessedSkills && Object.keys(assessedSkills).length > 0) {
      skillsAssessment.calculateEntryLevel();
    }

    await skillsAssessment.save();

    res.status(201).json({
      success: true,
      message: 'Évaluation des compétences sauvegardée avec succès',
      assessmentId: skillsAssessment._id,
      entryLevel: skillsAssessment.entryLevel
    });

  } catch (error) {
    console.error('Erreur POST /api/skills-assessment/save:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/skills-assessment/:userId
 * Récupère la dernière évaluation de compétences d'un utilisateur
 *
 * Query params optionnels:
 * - targetJob: filtrer par métier cible
 *
 * Authentification requise
 */
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { targetJob } = req.query;

    // Vérifier que l'utilisateur accède à sa propre évaluation (sauf admin)
    if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé'
      });
    }

    const assessment = await SkillsAssessment.getLatestAssessment(userId, targetJob);

    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: 'Aucune évaluation de compétences trouvée'
      });
    }

    res.json({
      success: true,
      assessment
    });

  } catch (error) {
    console.error('Erreur GET /api/skills-assessment/:userId:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/skills-assessment/:userId/all
 * Récupère toutes les évaluations d'un utilisateur
 *
 * Authentification requise
 */
router.get('/:userId/all', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Vérifier que l'utilisateur accède à ses propres évaluations (sauf admin)
    if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé'
      });
    }

    const assessments = await SkillsAssessment.find({ userId })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: assessments.length,
      assessments
    });

  } catch (error) {
    console.error('Erreur GET /api/skills-assessment/:userId/all:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/skills-assessment/:assessmentId
 * Met à jour une évaluation existante
 *
 * Authentification requise
 */
router.put('/:assessmentId', authenticateToken, async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const updates = req.body;

    const assessment = await SkillsAssessment.findById(assessmentId);

    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: 'Évaluation non trouvée'
      });
    }

    // Vérifier que l'utilisateur modifie sa propre évaluation (sauf admin)
    if (req.user._id.toString() !== assessment.userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé'
      });
    }

    // Appliquer les mises à jour
    Object.keys(updates).forEach(key => {
      if (key !== '_id' && key !== 'userId' && key !== 'createdAt') {
        assessment[key] = updates[key];
      }
    });

    // Recalculer le niveau d'entrée si nécessaire
    if (updates.assessedSkills) {
      assessment.calculateEntryLevel();
    }

    await assessment.save();

    res.json({
      success: true,
      message: 'Évaluation mise à jour avec succès',
      assessment
    });

  } catch (error) {
    console.error('Erreur PUT /api/skills-assessment/:assessmentId:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/skills-assessment/:assessmentId/training-input
 * Formate une évaluation pour la génération de formation
 *
 * Authentification requise
 */
router.get('/:assessmentId/training-input', authenticateToken, async (req, res) => {
  try {
    const { assessmentId } = req.params;

    const assessment = await SkillsAssessment.findById(assessmentId);

    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: 'Évaluation non trouvée'
      });
    }

    // Vérifier l'accès
    if (req.user._id.toString() !== assessment.userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé'
      });
    }

    const trainingInput = assessment.toTrainingInput();

    res.json({
      success: true,
      trainingInput
    });

  } catch (error) {
    console.error('Erreur GET /api/skills-assessment/:assessmentId/training-input:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/skills-assessment/:assessmentId
 * Supprime une évaluation
 *
 * Authentification requise
 */
router.delete('/:assessmentId', authenticateToken, async (req, res) => {
  try {
    const { assessmentId } = req.params;

    const assessment = await SkillsAssessment.findById(assessmentId);

    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: 'Évaluation non trouvée'
      });
    }

    // Vérifier que l'utilisateur supprime sa propre évaluation (sauf admin)
    if (req.user._id.toString() !== assessment.userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé'
      });
    }

    // Vérifier si l'évaluation est utilisée par une formation
    if (assessment.usedForTraining) {
      return res.status(400).json({
        success: false,
        error: 'Impossible de supprimer une évaluation utilisée par une formation'
      });
    }

    await SkillsAssessment.findByIdAndDelete(assessmentId);

    res.json({
      success: true,
      message: 'Évaluation supprimée avec succès'
    });

  } catch (error) {
    console.error('Erreur DELETE /api/skills-assessment/:assessmentId:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/skills-assessment/admin/all
 * Récupère toutes les évaluations (admin seulement)
 */
router.get('/admin/all', authenticateToken, adminAuth, async (req, res) => {
  try {
    const { limit = 50, skip = 0, targetJob } = req.query;

    const filter = {};
    if (targetJob) {
      filter.targetJob = new RegExp(targetJob, 'i');
    }

    const total = await SkillsAssessment.countDocuments(filter);
    const assessments = await SkillsAssessment.find(filter)
      .populate('userId', 'username email firstName lastName')
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: assessments,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: parseInt(skip) + parseInt(limit) < total
      }
    });

  } catch (error) {
    console.error('Erreur GET /api/skills-assessment/admin/all:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
