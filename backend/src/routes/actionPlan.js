/**
 * Routes API pour les Plans d'Action
 */

const express = require('express');
const router = express.Router();
const ActionPlan = require('../models/ActionPlan');
const authenticateToken = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

/**
 * GET /api/action-plan/:userId
 * Récupère le plan d'action actif d'un utilisateur
 *
 * Authentification requise
 * L'utilisateur ne peut accéder qu'à son propre plan (sauf admin)
 */
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Vérifier que l'utilisateur accède à son propre plan (sauf admin)
    if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé'
      });
    }

    // Récupérer le plan d'action actif le plus récent
    const actionPlan = await ActionPlan.findActiveForUser(userId);

    if (!actionPlan) {
      return res.status(404).json({
        success: false,
        error: 'Aucun plan d\'action trouvé',
        message: 'Terminez votre conversation avec Obot pour obtenir votre plan d\'action personnalisé.'
      });
    }

    // Vérifier si le plan est expiré
    if (actionPlan.isExpired()) {
      return res.status(410).json({
        success: false,
        error: 'Plan d\'action expiré',
        message: 'Votre plan d\'action a expiré. Un nouveau plan sera généré automatiquement.',
        daysOld: actionPlan.getDaysOld()
      });
    }

    res.json({
      success: true,
      actionPlan
    });

  } catch (error) {
    console.error('Erreur GET /api/action-plan/:userId:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/action-plan/admin/all
 * Récupère tous les plans d'action (admin seulement)
 */
router.get('/admin/all', authenticateToken, adminAuth, async (req, res) => {
  try {
    const { status, limit = 50, skip = 0 } = req.query;

    const filter = {};
    if (status) {
      filter.status = status;
    }

    const total = await ActionPlan.countDocuments(filter);
    const actionPlans = await ActionPlan.find(filter)
      .populate('userId', 'username email firstName lastName')
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: actionPlans,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: parseInt(skip) + parseInt(limit) < total
      }
    });

  } catch (error) {
    console.error('Erreur GET /api/action-plan/admin/all:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/action-plan/generate
 * Déclenche la génération d'un plan d'action via n8n
 */
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const { userId, jobTitle, userProfile } = req.body;

    // Vérifier que l'utilisateur génère son propre plan (sauf admin)
    if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé'
      });
    }

    if (!jobTitle) {
      return res.status(400).json({
        success: false,
        error: 'Le métier est requis pour générer un plan d\'action'
      });
    }

    // Vérifier que n8n est configuré
    if (!process.env.N8N_WEBHOOK_URL) {
      return res.status(503).json({
        success: false,
        error: 'Service de génération non configuré',
        note: 'N8N_WEBHOOK_URL manquant dans .env'
      });
    }

    // Appeler le workflow n8n
    const axios = require('axios');

    const payload = {
      userId,
      jobTitle,
      userProfile: userProfile || {
        location: req.user.location || 'Paris',
        region: req.user.region || 'Île-de-France',
        age: req.user.age || 25,
        education: req.user.education || 'bac'
      }
    };

    console.log('Déclenchement workflow n8n:', payload);

    const n8nResponse = await axios.post(process.env.N8N_WEBHOOK_URL, payload, {
      timeout: 60000 // 60 secondes timeout
    });

    res.json({
      success: true,
      message: 'Plan d\'action généré avec succès',
      actionPlanId: n8nResponse.data.actionPlanId,
      data: n8nResponse.data
    });

  } catch (error) {
    console.error('Erreur POST /api/action-plan/generate:', error);

    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'Service de génération indisponible',
        note: 'n8n workflow non accessible'
      });
    }

    if (error.response) {
      return res.status(error.response.status).json({
        success: false,
        error: 'Erreur lors de la génération',
        details: error.response.data
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/action-plan/save-from-n8n
 * Sauvegarde directe d'un plan d'action depuis n8n
 *
 * NOTE: Cette route est publique (pas d'auth) car appelée par n8n
 * TODO: Ajouter une validation par secret partagé ou IP whitelist
 */
router.post('/save-from-n8n', async (req, res) => {
  try {
    const actionPlanData = req.body;

    console.log('📥 Réception plan d\'action depuis n8n:', {
      userId: actionPlanData.userId,
      jobTitle: actionPlanData.jobTitle,
      offersCount: actionPlanData.jobOffers?.length || 0
    });

    // Créer le plan d'action dans MongoDB
    const actionPlan = new ActionPlan(actionPlanData);
    await actionPlan.save();

    console.log('✅ Plan d\'action sauvegardé:', actionPlan._id);

    res.json({
      success: true,
      actionPlanId: actionPlan._id,
      message: 'Plan d\'action sauvegardé avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur POST /api/action-plan/save-from-n8n:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/action-plan/webhook-complete
 * Callback appelé par n8n quand un plan est généré
 *
 * NOTE: Cette route est publique (pas d'auth) car appelée par n8n
 * TODO: Ajouter une validation par secret partagé ou IP whitelist
 */
router.post('/webhook-complete', async (req, res) => {
  try {
    const { success, userId, actionPlanId, jobTitle } = req.body;

    console.log('Callback n8n reçu:', { success, userId, actionPlanId, jobTitle });

    if (!success) {
      console.error('n8n a signalé un échec:', req.body);
      return res.json({ received: true, note: 'Échec signalé' });
    }

    // Vérifier que le plan existe dans la DB
    const actionPlan = await ActionPlan.findById(actionPlanId);

    if (!actionPlan) {
      console.warn('Plan d\'action non trouvé:', actionPlanId);
      return res.status(404).json({
        success: false,
        error: 'Plan d\'action non trouvé'
      });
    }

    // TODO: Notifier l'utilisateur (WebSocket, email, etc.)
    // TODO: Mettre à jour un cache si nécessaire

    console.log(`✅ Plan d'action créé pour ${userId}: ${jobTitle}`);

    res.json({
      success: true,
      message: 'Callback traité avec succès'
    });

  } catch (error) {
    console.error('Erreur POST /api/action-plan/webhook-complete:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/action-plan/:planId
 * Supprime un plan d'action (admin seulement)
 */
router.delete('/:planId', authenticateToken, adminAuth, async (req, res) => {
  try {
    const { planId } = req.params;

    const actionPlan = await ActionPlan.findByIdAndDelete(planId);

    if (!actionPlan) {
      return res.status(404).json({
        success: false,
        error: 'Plan d\'action non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Plan d\'action supprimé avec succès'
    });

  } catch (error) {
    console.error('Erreur DELETE /api/action-plan/:planId:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
