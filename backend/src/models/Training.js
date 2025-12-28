const mongoose = require('mongoose');

/**
 * Schema pour un mini-exercice dans une leçon
 */
const miniExerciseSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['open', 'mcq', 'practical', 'reflection'],
    default: 'open'
  },
  expectedOutcome: {
    type: String,
    default: ''
  },
  userAnswer: {
    type: String,
    default: ''
  },
  feedback: {
    type: String,
    default: ''
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date,
    default: null
  }
}, { _id: false });

/**
 * Schema pour une leçon (niveau 3)
 */
const lessonSchema = new mongoose.Schema({
  lessonNumber: {
    type: Number,
    required: true,
    min: 1
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  keyConcept: {
    type: String,
    required: true
  },
  context: {
    type: String,
    default: ''
  },
  content: {
    type: String,
    required: true
  },
  miniExercise: {
    type: miniExerciseSchema,
    default: null
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

/**
 * Schema pour un exercice d'évaluation
 */
const exerciseSchema = new mongoose.Schema({
  exerciseType: {
    type: String,
    enum: ['practice', 'evaluation'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  evaluationCriteria: [{
    criterion: String,
    weight: Number,
    description: String
  }],
  userSubmission: {
    type: String,
    default: ''
  },
  llmFeedback: {
    type: String,
    default: ''
  },
  score: {
    type: Number,
    min: 0,
    max: 100,
    default: null
  },
  detailedEvaluation: {
    strengths: [String],
    areasForImprovement: [String],
    specificSuggestions: [String],
    encouragement: String,
    criteriaEvaluation: [{
      criterion: String,
      met: Boolean,
      comment: String
    }],
    nextSteps: String
  },
  submitted: {
    type: Boolean,
    default: false
  },
  submittedAt: {
    type: Date,
    default: null
  },
  feedbackAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

/**
 * Schema pour un module (niveau 2)
 */
const moduleSchema = new mongoose.Schema({
  moduleNumber: {
    type: Number,
    required: true,
    min: 1
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  objective: {
    type: String,
    required: true
  },
  skillsTargeted: [{
    type: String,
    trim: true
  }],
  keyConcepts: [{
    type: String,
    trim: true
  }],
  bestPractices: [{
    type: String,
    trim: true
  }],
  commonMistakes: [{
    type: String,
    trim: true
  }],
  lessons: [lessonSchema],
  moduleExercise: {
    type: exerciseSchema,
    default: null
  },
  resources: [{
    title: String,
    type: {
      type: String,
      enum: ['article', 'video', 'book', 'tool', 'documentation', 'other']
    },
    url: String,
    description: String
  }],
  status: {
    type: String,
    enum: ['locked', 'available', 'in_progress', 'completed'],
    default: 'locked'
  },
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

/**
 * Schema pour le projet fil rouge
 */
const finalProjectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  brief: {
    type: String,
    required: true
  },
  context: {
    type: String,
    default: ''
  },
  deliverables: [{
    name: String,
    description: String,
    format: String,
    completed: {
      type: Boolean,
      default: false
    }
  }],
  evaluationGrid: [{
    criterion: String,
    weight: Number,
    indicators: [String],
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: null
    }
  }],
  userWork: {
    type: String,
    default: ''
  },
  feedbackIterations: [{
    iteration: Number,
    submittedAt: Date,
    submission: String,
    feedback: String,
    score: Number,
    suggestions: [String]
  }],
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'submitted', 'completed'],
    default: 'not_started'
  },
  estimatedTime: {
    type: String,
    default: ''
  },
  tips: [String]
}, {
  timestamps: true
});

/**
 * Schema principal pour la formation personnalisée (niveau 1)
 */
const trainingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  careerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Career',
    required: false
  },
  skillsAssessmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SkillsAssessment',
    required: false
  },

  // Vue d'ensemble (Niveau 1)
  targetJob: {
    type: String,
    required: true,
    trim: true
  },
  trainingObjective: {
    type: String,
    required: true
  },
  estimatedDuration: {
    type: String,
    default: ''
  },
  entryLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    required: true
  },
  targetLevel: {
    type: String,
    default: ''
  },
  finalSkills: [{
    type: String,
    trim: true
  }],
  phases: {
    foundations: String,
    guidedPractice: String,
    autonomy: String
  },
  userConstraints: {
    timeAvailability: String,
    budget: String,
    location: String,
    other: String
  },

  // Modules de formation (3 initiaux, extension possible)
  modules: [moduleSchema],

  // Projet fil rouge
  finalProject: {
    type: finalProjectSchema,
    default: null
  },

  // État de la formation
  status: {
    type: String,
    enum: ['generating', 'active', 'completed', 'abandoned', 'generation_failed'],
    default: 'generating'
  },

  // Progression globale
  progress: {
    currentModule: {
      type: Number,
      default: 1
    },
    totalModulesCompleted: {
      type: Number,
      default: 0
    },
    totalLessonsCompleted: {
      type: Number,
      default: 0
    },
    totalExercisesCompleted: {
      type: Number,
      default: 0
    },
    overallCompletionPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    }
  },

  // Métriques de qualité
  quality: {
    averageExerciseScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null
    },
    timeSpentTotal: {
      type: Number, // en minutes
      default: 0
    },
    engagementScore: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    },
    userSatisfaction: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    }
  },

  // Permet de savoir si l'utilisateur a demandé la génération de modules supplémentaires
  extendedModulesGenerated: {
    type: Boolean,
    default: false
  },

  // Métadonnées
  generatedAt: {
    type: Date,
    default: null
  },
  startedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  lastActivityAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index pour performances
trainingSchema.index({ userId: 1, status: 1 });
trainingSchema.index({ userId: 1, createdAt: -1 });
trainingSchema.index({ status: 1 });
trainingSchema.index({ lastActivityAt: -1 });

// Méthode pour débloquer le module suivant
trainingSchema.methods.unlockNextModule = function() {
  const currentModuleIndex = this.modules.findIndex(m => m.moduleNumber === this.progress.currentModule);

  if (currentModuleIndex !== -1 && this.modules[currentModuleIndex].status === 'completed') {
    const nextModule = this.modules[currentModuleIndex + 1];

    if (nextModule) {
      nextModule.status = 'available';
      this.progress.currentModule = nextModule.moduleNumber;
      return true;
    }
  }

  return false;
};

// Méthode pour calculer la progression globale
trainingSchema.methods.calculateProgress = function() {
  let totalLessons = 0;
  let completedLessons = 0;
  let completedModules = 0;
  let totalExercises = 0;
  let completedExercises = 0;

  this.modules.forEach(module => {
    if (module.status === 'completed') {
      completedModules++;
    }

    totalLessons += module.lessons.length;
    completedLessons += module.lessons.filter(l => l.completed).length;

    if (module.moduleExercise && module.moduleExercise.submitted) {
      totalExercises++;
      if (module.moduleExercise.score !== null) {
        completedExercises++;
      }
    }
  });

  this.progress.totalModulesCompleted = completedModules;
  this.progress.totalLessonsCompleted = completedLessons;
  this.progress.totalExercisesCompleted = completedExercises;

  // Calcul du pourcentage global
  const totalItems = this.modules.length + totalLessons + totalExercises;
  const completedItems = completedModules + completedLessons + completedExercises;

  if (totalItems > 0) {
    this.progress.overallCompletionPercentage = Math.round((completedItems / totalItems) * 100);
  }

  return this.progress;
};

// Méthode pour calculer le score moyen des exercices
trainingSchema.methods.calculateAverageScore = function() {
  let totalScore = 0;
  let scoreCount = 0;

  this.modules.forEach(module => {
    if (module.moduleExercise && module.moduleExercise.score !== null) {
      totalScore += module.moduleExercise.score;
      scoreCount++;
    }
  });

  if (scoreCount > 0) {
    this.quality.averageExerciseScore = Math.round(totalScore / scoreCount);
  }

  return this.quality.averageExerciseScore;
};

// Méthode pour marquer un module comme terminé
trainingSchema.methods.completeModule = function(moduleNumber) {
  const module = this.modules.find(m => m.moduleNumber === moduleNumber);

  if (module) {
    module.status = 'completed';
    module.completedAt = new Date();
    this.unlockNextModule();
    this.calculateProgress();
    this.lastActivityAt = new Date();

    return true;
  }

  return false;
};

// Méthode statique pour récupérer la formation active d'un utilisateur
trainingSchema.statics.findActiveTraining = function(userId) {
  return this.findOne({
    userId,
    status: { $in: ['generating', 'active'] }
  }).sort({ createdAt: -1 });
};

// Méthode pour formater la formation pour l'affichage frontend
trainingSchema.methods.toClientFormat = function() {
  return {
    id: this._id,
    targetJob: this.targetJob,
    trainingObjective: this.trainingObjective,
    estimatedDuration: this.estimatedDuration,
    entryLevel: this.entryLevel,
    targetLevel: this.targetLevel,
    finalSkills: this.finalSkills,
    phases: this.phases,
    status: this.status,
    progress: this.progress,
    quality: this.quality,
    modules: this.modules.map(module => ({
      id: module._id,
      moduleNumber: module.moduleNumber,
      title: module.title,
      objective: module.objective,
      status: module.status,
      lessonsCount: module.lessons.length,
      lessonsCompleted: module.lessons.filter(l => l.completed).length,
      hasExercise: !!module.moduleExercise,
      exerciseCompleted: module.moduleExercise?.submitted || false
    })),
    finalProject: this.finalProject ? {
      title: this.finalProject.title,
      status: this.finalProject.status,
      deliverablesCount: this.finalProject.deliverables.length,
      deliverablesCompleted: this.finalProject.deliverables.filter(d => d.completed).length
    } : null,
    generatedAt: this.generatedAt,
    startedAt: this.startedAt,
    lastActivityAt: this.lastActivityAt
  };
};

module.exports = mongoose.model('Training', trainingSchema);
