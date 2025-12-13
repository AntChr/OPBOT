const ConversationService = require('../services/ConversationService');

const conversationService = new ConversationService();

/**
 * Démarrer une nouvelle conversation
 * POST /api/conversations/start
 */
const startConversation = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId est requis'
      });
    }

    const metadata = {
      platform: req.body.platform || 'web',
      userAgent: req.get('User-Agent'),
      referrer: req.get('Referer')
    };

    const conversation = await conversationService.startConversation(userId, metadata);

    res.set('Content-Type', 'application/json; charset=utf-8');
    res.status(201).json({
      success: true,
      conversation: {
        id: conversation._id,
        sessionId: conversation.sessionId,
        currentPhase: conversation.currentPhase,
        messages: conversation.messages,
        buildingProfile: conversation.buildingProfile,
        status: conversation.status
      }
    });

  } catch (error) {
    console.error('Erreur démarrage conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du démarrage de la conversation',
      error: error.message
    });
  }
};

/**
 * Envoyer un message dans une conversation
 * POST /api/conversations/:conversationId/messages
 */
const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Le message ne peut pas être vide'
      });
    }

    const metadata = {
      timestamp: new Date(),
      userAgent: req.get('User-Agent')
    };

    const updatedConversation = await conversationService.processUserMessage(
      conversationId,
      message,
      metadata
    );

    res.set('Content-Type', 'application/json; charset=utf-8');
    res.json({
      success: true,
      conversation: {
        id: updatedConversation._id,
        sessionId: updatedConversation.sessionId,
        currentPhase: updatedConversation.currentPhase,
        messages: updatedConversation.messages,
        buildingProfile: updatedConversation.buildingProfile,
        jobRecommendations: updatedConversation.jobRecommendations,
        quality: updatedConversation.quality,
        status: updatedConversation.status,
        milestones: updatedConversation.milestones
      }
    });

  } catch (error) {
    console.error('Erreur envoi message:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi du message',
      error: error.message
    });
  }
};

/**
 * Obtenir une conversation par ID
 * GET /api/conversations/:conversationId
 */
const getConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await conversationService.getConversation(conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation non trouvée'
      });
    }

    res.set('Content-Type', 'application/json; charset=utf-8');
    res.json({
      success: true,
      conversation: {
        id: conversation._id,
        sessionId: conversation.sessionId,
        userId: conversation.userId,
        currentPhase: conversation.currentPhase,
        messages: conversation.messages,
        buildingProfile: conversation.buildingProfile,
        jobRecommendations: conversation.jobRecommendations,
        quality: conversation.quality,
        status: conversation.status,
        startedAt: conversation.startedAt,
        lastActiveAt: conversation.lastActiveAt,
        completedAt: conversation.completedAt
      }
    });

  } catch (error) {
    console.error('Erreur récupération conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la conversation',
      error: error.message
    });
  }
};

/**
 * Obtenir les conversations d'un utilisateur
 * GET /api/conversations/user/:userId
 */
const getUserConversations = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;

    const conversations = await conversationService.getUserConversations(
      userId,
      parseInt(limit)
    );

    res.set('Content-Type', 'application/json; charset=utf-8');
    res.json({
      success: true,
      conversations: conversations.map(conv => ({
        id: conv._id,
        sessionId: conv.sessionId,
        currentPhase: conv.currentPhase,
        status: conv.status,
        startedAt: conv.startedAt,
        lastActiveAt: conv.lastActiveAt,
        quality: conv.quality
      }))
    });

  } catch (error) {
    console.error('Erreur récupération conversations utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des conversations',
      error: error.message
    });
  }
};

/**
 * Terminer une conversation
 * POST /api/conversations/:conversationId/complete
 */
const completeConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { satisfaction, feedback } = req.body;

    const userFeedback = {
      satisfaction: satisfaction ? parseInt(satisfaction) : null,
      feedback: feedback || null
    };

    const completedConversation = await conversationService.completeConversation(
      conversationId,
      userFeedback
    );

    res.set('Content-Type', 'application/json; charset=utf-8');
    res.json({
      success: true,
      message: 'Conversation terminée avec succès',
      conversation: {
        id: completedConversation._id,
        sessionId: completedConversation.sessionId,
        currentPhase: completedConversation.currentPhase,
        jobRecommendations: completedConversation.jobRecommendations,
        quality: completedConversation.quality,
        status: completedConversation.status,
        completedAt: completedConversation.completedAt,
        metadata: completedConversation.metadata
      }
    });

  } catch (error) {
    console.error('Erreur finalisation conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la finalisation de la conversation',
      error: error.message
    });
  }
};

/**
 * Mettre en pause une conversation
 * POST /api/conversations/:conversationId/pause
 */
const pauseConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await conversationService.pauseConversation(conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation non trouvée'
      });
    }

    res.json({
      success: true,
      message: 'Conversation mise en pause',
      conversation: {
        id: conversation._id,
        status: conversation.status
      }
    });

  } catch (error) {
    console.error('Erreur pause conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise en pause',
      error: error.message
    });
  }
};

/**
 * Reprendre une conversation
 * POST /api/conversations/:conversationId/resume
 */
const resumeConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await conversationService.resumeConversation(conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation non trouvée'
      });
    }

    res.json({
      success: true,
      message: 'Conversation reprise',
      conversation: {
        id: conversation._id,
        status: conversation.status,
        lastActiveAt: conversation.lastActiveAt
      }
    });

  } catch (error) {
    console.error('Erreur reprise conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la reprise',
      error: error.message
    });
  }
};

/**
 * Obtenir les statistiques des conversations
 * GET /api/conversations/stats
 */
const getConversationStats = async (req, res) => {
  try {
    const stats = await conversationService.getConversationStats();

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Erreur stats conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: error.message
    });
  }
};

/**
 * Obtenir le profil en construction d'une conversation
 * GET /api/conversations/:conversationId/profile
 */
const getConversationProfile = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await conversationService.getConversation(conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation non trouvée'
      });
    }

    // Calculer les statistiques du profil
    const profile = conversation.buildingProfile;
    const topTraits = conversation.getTopTraits(10);

    const profileSummary = {
      traits: topTraits,
      interests: profile.interests,
      values: profile.values,
      constraints: profile.constraints,
      experience: profile.experience,
      workEnvironment: profile.workEnvironment,
      completeness: conversation.calculateCompleteness(),
      quality: conversation.quality
    };

    res.set('Content-Type', 'application/json; charset=utf-8');
    res.json({
      success: true,
      profile: profileSummary
    });

  } catch (error) {
    console.error('Erreur récupération profil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du profil',
      error: error.message
    });
  }
};

/**
 * Obtenir les recommandations d'une conversation
 * GET /api/conversations/:conversationId/recommendations
 */
const getConversationRecommendations = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await conversationService.getConversation(conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation non trouvée'
      });
    }

    // Populer les détails des métiers recommandés
    await conversation.populate('jobRecommendations.jobId');

    const recommendations = conversation.jobRecommendations.map(rec => ({
      job: {
        id: rec.jobId._id,
        title: rec.jobId.title,
        description: rec.jobId.description,
        skills: rec.jobId.skills,
        education: rec.jobId.education,
        salary: rec.jobId.salary,
        work_environment: rec.jobId.work_environment,
        tags: rec.jobId.tags,
        source: rec.jobId.source
      },
      matchScore: rec.matchScore,
      reasonsFor: rec.reasonsFor,
      concerns: rec.concerns,
      confidence: rec.confidence,
      userReaction: rec.userReaction,
      presentedAt: rec.presentedAt
    }));

    res.set('Content-Type', 'application/json; charset=utf-8');
    res.json({
      success: true,
      recommendations
    });

  } catch (error) {
    console.error('Erreur récupération recommandations:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des recommandations',
      error: error.message
    });
  }
};

/**
 * Réagir à une recommandation
 * POST /api/conversations/:conversationId/recommendations/:jobId/react
 */
const reactToRecommendation = async (req, res) => {
  try {
    const { conversationId, jobId } = req.params;
    const { reaction } = req.body; // 'interested', 'neutral', 'not_interested', 'surprised', 'confused'

    const conversation = await conversationService.getConversation(conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation non trouvée'
      });
    }

    // Trouver la recommandation
    const recommendation = conversation.jobRecommendations.find(
      rec => rec.jobId.toString() === jobId
    );

    if (!recommendation) {
      return res.status(404).json({
        success: false,
        message: 'Recommandation non trouvée'
      });
    }

    // Mettre à jour la réaction
    recommendation.userReaction = reaction;
    await conversation.save();

    res.json({
      success: true,
      message: 'Réaction enregistrée',
      recommendation: {
        jobId: recommendation.jobId,
        reaction: recommendation.userReaction
      }
    });

  } catch (error) {
    console.error('Erreur réaction recommandation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'enregistrement de la réaction',
      error: error.message
    });
  }
};

module.exports = {
  startConversation,
  sendMessage,
  getConversation,
  getUserConversations,
  completeConversation,
  pauseConversation,
  resumeConversation,
  getConversationStats,
  getConversationProfile,
  getConversationRecommendations,
  reactToRecommendation
};