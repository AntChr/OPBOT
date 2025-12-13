const mongoose = require('mongoose');

const questionnaireSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation'
  },
  jobTitle: {
    type: String,
    required: true
  },
  // Questions sur l'expérience utilisateur
  ratings: {
    // Clarté du résultat (1-5)
    resultClarity: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    // Pertinence du métier proposé (1-5)
    jobRelevance: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    // Qualité de la conversation (1-5)
    conversationQuality: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    // Utilité globale (1-5)
    overallUsefulness: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    }
  },
  // Commentaires ouverts
  comments: {
    // Ce qui a plu
    positives: {
      type: String,
      default: ''
    },
    // Points d'amélioration
    improvements: {
      type: String,
      default: ''
    },
    // Commentaire général
    general: {
      type: String,
      default: ''
    }
  },
  // Intention de suivre les recommandations
  willFollow: {
    type: Boolean,
    default: null
  }
}, {
  timestamps: true
});

// Index pour récupérer facilement les questionnaires d'un utilisateur
questionnaireSchema.index({ userId: 1, createdAt: -1 });

// Méthode pour calculer la moyenne des ratings
questionnaireSchema.methods.getAverageRating = function() {
  const { resultClarity, jobRelevance, conversationQuality, overallUsefulness } = this.ratings;
  return (resultClarity + jobRelevance + conversationQuality + overallUsefulness) / 4;
};

module.exports = mongoose.model('Questionnaire', questionnaireSchema);
