const mongoose = require('mongoose');

/**
 * Plan d'Action Personnalisé
 * Généré après identification du métier idéal
 * Expire après 7 jours (données marché évoluent)
 */
const actionPlanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  jobTitle: {
    type: String,
    required: true,
    index: true
  },

  // Analyse du marché de l'emploi
  marketAnalysis: {
    recruiting: {
      type: Boolean,
      default: false
    },
    jobCount: {
      type: Number,
      default: 0
    },
    region: String,
    radius: {
      type: Number,
      default: 50 // km
    },
    avgSalary: String, // "35-45K€"
    trend: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium'
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },

  // Chemin de formation recommandé (MVP: 1 seul)
  // Phase 2: sera un array de 3 chemins
  trainingPath: {
    name: String,
    provider: String,
    duration: String, // "6 mois", "1 an"
    cost: Number,
    cpfEligible: {
      type: Boolean,
      default: false
    },
    format: {
      type: String,
      enum: ['online', 'onsite', 'hybrid'],
      default: 'online'
    },
    url: String,
    rating: {
      type: Number,
      min: 0,
      max: 10
    }, // Score coût/qualité (0-10)
    source: String // "france_competences", "scraping", "linkup"
  },

  // Offres d'emploi (max 10 pour MVP)
  jobOffers: [{
    title: String,
    company: String,
    location: String,
    distance: Number, // km depuis user location
    contract: {
      type: String,
      enum: ['CDI', 'CDD', 'Stage', 'Alternance', 'Freelance']
    },
    salary: String,
    url: String,
    postedDate: Date,
    source: String // "pole_emploi", "indeed", "linkup"
  }],

  // Métiers alternatifs (si recruiting: false)
  // Phase 3: sera rempli automatiquement
  alternatives: [{
    jobTitle: String,
    reason: String, // Pourquoi cette alternative
    recruiting: Boolean
  }],

  // Score de fiabilité des données (0-100)
  reliabilityScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 70
  },

  // Métadonnées
  status: {
    type: String,
    enum: ['active', 'expired', 'replaced'],
    default: 'active',
    index: true
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
    index: true
  }
}, {
  timestamps: true
});

// Index composé pour requêtes fréquentes
actionPlanSchema.index({ userId: 1, status: 1 });
actionPlanSchema.index({ jobTitle: 1, status: 1 });

// Méthodes d'instance
actionPlanSchema.methods.isExpired = function() {
  return this.expiresAt < new Date();
};

actionPlanSchema.methods.getDaysOld = function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
};

actionPlanSchema.methods.getDaysUntilExpiry = function() {
  return Math.floor((this.expiresAt - Date.now()) / (1000 * 60 * 60 * 24));
};

// Méthodes statiques
actionPlanSchema.statics.findActiveForUser = function(userId) {
  return this.findOne({
    userId,
    status: 'active',
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });
};

actionPlanSchema.statics.expireOldPlans = async function() {
  const result = await this.updateMany(
    {
      status: 'active',
      expiresAt: { $lte: new Date() }
    },
    {
      $set: { status: 'expired' }
    }
  );
  return result.modifiedCount;
};

// Hook pre-save : marquer comme expired si date dépassée
actionPlanSchema.pre('save', function(next) {
  if (this.isExpired() && this.status === 'active') {
    this.status = 'expired';
  }
  next();
});

module.exports = mongoose.model('ActionPlan', actionPlanSchema);
