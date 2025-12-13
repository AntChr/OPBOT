const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Schéma pour un message individuel dans la conversation
const messageSchema = new mongoose.Schema({
  id: {
    type: String,
    default: uuidv4,
    unique: true
  },
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },

  // Analyse du message utilisateur
  analysis: {
    extractedTraits: [{
      trait: String,
      confidence: {
        type: Number,
        min: 0,
        max: 1
      },
      evidence: [String],
      intensity: Number
    }],
    detectedInterests: [{
      domain: String,
      confidence: {
        type: Number,
        min: 0,
        max: 1
      },
      evidence: [String],
      intensity: Number
    }],
    detectedValues: [{
      value: String,
      confidence: {
        type: Number,
        min: 0,
        max: 1
      },
      evidence: String,
      context: String
    }],
    detectedConstraints: [{
      type: { type: String }, // Champ "type" de type String
      confidence: {
        type: Number,
        min: 0,
        max: 1
      },
      evidence: String,
      impact: String
    }],
    emotionalTone: {
      type: String,
      enum: ['positive', 'neutral', 'concerned', 'confused', 'enthusiastic']
    },
    keyTopics: [String],
    engagementLevel: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    responseLength: Number,
    wordCount: Number
  },

  // Métadonnées pour les messages de l'assistant
  metadata: {
    questionType: {
      type: String,
      enum: ['discovery', 'clarification', 'validation', 'exploration', 'presentation', 'claude_generated', 'follow_up', 'fallback']
    },
    strategy: {
      type: String,
      enum: ['open_ended', 'specific', 'hypothetical', 'follow_up', 'choice', 'ai_conversational', 'fallback']
    },
    followUpPlan: String,
    expectedResponseType: String,
    model: String, // Nom du modèle AI utilisé
    tokensUsed: mongoose.Schema.Types.Mixed, // Statistiques de tokens
    confidence: Number // Score de confiance (0-1)
  }
});

// Schéma principal de la conversation
const conversationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sessionId: {
    type: String,
    default: uuidv4,
    unique: true
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  },

  // Messages de la conversation
  messages: [messageSchema],

  // État actuel de la conversation
  currentPhase: {
    name: {
      type: String,
      enum: ['intro', 'discovery', 'exploration', 'refinement', 'conclusion'],
      default: 'intro'
    },
    progress: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    },
    nextObjective: String,
    questionsAsked: {
      type: Number,
      default: 0
    },
    targetQuestions: {
      type: Number,
      default: 9999 // Pas de limite - continue jusqu'à match ≥ 90%
    }
  },

  // Profil utilisateur construit progressivement
  buildingProfile: {
    // Traits détectés avec scores cumulés
    detectedTraits: {
      type: Map,
      of: {
        score: {
          type: Number,
          default: 0
        },
        confidence: {
          type: Number,
          default: 0
        },
        sources: [String], // IDs des messages sources
        lastUpdated: {
          type: Date,
          default: Date.now
        }
      },
      default: function() {
        const { TRAIT_DIMENSIONS } = require('./Job');
        const traits = new Map();
        TRAIT_DIMENSIONS.forEach(trait => {
          traits.set(trait, {
            score: 0,
            confidence: 0,
            sources: [],
            lastUpdated: new Date()
          });
        });
        return traits;
      }
    },

    // Informations collectées
    interests: [{
      domain: String,
      level: {
        type: Number,
        min: 1,
        max: 5
      },
      context: String,
      discoveredAt: {
        type: Date,
        default: Date.now
      }
    }],

    values: [{
      value: String,
      importance: {
        type: Number,
        min: 1,
        max: 5
      },
      context: String
    }],

    constraints: [{
      type: { type: String }, // Champ "type" de type String (pas le type Mongoose!)
      description: String,
      flexibility: {
        type: Number,
        min: 1,
        max: 5
      },
      impact: {
        type: String,
        enum: ['blocking', 'limiting', 'preferential']
      }
    }],

    experience: {
      level: {
        type: String,
        enum: ['student', 'beginner', 'intermediate', 'experienced', 'expert']
      },
      domains: [String],
      preferredLearning: {
        type: String,
        enum: ['hands_on', 'theoretical', 'mentoring', 'self_directed']
      },
      previousJobs: [String]
    },

    workEnvironment: {
      teamSize: {
        type: String,
        enum: ['solo', 'small_team', 'large_team', 'variable']
      },
      location: {
        type: String,
        enum: ['office', 'remote', 'hybrid', 'travel', 'outdoor']
      },
      pace: {
        type: String,
        enum: ['steady', 'dynamic', 'deadline_driven', 'seasonal']
      },
      structure: {
        type: String,
        enum: ['structured', 'flexible', 'autonomous', 'guided']
      }
    },

    personalityInsights: {
      communicationStyle: String,
      motivators: [String],
      stressFactors: [String],
      idealDay: String
    }
  },

  // Recommandations générées au cours de la conversation
  jobRecommendations: [{
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    matchScore: {
      type: Number,
      min: 0,
      max: 1
    },
    reasonsFor: [String],
    concerns: [String],
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    presentedAt: {
      type: Date,
      default: Date.now
    },
    userReaction: {
      type: String,
      enum: ['interested', 'neutral', 'not_interested', 'surprised', 'confused']
    },
    followUpQuestions: [String]
  }],

  // Métriques de qualité de la conversation
  quality: {
    engagementScore: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5
    },
    completenessScore: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    },
    confidenceScore: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    },
    conversationFlow: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5
    },
    userSatisfaction: {
      type: Number,
      min: 1,
      max: 5
    }
  },

  // État de la conversation
  status: {
    type: String,
    enum: ['active', 'completed', 'abandoned', 'paused'],
    default: 'active'
  },

  // Jalons (milestones) de progression
  milestones: {
    passions_identified: {
      achieved: { type: Boolean, default: false },
      achievedAt: Date,
      confidence: { type: Number, min: 0, max: 100, default: 0 }, // Niveau de confiance 0-100%
      confirmed: { type: Boolean, default: false }, // Utilisateur a confirmé ce milestone
      needsConfirmation: { type: Boolean, default: false } // Claude attend la confirmation
    },
    role_determined: {
      achieved: { type: Boolean, default: false },
      achievedAt: Date,
      value: String, // ex: "Manager", "Créatif", "Expert"
      confidence: { type: Number, min: 0, max: 100, default: 0 },
      confirmed: { type: Boolean, default: false },
      needsConfirmation: { type: Boolean, default: false }
    },
    domain_identified: {
      achieved: { type: Boolean, default: false },
      achievedAt: Date,
      value: String, // ex: "Alimentaire", "Technologie"
      confidence: { type: Number, min: 0, max: 100, default: 0 },
      confirmed: { type: Boolean, default: false },
      needsConfirmation: { type: Boolean, default: false }
    },
    format_determined: {
      achieved: { type: Boolean, default: false },
      achievedAt: Date,
      value: String, // ex: "Petite structure", "Boutique"
      confidence: { type: Number, min: 0, max: 100, default: 0 },
      confirmed: { type: Boolean, default: false },
      needsConfirmation: { type: Boolean, default: false }
    },
    specific_job_identified: {
      achieved: { type: Boolean, default: false },
      achievedAt: Date,
      jobTitle: String, // ex: "Manager de Boulangerie"
      jobDescription: String,
      conclusionMessage: String, // Message épique personnalisé
      confidence: { type: Number, min: 0, max: 100, default: 0 },
      confirmed: { type: Boolean, default: false },
      needsConfirmation: { type: Boolean, default: false }
    }
  },

  // Métadonnées de suivi
  metadata: {
    platform: String,
    userAgent: String,
    referrer: String,
    totalDuration: Number, // en minutes
    averageResponseTime: Number, // en secondes
    dropoffPoint: String
  }
}, {
  timestamps: true
});

// Index pour la performance
conversationSchema.index({ userId: 1, status: 1 });
conversationSchema.index({ sessionId: 1 });
conversationSchema.index({ 'currentPhase.name': 1 });
conversationSchema.index({ lastActiveAt: -1 });

// Méthodes d'instance
conversationSchema.methods.addMessage = function(messageData) {
  this.messages.push(messageData);
  this.lastActiveAt = new Date();
  this.currentPhase.questionsAsked += messageData.role === 'assistant' ? 1 : 0;

  // Mettre à jour le progrès
  this.updateProgress();

  return this.save();
};

conversationSchema.methods.updateProgress = function() {
  const totalQuestions = this.currentPhase.targetQuestions;
  const askedQuestions = this.currentPhase.questionsAsked;

  this.currentPhase.progress = Math.min(askedQuestions / totalQuestions, 1);

  // Pas d'avancement automatique de phase - on continue jusqu'à avoir un match ≥ 90%
  // L'avancement de phase sera géré manuellement si nécessaire
};

conversationSchema.methods.advancePhase = function() {
  const phases = ['intro', 'discovery', 'exploration', 'refinement', 'conclusion'];
  const currentIndex = phases.indexOf(this.currentPhase.name);

  if (currentIndex < phases.length - 1) {
    this.currentPhase.name = phases[currentIndex + 1];
    this.currentPhase.progress = 0;
    this.currentPhase.questionsAsked = 0;

    // Pas de limite de questions - toutes les phases ont targetQuestions à 9999
    switch (this.currentPhase.name) {
      case 'discovery':
        this.currentPhase.targetQuestions = 9999;
        this.currentPhase.nextObjective = 'Explorer les intérêts et passions';
        break;
      case 'exploration':
        this.currentPhase.targetQuestions = 9999;
        this.currentPhase.nextObjective = 'Approfondir les motivations';
        break;
      case 'refinement':
        this.currentPhase.targetQuestions = 9999;
        this.currentPhase.nextObjective = 'Valider et affiner les recommandations';
        break;
      case 'conclusion':
        this.currentPhase.targetQuestions = 9999;
        this.currentPhase.nextObjective = 'Présenter les résultats finaux';
        break;
    }
  }
};

conversationSchema.methods.updateTraitScore = function(trait, newScore, confidence, messageId) {
  if (!this.buildingProfile.detectedTraits.has(trait)) {
    this.buildingProfile.detectedTraits.set(trait, {
      score: 0,
      confidence: 0,
      sources: [],
      lastUpdated: new Date()
    });
  }

  const current = this.buildingProfile.detectedTraits.get(trait);

  // Moyenne pondérée par la confiance
  const totalWeight = current.confidence + confidence;
  const newAvgScore = (current.score * current.confidence + newScore * confidence) / totalWeight;
  const newAvgConfidence = totalWeight / (current.sources.length + 1);

  this.buildingProfile.detectedTraits.set(trait, {
    score: newAvgScore,
    confidence: newAvgConfidence,
    sources: [...current.sources, messageId],
    lastUpdated: new Date()
  });
};

conversationSchema.methods.getTopTraits = function(limit = 5) {
  return Array.from(this.buildingProfile.detectedTraits.entries())
    .filter(([trait, data]) => data.score > 0.1) // Seuil minimum
    .sort((a, b) => (b[1].score * b[1].confidence) - (a[1].score * a[1].confidence))
    .slice(0, limit)
    .map(([trait, data]) => ({
      trait,
      score: data.score,
      confidence: data.confidence
    }));
};

conversationSchema.methods.calculateCompleteness = function() {
  let completeness = 0;
  let maxPoints = 0;

  // Points pour les traits (40% du total)
  const traitsWithData = Array.from(this.buildingProfile.detectedTraits.values())
    .filter(data => data.score > 0.1).length;
  completeness += (traitsWithData / 15) * 0.4; // 15 traits au total
  maxPoints += 0.4;

  // Points pour les intérêts (25% du total)
  completeness += Math.min(this.buildingProfile.interests.length / 3, 1) * 0.25;
  maxPoints += 0.25;

  // Points pour les valeurs (20% du total)
  completeness += Math.min(this.buildingProfile.values.length / 3, 1) * 0.2;
  maxPoints += 0.2;

  // Points pour l'expérience (15% du total)
  if (this.buildingProfile.experience.level) completeness += 0.15;
  maxPoints += 0.15;

  this.quality.completenessScore = completeness / maxPoints;
  return this.quality.completenessScore;
};

// Méthodes statiques
conversationSchema.statics.findActiveConversation = function(userId) {
  return this.findOne({
    userId,
    status: 'active'
  }).sort({ lastActiveAt: -1 });
};

conversationSchema.statics.getConversationStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgDuration: { $avg: '$metadata.totalDuration' },
        avgSatisfaction: { $avg: '$quality.userSatisfaction' }
      }
    }
  ]);
};

module.exports = mongoose.model('Conversation', conversationSchema);