const Questionnaire = require('../models/Questionnaire');
const User = require('../models/User');

/**
 * Soumettre un nouveau questionnaire
 * POST /api/questionnaire
 */
exports.submitQuestionnaire = async (req, res) => {
  try {
    const userId = req.userId; // Fourni par le middleware authenticateToken
    const { conversationId, jobTitle, ratings, comments, willFollow } = req.body;

    // Validation des ratings
    const requiredRatings = ['resultClarity', 'jobRelevance', 'conversationQuality', 'overallUsefulness'];
    for (const rating of requiredRatings) {
      if (!ratings[rating] || ratings[rating] < 1 || ratings[rating] > 5) {
        return res.status(400).json({
          error: `Le rating '${rating}' doit être entre 1 et 5`
        });
      }
    }

    // Créer le questionnaire
    const questionnaire = new Questionnaire({
      userId,
      conversationId,
      jobTitle,
      ratings,
      comments: {
        positives: comments?.positives || '',
        improvements: comments?.improvements || '',
        general: comments?.general || ''
      },
      willFollow
    });

    await questionnaire.save();

    res.status(201).json({
      message: 'Questionnaire soumis avec succès',
      questionnaire
    });
  } catch (error) {
    console.error('Error submitting questionnaire:', error);
    res.status(500).json({
      error: 'Erreur lors de la soumission du questionnaire'
    });
  }
};

/**
 * Récupérer les analytics (admin uniquement)
 * GET /api/questionnaire/analytics
 */
exports.getAnalytics = async (req, res) => {
  try {
    // Récupérer tous les questionnaires avec les informations utilisateur
    const questionnaires = await Questionnaire
      .find()
      .populate('userId', 'firstName lastName email username')
      .sort({ createdAt: -1 });

    // Calculer les statistiques globales
    const totalResponses = questionnaires.length;

    if (totalResponses === 0) {
      return res.json({
        totalResponses: 0,
        averages: {
          resultClarity: 0,
          jobRelevance: 0,
          conversationQuality: 0,
          overallUsefulness: 0,
          global: 0
        },
        questionnaires: []
      });
    }

    // Calculer les moyennes
    const sums = {
      resultClarity: 0,
      jobRelevance: 0,
      conversationQuality: 0,
      overallUsefulness: 0
    };

    questionnaires.forEach(q => {
      sums.resultClarity += q.ratings.resultClarity;
      sums.jobRelevance += q.ratings.jobRelevance;
      sums.conversationQuality += q.ratings.conversationQuality;
      sums.overallUsefulness += q.ratings.overallUsefulness;
    });

    const averages = {
      resultClarity: (sums.resultClarity / totalResponses).toFixed(2),
      jobRelevance: (sums.jobRelevance / totalResponses).toFixed(2),
      conversationQuality: (sums.conversationQuality / totalResponses).toFixed(2),
      overallUsefulness: (sums.overallUsefulness / totalResponses).toFixed(2)
    };

    averages.global = (
      (parseFloat(averages.resultClarity) +
       parseFloat(averages.jobRelevance) +
       parseFloat(averages.conversationQuality) +
       parseFloat(averages.overallUsefulness)) / 4
    ).toFixed(2);

    // Compter les intentions de suivi
    const willFollowCount = questionnaires.filter(q => q.willFollow === true).length;
    const willFollowPercentage = ((willFollowCount / totalResponses) * 100).toFixed(1);

    res.json({
      totalResponses,
      averages,
      willFollowCount,
      willFollowPercentage,
      questionnaires: questionnaires.map(q => ({
        _id: q._id,
        user: q.userId,
        jobTitle: q.jobTitle,
        ratings: q.ratings,
        averageRating: q.getAverageRating().toFixed(2),
        comments: q.comments,
        willFollow: q.willFollow,
        createdAt: q.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des analytics'
    });
  }
};

/**
 * Récupérer un questionnaire spécifique (admin uniquement)
 * GET /api/questionnaire/:id
 */
exports.getQuestionnaireById = async (req, res) => {
  try {
    const { id } = req.params;

    const questionnaire = await Questionnaire
      .findById(id)
      .populate('userId', 'firstName lastName email username');

    if (!questionnaire) {
      return res.status(404).json({
        error: 'Questionnaire non trouvé'
      });
    }

    res.json(questionnaire);
  } catch (error) {
    console.error('Error fetching questionnaire:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération du questionnaire'
    });
  }
};
