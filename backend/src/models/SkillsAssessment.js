const mongoose = require('mongoose');

/**
 * Modèle pour l'évaluation des compétences actuelles de l'utilisateur
 * Utilisé pour adapter le contenu de la formation personnalisée
 */
const skillsAssessmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  careerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Career',
    required: false // Peut être null si pas encore de carrière identifiée
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: false
  },

  // Métier cible pour cette évaluation
  targetJob: {
    type: String,
    required: true,
    trim: true
  },

  // Compétences évaluées avec leur niveau (1-5)
  // Format: { "JavaScript": 4, "Communication": 3, "Gestion de projet": 2 }
  assessedSkills: {
    type: Map,
    of: {
      level: {
        type: Number,
        min: 1,
        max: 5,
        required: true
      },
      // Source de l'évaluation (auto-évaluation, test, conversation, etc.)
      source: {
        type: String,
        enum: ['self_assessment', 'conversation_analysis', 'test', 'manual'],
        default: 'self_assessment'
      },
      // Confiance dans cette évaluation (0-1)
      confidence: {
        type: Number,
        min: 0,
        max: 1,
        default: 0.7
      },
      // Contexte ou preuve de cette compétence
      evidence: {
        type: String,
        default: ''
      }
    },
    default: () => new Map()
  },

  // Expérience transférable décrite par l'utilisateur
  transferableExperience: {
    type: String,
    default: ''
  },

  // Niveau d'entrée global déterminé
  entryLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    required: true,
    default: 'beginner'
  },

  // Lacunes principales identifiées (compétences manquantes ou faibles)
  skillGaps: [{
    skillName: {
      type: String,
      required: true
    },
    importance: {
      type: String,
      enum: ['critical', 'important', 'nice_to_have'],
      default: 'important'
    },
    priority: {
      type: Number,
      min: 1,
      max: 10,
      default: 5
    }
  }],

  // Points forts identifiés
  strengths: [{
    skillName: {
      type: String,
      required: true
    },
    level: {
      type: Number,
      min: 1,
      max: 5
    },
    relevanceToJob: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium'
    }
  }],

  // Recommandations pour la formation
  recommendations: {
    suggestedStartingModule: {
      type: Number,
      min: 1,
      max: 10,
      default: 1
    },
    skipBasics: {
      type: Boolean,
      default: false
    },
    focusAreas: [String],
    estimatedTimeToCompetency: {
      type: String, // ex: "3-6 mois", "6-12 mois"
      default: ''
    }
  },

  // Métadonnées
  assessmentMethod: {
    type: String,
    enum: ['questionnaire', 'conversation', 'hybrid', 'manual'],
    default: 'conversation'
  },

  completedAt: {
    type: Date,
    default: Date.now
  },

  // Permet de savoir si cette évaluation a été utilisée pour générer une formation
  usedForTraining: {
    type: Boolean,
    default: false
  },

  // Référence à la formation générée à partir de cette évaluation
  trainingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Training',
    default: null
  }
}, {
  timestamps: true
});

// Index pour performances
skillsAssessmentSchema.index({ userId: 1, createdAt: -1 });
skillsAssessmentSchema.index({ userId: 1, targetJob: 1 });
skillsAssessmentSchema.index({ usedForTraining: 1 });

// Méthode pour calculer le niveau d'entrée global basé sur les compétences
skillsAssessmentSchema.methods.calculateEntryLevel = function() {
  if (this.assessedSkills.size === 0) {
    this.entryLevel = 'beginner';
    return this.entryLevel;
  }

  // Moyenne pondérée des niveaux de compétences
  let totalScore = 0;
  let totalWeight = 0;

  this.assessedSkills.forEach((skillData, skillName) => {
    const weight = skillData.confidence || 0.7;
    totalScore += skillData.level * weight;
    totalWeight += weight;
  });

  const avgLevel = totalScore / totalWeight;

  // Détermination du niveau
  if (avgLevel < 2.5) {
    this.entryLevel = 'beginner';
  } else if (avgLevel < 4) {
    this.entryLevel = 'intermediate';
  } else {
    this.entryLevel = 'advanced';
  }

  return this.entryLevel;
};

// Méthode pour identifier les lacunes
skillsAssessmentSchema.methods.identifySkillGaps = function(requiredSkills = []) {
  const gaps = [];

  requiredSkills.forEach(skill => {
    const userSkill = this.assessedSkills.get(skill.name);

    if (!userSkill || userSkill.level < skill.minimumLevel) {
      gaps.push({
        skillName: skill.name,
        importance: skill.importance || 'important',
        priority: skill.priority || 5
      });
    }
  });

  this.skillGaps = gaps;
  return gaps;
};

// Méthode statique pour récupérer la dernière évaluation d'un utilisateur
skillsAssessmentSchema.statics.getLatestAssessment = function(userId, targetJob = null) {
  const query = { userId };
  if (targetJob) {
    query.targetJob = targetJob;
  }

  return this.findOne(query).sort({ createdAt: -1 });
};

// Méthode pour formater l'évaluation pour l'envoi à n8n/Claude
skillsAssessmentSchema.methods.toTrainingInput = function() {
  return {
    userId: this.userId,
    targetJob: this.targetJob,
    entryLevel: this.entryLevel,
    currentSkills: Array.from(this.assessedSkills.entries()).map(([name, data]) => ({
      name,
      level: data.level,
      confidence: data.confidence
    })),
    skillGaps: this.skillGaps.map(gap => gap.skillName),
    strengths: this.strengths.map(s => s.skillName),
    transferableExperience: this.transferableExperience,
    recommendations: this.recommendations
  };
};

module.exports = mongoose.model('SkillsAssessment', skillsAssessmentSchema);
