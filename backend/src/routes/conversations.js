const express = require('express');
const ConversationService = require('../services/ConversationService');
const authenticateToken = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();
const conversationService = new ConversationService();

// Démarrer une nouvelle conversation (protégé)
router.post('/start', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId; // From authentication token

    const conversation = await conversationService.startConversation(userId);

    res.json({
      conversationId: conversation._id,
      status: conversation.status,
      currentPhase: conversation.currentPhase,
      message: conversation.messages[0].content
    });

  } catch (error) {
    console.error('   ❌ Erreur start conversation:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Envoyer un message dans une conversation (protégé)
router.post('/:conversationId/messages', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { message } = req.body;
    const userId = req.userId; // From authentication token

    if (!message) {
      console.error('   ❌ Message manquant');
      return res.status(400).json({ error: 'message est requis' });
    }

    // Verify conversation belongs to authenticated user
    const Conversation = require('../models/Conversation');
    const existingConv = await Conversation.findById(conversationId);
    if (!existingConv) {
      return res.status(404).json({ error: 'Conversation non trouvée' });
    }
    if (existingConv.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    const conversation = await conversationService.processUserMessage(conversationId, message);

    // Récupérer le dernier message de l'assistant
    const lastMessage = conversation.messages
      .filter(m => m.role === 'assistant')
      .pop();

    // Populer les jobRecommendations avec les données complètes des jobs
    let recommendations = null;
    if (conversation.jobRecommendations && conversation.jobRecommendations.length > 0) {
      // Vérifier que les recommandations ont un matchScore > 0
      const validRecommendations = conversation.jobRecommendations.filter(r => r.matchScore > 0);

      if (validRecommendations.length > 0) {
        // Populate manuellement les jobs
        const Conversation = require('../models/Conversation');
        const populatedConv = await Conversation.findById(conversationId).populate('jobRecommendations.jobId');
        recommendations = populatedConv.jobRecommendations.slice(0, 5);
      }
    }

    // Ajouter les milestones à la réponse
    const responseData = {
      response: lastMessage.content,
      analysis: conversation.messages
        .filter(m => m.role === 'user')
        .pop()?.analysis || {},
      currentPhase: conversation.currentPhase,
      jobRecommendations: recommendations,
      milestones: conversation.milestones || {}
    };

    res.json(responseData);

  } catch (error) {
    console.error('   ❌ Erreur process message:', error.message);
    console.error('   Stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

// Obtenir l'état d'une conversation (protégé)
router.get('/:conversationId', authenticateToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.userId; // From authentication token

    const conversation = await conversationService.getConversation(conversationId);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation non trouvée' });
    }

    // Verify conversation belongs to authenticated user
    if (conversation.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    res.json({
      conversationId: conversation._id,
      status: conversation.status,
      currentPhase: conversation.currentPhase,
      buildingProfile: conversation.buildingProfile,
      messages: conversation.messages,
      jobRecommendations: conversation.jobRecommendations
    });

  } catch (error) {
    console.error('Erreur get conversation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Terminer une conversation
router.post('/:conversationId/complete', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { feedback } = req.body;

    const conversation = await conversationService.completeConversation(conversationId, feedback);

    res.json({
      conversationId: conversation._id,
      status: conversation.status,
      finalRecommendations: conversation.jobRecommendations
    });

  } catch (error) {
    console.error('Erreur complete conversation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reset - terminer l'ancienne conversation et en créer une nouvelle (protégé)
router.post('/reset', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId; // From authentication token

    // Terminer toutes les conversations actives de l'utilisateur
    const Conversation = require('../models/Conversation');
    await Conversation.updateMany(
      { userId, status: 'active' },
      { status: 'abandoned', completedAt: new Date() }
    );

    // Créer une nouvelle conversation
    const conversation = await conversationService.startConversation(userId);

    res.json({
      conversationId: conversation._id,
      status: conversation.status,
      currentPhase: conversation.currentPhase,
      message: conversation.messages[0].content
    });

  } catch (error) {
    console.error('Erreur reset conversation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin: Obtenir toutes les conversations avec détails utilisateurs
router.get('/admin/all', authenticateToken, adminAuth, async (req, res) => {
  try {
    const Conversation = require('../models/Conversation');

    // Récupérer toutes les conversations avec les détails des utilisateurs
    const conversations = await Conversation.find({})
      .populate('userId', 'name email')
      .sort({ lastActiveAt: -1 })
      .lean();

    // Formater les données pour l'admin
    const formattedConversations = conversations.map(conv => ({
      _id: conv._id,
      user: conv.userId,
      status: conv.status,
      startedAt: conv.startedAt,
      completedAt: conv.completedAt,
      lastActiveAt: conv.lastActiveAt,
      currentPhase: conv.currentPhase?.name,
      messageCount: conv.messages?.length || 0,
      milestones: conv.milestones,
      quality: conv.quality,
      jobTitle: conv.milestones?.specific_job_identified?.jobTitle || null
    }));

    res.json({
      total: formattedConversations.length,
      conversations: formattedConversations
    });

  } catch (error) {
    console.error('   ❌ Erreur admin all conversations:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Admin: Obtenir les détails complets d'une conversation
router.get('/admin/:conversationId/details', authenticateToken, adminAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const Conversation = require('../models/Conversation');

    const conversation = await Conversation.findById(conversationId)
      .populate('userId', 'name email')
      .lean();

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation non trouvée' });
    }

    res.json(conversation);

  } catch (error) {
    console.error('   ❌ Erreur admin conversation details:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;