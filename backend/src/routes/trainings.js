/**
 * Routes API pour les Formations Personnalisées
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const Training = require('../models/Training');
const SkillsAssessment = require('../models/SkillsAssessment');
const authenticateToken = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

/**
 * POST /api/trainings/generate
 * Déclenche la génération d'une formation personnalisée
 * (Ce endpoint déclenche un workflow n8n)
 *
 * Body: { userId, careerId, targetJob, constraints }
 *
 * Authentification requise
 */
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const { userId, careerId, targetJob, constraints, skillsAssessmentId } = req.body;

    // Vérifier que l'utilisateur génère sa propre formation (sauf admin)
    if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé'
      });
    }

    // Vérifier qu'il n'y a pas déjà une formation active
    const existingTraining = await Training.findActiveTraining(userId);

    if (existingTraining) {
      // Si la formation existante a échoué, on la supprime pour permettre une nouvelle génération
      if (existingTraining.status === 'generation_failed') {
        console.log('🗑️ Suppression formation échouée:', existingTraining._id);
        await Training.findByIdAndDelete(existingTraining._id);
      }
      // Si la formation est en cours de génération depuis plus de 10 minutes, c'est probablement bloqué
      else if (existingTraining.status === 'generating') {
        const createdAt = new Date(existingTraining.createdAt);
        const now = new Date();
        const minutesElapsed = (now - createdAt) / 1000 / 60;

        if (minutesElapsed > 10) {
          console.log('🗑️ Suppression formation bloquée (génération > 10 min):', existingTraining._id);
          await Training.findByIdAndDelete(existingTraining._id);
        } else {
          return res.status(400).json({
            success: false,
            error: `Une formation est déjà en cours de génération (démarrée il y a ${Math.round(minutesElapsed)} min). Veuillez patienter ou réessayer dans ${Math.round(10 - minutesElapsed)} min.`,
            trainingId: existingTraining._id
          });
        }
      }
      // Formation active, ne pas supprimer
      else {
        return res.status(400).json({
          success: false,
          error: 'Une formation est déjà active. Terminez-la avant d\'en créer une nouvelle.',
          trainingId: existingTraining._id
        });
      }
    }

    // Créer un placeholder de formation en statut "generating"
    const training = new Training({
      userId,
      careerId,
      targetJob,
      entryLevel: 'beginner', // sera mis à jour par n8n
      trainingObjective: 'En cours de génération...',
      userConstraints: constraints || {},
      status: 'generating',
      skillsAssessmentId: skillsAssessmentId || null
    });

    await training.save();

    // Déclencher le workflow n8n
    const n8nWebhookUrl = process.env.N8N_TRAINING_GENERATE_WEBHOOK_URL;

    if (n8nWebhookUrl) {
      try {
        // Augmenter le timeout à 30 secondes pour laisser n8n répondre
        // Note: n8n devrait avoir un nœud "Respond to Webhook" au début pour répondre immédiatement
        await axios.post(n8nWebhookUrl, {
          trainingId: training._id.toString(),
          userId: userId,
          targetJob: targetJob,
          skillsAssessmentId: skillsAssessmentId || null
        }, {
          timeout: 30000 // 30 secondes timeout
        });

        console.log('✅ Webhook n8n déclenché:', training._id);
      } catch (webhookError) {
        console.error('❌ Erreur webhook n8n:', webhookError.message);

        // Si c'est un timeout, c'est probablement que n8n est en train de traiter
        // Ne PAS marquer comme failed immédiatement
        if (webhookError.code === 'ECONNABORTED' || webhookError.code === 'ETIMEDOUT') {
          console.log('⏳ Timeout webhook - n8n est probablement en cours de traitement');
          // Garder le status "generating", n8n va callback quand c'est fait
        } else {
          // Vraie erreur (réseau, 404, etc.)
          training.status = 'generation_failed';
          await training.save();
        }
      }
    } else {
      console.warn('⚠️ N8N_TRAINING_GENERATE_WEBHOOK_URL non configuré');
    }

    res.status(201).json({
      success: true,
      message: 'Génération de la formation en cours',
      trainingId: training._id,
      status: training.status
    });

  } catch (error) {
    console.error('Erreur POST /api/trainings/generate:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/trainings/save-from-n8n
 * Sauvegarde la formation générée par n8n
 *
 * Body: { trainingId, overview, modules, finalProject }
 */
router.post('/save-from-n8n', async (req, res) => {
  try {
    const { trainingId, overview, modules, finalProject, skillsAssessmentId } = req.body;

    if (!trainingId) {
      return res.status(400).json({
        success: false,
        error: 'trainingId requis'
      });
    }

    const training = await Training.findById(trainingId);

    if (!training) {
      return res.status(404).json({
        success: false,
        error: 'Formation non trouvée'
      });
    }

    // Mettre à jour la formation avec les données générées
    if (overview) {
      training.trainingObjective = overview.training_objective || overview.trainingObjective;
      training.estimatedDuration = overview.estimated_duration || overview.estimatedDuration;
      training.entryLevel = overview.entry_level || overview.entryLevel;
      training.targetLevel = overview.target_level || overview.targetLevel;
      training.finalSkills = overview.final_skills || overview.finalSkills || [];
      training.phases = overview.phases || {};
    }

    if (modules && Array.isArray(modules)) {
      training.modules = modules.map((module, index) => ({
        moduleNumber: module.module_number || module.moduleNumber || index + 1,
        title: module.title,
        objective: module.objective,
        skillsTargeted: module.skills_targeted || module.skillsTargeted || [],
        keyConcepts: module.key_concepts || module.keyConcepts || [],
        bestPractices: module.best_practices || module.bestPractices || [],
        commonMistakes: module.common_mistakes || module.commonMistakes || [],
        lessons: (module.lessons || []).map((lesson, lessonIndex) => ({
          lessonNumber: lesson.lesson_number || lesson.lessonNumber || lessonIndex + 1,
          title: lesson.title,
          keyConcept: lesson.key_concept || lesson.keyConcept || lesson.title, // Fallback to title if missing
          context: lesson.context || '',
          content: lesson.content,
          miniExercise: lesson.mini_exercise || lesson.miniExercise ? {
            question: (lesson.mini_exercise || lesson.miniExercise).question,
            type: (lesson.mini_exercise || lesson.miniExercise).type || 'open',
            expectedOutcome: (lesson.mini_exercise || lesson.miniExercise).expected_outcome ||
                            (lesson.mini_exercise || lesson.miniExercise).expectedOutcome || ''
          } : null
        })),
        moduleExercise: module.module_exercise || module.moduleExercise ? {
          exerciseType: 'evaluation',
          description: (module.module_exercise || module.moduleExercise).description,
          evaluationCriteria: (module.module_exercise || module.moduleExercise).evaluation_criteria ||
                              (module.module_exercise || module.moduleExercise).evaluationCriteria || []
        } : null,
        resources: module.resources || [],
        status: index === 0 ? 'available' : 'locked' // Premier module débloqué
      }));
    }

    if (finalProject) {
      training.finalProject = {
        title: finalProject.title,
        brief: finalProject.brief,
        context: finalProject.context || '',
        deliverables: finalProject.deliverables || [],
        evaluationGrid: finalProject.evaluation_grid || finalProject.evaluationGrid || [],
        estimatedTime: finalProject.estimated_time || finalProject.estimatedTime || '',
        tips: finalProject.tips || []
      };
    }

    if (skillsAssessmentId) {
      training.skillsAssessmentId = skillsAssessmentId;

      // Marquer l'évaluation comme utilisée
      await SkillsAssessment.findByIdAndUpdate(skillsAssessmentId, {
        usedForTraining: true,
        trainingId: trainingId
      });
    }

    training.status = 'active';
    training.generatedAt = new Date();
    training.calculateProgress();

    await training.save();

    res.json({
      success: true,
      message: 'Formation sauvegardée avec succès',
      trainingId: training._id
    });

  } catch (error) {
    console.error('Erreur POST /api/trainings/save-from-n8n:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/trainings/:userId
 * Récupère la formation active d'un utilisateur
 *
 * Authentification requise
 */
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Vérifier que l'utilisateur accède à sa propre formation (sauf admin)
    if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé'
      });
    }

    const training = await Training.findActiveTraining(userId);

    if (!training) {
      return res.status(404).json({
        success: false,
        error: 'Aucune formation active trouvée'
      });
    }

    res.json({
      success: true,
      training: training.toClientFormat()
    });

  } catch (error) {
    console.error('Erreur GET /api/trainings/:userId:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/trainings/detail/:trainingId
 * Récupère les détails complets d'une formation
 *
 * Authentification requise
 */
router.get('/detail/:trainingId', authenticateToken, async (req, res) => {
  try {
    const { trainingId } = req.params;

    const training = await Training.findById(trainingId);

    if (!training) {
      return res.status(404).json({
        success: false,
        error: 'Formation non trouvée'
      });
    }

    // Vérifier l'accès
    if (req.user._id.toString() !== training.userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé'
      });
    }

    res.json({
      success: true,
      training
    });

  } catch (error) {
    console.error('Erreur GET /api/trainings/detail/:trainingId:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/trainings/module/:trainingId/:moduleNumber
 * Récupère un module spécifique avec toutes ses leçons
 *
 * Authentification requise
 */
router.get('/module/:trainingId/:moduleNumber', authenticateToken, async (req, res) => {
  try {
    const { trainingId, moduleNumber } = req.params;

    const training = await Training.findById(trainingId);

    if (!training) {
      return res.status(404).json({
        success: false,
        error: 'Formation non trouvée'
      });
    }

    // Vérifier l'accès
    if (req.user._id.toString() !== training.userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé'
      });
    }

    const module = training.modules.find(m => m.moduleNumber === parseInt(moduleNumber));

    if (!module) {
      return res.status(404).json({
        success: false,
        error: 'Module non trouvé'
      });
    }

    res.json({
      success: true,
      module
    });

  } catch (error) {
    console.error('Erreur GET /api/trainings/module/:trainingId/:moduleNumber:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/trainings/lesson/:trainingId/complete
 * Marque une leçon comme terminée
 *
 * Body: { moduleNumber, lessonNumber }
 *
 * Authentification requise
 */
router.put('/lesson/:trainingId/complete', authenticateToken, async (req, res) => {
  try {
    const { trainingId } = req.params;
    const { moduleNumber, lessonNumber } = req.body;

    const training = await Training.findById(trainingId);

    if (!training) {
      return res.status(404).json({
        success: false,
        error: 'Formation non trouvée'
      });
    }

    // Vérifier l'accès
    if (req.user._id.toString() !== training.userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé'
      });
    }

    const module = training.modules.find(m => m.moduleNumber === parseInt(moduleNumber));

    if (!module) {
      return res.status(404).json({
        success: false,
        error: 'Module non trouvé'
      });
    }

    const lesson = module.lessons.find(l => l.lessonNumber === parseInt(lessonNumber));

    if (!lesson) {
      return res.status(404).json({
        success: false,
        error: 'Leçon non trouvée'
      });
    }

    lesson.completed = true;
    lesson.completedAt = new Date();
    training.lastActivityAt = new Date();
    training.calculateProgress();

    await training.save();

    res.json({
      success: true,
      message: 'Leçon marquée comme terminée',
      progress: training.progress
    });

  } catch (error) {
    console.error('Erreur PUT /api/trainings/lesson/:trainingId/complete:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/trainings/module/:trainingId/complete
 * Marque un module comme terminé et débloque le suivant
 *
 * Body: { moduleNumber }
 *
 * Authentification requise
 */
router.put('/module/:trainingId/complete', authenticateToken, async (req, res) => {
  try {
    const { trainingId } = req.params;
    const { moduleNumber } = req.body;

    const training = await Training.findById(trainingId);

    if (!training) {
      return res.status(404).json({
        success: false,
        error: 'Formation non trouvée'
      });
    }

    // Vérifier l'accès
    if (req.user._id.toString() !== training.userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé'
      });
    }

    const success = training.completeModule(parseInt(moduleNumber));

    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'Impossible de marquer le module comme terminé'
      });
    }

    await training.save();

    res.json({
      success: true,
      message: 'Module terminé avec succès',
      progress: training.progress,
      nextModuleUnlocked: training.progress.currentModule > moduleNumber
    });

  } catch (error) {
    console.error('Erreur PUT /api/trainings/module/:trainingId/complete:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/trainings/submit-exercise
 * Soumet un exercice pour évaluation (déclenche workflow n8n)
 *
 * Body: { trainingId, moduleNumber, userSubmission }
 *
 * Authentification requise
 */
router.post('/submit-exercise', authenticateToken, async (req, res) => {
  try {
    const { trainingId, moduleNumber, userSubmission } = req.body;

    const training = await Training.findById(trainingId);

    if (!training) {
      return res.status(404).json({
        success: false,
        error: 'Formation non trouvée'
      });
    }

    // Vérifier l'accès
    if (req.user._id.toString() !== training.userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé'
      });
    }

    const module = training.modules.find(m => m.moduleNumber === parseInt(moduleNumber));

    if (!module || !module.moduleExercise) {
      return res.status(404).json({
        success: false,
        error: 'Exercice non trouvé'
      });
    }

    module.moduleExercise.userSubmission = userSubmission;
    module.moduleExercise.submitted = true;
    module.moduleExercise.submittedAt = new Date();
    training.lastActivityAt = new Date();

    await training.save();

    // Déclencher le workflow n8n d'évaluation
    const n8nWebhookUrl = process.env.N8N_EXERCISE_EVALUATE_WEBHOOK_URL;

    if (n8nWebhookUrl) {
      try {
        await axios.post(n8nWebhookUrl, {
          trainingId: training._id.toString(),
          moduleNumber: parseInt(moduleNumber),
          exerciseDescription: module.moduleExercise.description,
          evaluationCriteria: module.moduleExercise.evaluationCriteria || [],
          userSubmission: userSubmission,
          targetJob: training.targetJob,
          entryLevel: training.entryLevel,
          moduleObjective: module.objective
        }, {
          timeout: 5000
        });

        console.log('✅ Webhook évaluation n8n déclenché:', trainingId, 'module', moduleNumber);
      } catch (webhookError) {
        console.error('❌ Erreur webhook évaluation n8n:', webhookError.message);
        // Ne pas bloquer, l'utilisateur verra "en attente de feedback"
      }
    } else {
      console.warn('⚠️ N8N_EXERCISE_EVALUATE_WEBHOOK_URL non configuré');
    }

    res.json({
      success: true,
      message: 'Exercice soumis pour évaluation',
      status: 'pending_feedback'
    });

  } catch (error) {
    console.error('Erreur POST /api/trainings/submit-exercise:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/trainings/save-feedback
 * Sauvegarde le feedback d'un exercice (appelé par n8n)
 *
 * Body: { trainingId, moduleNumber, feedback, score, detailedEvaluation }
 */
router.post('/save-feedback', async (req, res) => {
  try {
    const { trainingId, moduleNumber, feedback, score, detailedEvaluation } = req.body;

    const training = await Training.findById(trainingId);

    if (!training) {
      return res.status(404).json({
        success: false,
        error: 'Formation non trouvée'
      });
    }

    const module = training.modules.find(m => m.moduleNumber === parseInt(moduleNumber));

    if (!module || !module.moduleExercise) {
      return res.status(404).json({
        success: false,
        error: 'Exercice non trouvé'
      });
    }

    module.moduleExercise.llmFeedback = feedback;
    module.moduleExercise.score = score;
    module.moduleExercise.detailedEvaluation = detailedEvaluation || {};
    module.moduleExercise.feedbackAt = new Date();

    training.calculateAverageScore();
    training.calculateProgress();

    await training.save();

    res.json({
      success: true,
      message: 'Feedback sauvegardé avec succès'
    });

  } catch (error) {
    console.error('Erreur POST /api/trainings/save-feedback:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/trainings/:trainingId/status
 * Met à jour le statut d'une formation
 *
 * Body: { status }
 *
 * Authentification requise
 */
router.put('/:trainingId/status', authenticateToken, async (req, res) => {
  try {
    const { trainingId } = req.params;
    const { status } = req.body;

    const training = await Training.findById(trainingId);

    if (!training) {
      return res.status(404).json({
        success: false,
        error: 'Formation non trouvée'
      });
    }

    // Vérifier l'accès
    if (req.user._id.toString() !== training.userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé'
      });
    }

    training.status = status;

    if (status === 'completed') {
      training.completedAt = new Date();
    } else if (status === 'active' && !training.startedAt) {
      training.startedAt = new Date();
    }

    await training.save();

    res.json({
      success: true,
      message: 'Statut mis à jour',
      status: training.status
    });

  } catch (error) {
    console.error('Erreur PUT /api/trainings/:trainingId/status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/trainings/admin/all
 * Récupère toutes les formations (admin seulement)
 */
router.get('/admin/all', authenticateToken, adminAuth, async (req, res) => {
  try {
    const { status, limit = 50, skip = 0 } = req.query;

    const filter = {};
    if (status) {
      filter.status = status;
    }

    const total = await Training.countDocuments(filter);
    const trainings = await Training.find(filter)
      .populate('userId', 'username email firstName lastName')
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: trainings,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: parseInt(skip) + parseInt(limit) < total
      }
    });

  } catch (error) {
    console.error('Erreur GET /api/trainings/admin/all:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
