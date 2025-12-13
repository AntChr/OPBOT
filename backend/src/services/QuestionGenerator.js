const { v4: uuidv4 } = require('uuid');

class QuestionGenerator {
  constructor() {
    // Stratégies de questions par phase
    this.questionStrategies = {
      intro: new IntroQuestions(),
      discovery: new DiscoveryQuestions(),
      exploration: new ExplorationQuestions(),
      refinement: new RefinementQuestions(),
      conclusion: new ConclusionQuestions()
    };

    // Types de questions disponibles
    this.questionTypes = {
      open_ended: 'Question ouverte pour explorer',
      specific: 'Question spécifique pour cibler',
      hypothetical: 'Question hypothétique pour projeter',
      follow_up: 'Question de suivi pour approfondir',
      choice: 'Question à choix pour orienter',
      validation: 'Question de validation pour confirmer',
      clarification: 'Question de clarification pour préciser'
    };
  }

  /**
   * Génère la prochaine question selon le contexte de la conversation
   */
  async generateNext(context) {
    try {
      const { phase, profile, history, lastUserMessage } = context;

      // Obtenir la stratégie appropriée pour la phase actuelle
      const strategy = this.questionStrategies[phase.name];

      if (!strategy) {
        throw new Error(`Stratégie non trouvée pour la phase: ${phase.name}`);
      }

      // Sélectionner la prochaine question
      const questionData = await strategy.selectNext({
        profile,
        history,
        lastUserMessage,
        progress: phase.progress,
        questionsAsked: phase.questionsAsked
      });

      return {
        id: uuidv4(),
        role: 'assistant',
        content: questionData.text,
        timestamp: new Date(),
        metadata: {
          questionType: questionData.type,
          strategy: questionData.strategy,
          followUpPlan: questionData.followUp,
          expectedResponseType: questionData.expectedResponse,
          priority: questionData.priority || 'medium'
        }
      };

    } catch (error) {
      console.error('Erreur lors de la génération de question:', error);

      // Question de fallback en cas d'erreur
      return {
        id: uuidv4(),
        role: 'assistant',
        content: "Pouvez-vous me parler de ce qui vous intéresse vraiment dans la vie ?",
        timestamp: new Date(),
        metadata: {
          questionType: 'open_ended',
          strategy: 'fallback',
          followUpPlan: 'discovery',
          expectedResponseType: 'interests'
        }
      };
    }
  }

  /**
   * Génère une question de suivi basée sur la dernière réponse
   */
  async generateFollowUp(lastMessage, analysis, profile) {
    const followUpGenerator = new FollowUpGenerator();
    return await followUpGenerator.generate(lastMessage, analysis, profile);
  }

  /**
   * Valide qu'une question n'a pas déjà été posée récemment
   */
  hasQuestionBeenAsked(questionText, history, threshold = 10) {
    const recentQuestions = history
      .filter(msg => msg.role === 'assistant')
      .slice(-threshold)
      .map(msg => msg.content.toLowerCase());

    // Vérifier si la question exacte a été posée
    if (recentQuestions.includes(questionText.toLowerCase())) {
      return true;
    }

    // Vérifier la similarité pour détecter les variantes
    return recentQuestions.some(q =>
      this.calculateSimilarity(q, questionText.toLowerCase()) > 0.85
    );
  }

  /**
   * Calcule la similarité entre deux questions (simple)
   */
  calculateSimilarity(text1, text2) {
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }
}

/**
 * Stratégie pour la phase d'introduction
 */
class IntroQuestions {
  constructor() {
    this.welcomeQuestions = [
      {
        text: "Salut ! 👋 Je suis ici pour vous aider à explorer les métiers qui pourraient vraiment vous convenir. Pour bien commencer, une question simple : dans vos loisirs ou ce que vous aimez faire, qu'est-ce que vous avez en commun ? Par exemple : travailler avec les gens, les animaux, vos mains, créer, résoudre des problèmes... Qu'en est-il pour vous ?",
        type: 'discovery',
        strategy: 'specific',
        followUp: 'explore_passion',
        expectedResponse: 'general_interests'
      },
      {
        text: "Salut ! 👋 Bienvenue ! Je sais que trouver le bon métier peut être difficile. Commençons par ce que vous savez déjà : y a-t-il un domaine ou un type d'environnement qui vous attire ? Par exemple : la nature, les animaux, l'informatique, les gens, créer des choses, résoudre des problèmes, ou même quelque chose que vous faites déjà et qui vous plaît ?",
        type: 'discovery',
        strategy: 'specific',
        followUp: 'explore_domains',
        expectedResponse: 'domain_interests'
      },
      {
        text: "Salut ! 👋 Pas facile de savoir ce qu'on veut faire, je comprends ! Allons à l'inverse : y a-t-il un type de travail que vous seriez sûr de ne PAS vouloir ? Par exemple : rester assis toute la journée, travailler seul, avoir trop de responsabilités, horaires très fixes... Qu'est-ce que vous aimeriez vraiment éviter dans un futur métier ?",
        type: 'discovery',
        strategy: 'specific',
        followUp: 'explore_constraints',
        expectedResponse: 'constraints_dislikes'
      }
    ];

    this.iceBreakers = [
      {
        text: "Si vous pouviez passer une journée dans n'importe quel métier, lequel choisiriez-vous et pourquoi ?",
        type: 'discovery',
        strategy: 'hypothetical',
        followUp: 'analyze_choice',
        expectedResponse: 'job_fantasy'
      },
      {
        text: "Quand vous étiez enfant, que vouliez-vous faire comme métier ? Et qu'est-ce qui a changé depuis ?",
        type: 'discovery',
        strategy: 'specific',
        followUp: 'evolution_analysis',
        expectedResponse: 'career_evolution'
      }
    ];
  }

  /**
   * Retourne les messages de bienvenue (pour être utilisés par ConversationService)
   */
  getWelcomeQuestions() {
    return this.welcomeQuestions;
  }

  async selectNext(context) {
    const { questionsAsked, history } = context;

    if (questionsAsked === 0) {
      // Première question : toujours un welcome
      return this.welcomeQuestions[Math.floor(Math.random() * this.welcomeQuestions.length)];
    } else {
      // Questions suivantes : ice breakers
      // Essayer de trouver une question qui n'a pas été posée récemment
      const questionGenerator = new QuestionGenerator();

      for (let attempt = 0; attempt < 5; attempt++) {
        const candidate = this.iceBreakers[Math.floor(Math.random() * this.iceBreakers.length)];

        if (!questionGenerator.hasQuestionBeenAsked(candidate.text, history, 3)) {
          return candidate;
        }
      }

      // Si toutes les questions ont été posées, retourner une au hasard
      return this.iceBreakers[Math.floor(Math.random() * this.iceBreakers.length)];
    }
  }
}

/**
 * Stratégie pour la phase de découverte
 */
class DiscoveryQuestions {
  constructor() {
    this.interestQuestions = [
      {
        text: "Qu'est-ce qui capture vraiment votre attention ? Parlez-moi de vos centres d'intérêt, même ceux qui semblent éloignés du travail.",
        type: 'discovery',
        strategy: 'open_ended',
        category: 'interests'
      },
      {
        text: "Dans vos moments libres, qu'aimez-vous faire ? Qu'est-ce qui vous passionne au point d'y passer des heures sans voir le temps passer ?",
        type: 'discovery',
        strategy: 'open_ended',
        category: 'interests'
      }
    ];

    this.skillQuestions = [
      {
        text: "Pour quoi vos amis ou votre famille viennent-ils vous demander de l'aide ? Dans quoi excellez-vous naturellement ?",
        type: 'exploration',
        strategy: 'specific',
        category: 'skills'
      },
      {
        text: "Racontez-moi une situation où vous étiez vraiment fier(e) de ce que vous avez accompli. Qu'est-ce qui rendait cette réussite spéciale ?",
        type: 'exploration',
        strategy: 'specific',
        category: 'achievements'
      }
    ];

    this.valueQuestions = [
      {
        text: "Qu'est-ce qui est vraiment important pour vous dans la vie ? Quelles sont vos valeurs profondes ?",
        type: 'discovery',
        strategy: 'open_ended',
        category: 'values'
      },
      {
        text: "Si vous pouviez changer une chose dans le monde, que changeriez-vous ? Qu'est-ce qui vous révolte ou vous motive à agir ?",
        type: 'exploration',
        strategy: 'hypothetical',
        category: 'values'
      }
    ];

    this.workStyleQuestions = [
      {
        text: "Préférez-vous travailler seul(e) ou en équipe ? Dans quel environnement donnez-vous le meilleur de vous-même ?",
        type: 'validation',
        strategy: 'choice',
        category: 'work_style'
      },
      {
        text: "Décrivez-moi votre journée de travail idéale. À quoi ressemblerait-elle du matin au soir ?",
        type: 'exploration',
        strategy: 'hypothetical',
        category: 'work_style'
      }
    ];
  }

  async selectNext(context) {
    const { profile, history } = context;

    // Analyser ce qui a déjà été exploré
    const exploredCategories = this.getExploredCategories(profile);
    const unexploredCategories = this.getUnexploredCategories(exploredCategories);

    // Créer un instance pour vérifier les questions
    const questionGenerator = new QuestionGenerator();

    // Priorité aux catégories non explorées
    if (unexploredCategories.length > 0) {
      const category = unexploredCategories[0];
      return this.selectQuestionByCategory(category, false, history, questionGenerator);
    }

    // Approfondir les catégories déjà explorées
    const categoryToDeepen = this.selectCategoryToDeepen(exploredCategories, profile);
    return this.selectQuestionByCategory(categoryToDeepen, true, history, questionGenerator); // Mode approfondissement
  }

  getExploredCategories(profile) {
    const explored = new Set();

    if (profile.interests && profile.interests.length > 0) explored.add('interests');
    if (profile.values && profile.values.length > 0) explored.add('values');
    if (profile.experience && profile.experience.level) explored.add('skills');
    if (profile.workEnvironment && Object.keys(profile.workEnvironment).length > 0) explored.add('work_style');

    return Array.from(explored);
  }

  getUnexploredCategories(explored) {
    const allCategories = ['interests', 'values', 'skills', 'work_style'];
    return allCategories.filter(cat => !explored.includes(cat));
  }

  selectCategoryToDeepen(explored, profile) {
    // Prioriser la catégorie avec le moins d'informations
    const categoryScores = explored.map(cat => ({
      category: cat,
      score: this.getCategoryCompleteness(cat, profile)
    }));

    categoryScores.sort((a, b) => a.score - b.score);
    return categoryScores[0].category;
  }

  getCategoryCompleteness(category, profile) {
    switch (category) {
      case 'interests':
        return profile.interests ? profile.interests.length : 0;
      case 'values':
        return profile.values ? profile.values.length : 0;
      case 'skills':
        return profile.experience && profile.experience.domains ? profile.experience.domains.length : 0;
      case 'work_style':
        return Object.keys(profile.workEnvironment || {}).length;
      default:
        return 0;
    }
  }

  selectQuestionByCategory(category, deepMode = false, history = [], questionGenerator = null) {
    let questions;

    switch (category) {
      case 'interests':
        questions = this.interestQuestions;
        break;
      case 'values':
        questions = this.valueQuestions;
        break;
      case 'skills':
        questions = this.skillQuestions;
        break;
      case 'work_style':
        questions = this.workStyleQuestions;
        break;
      default:
        questions = this.interestQuestions;
    }

    // Essayer de trouver une question non posée récemment
    let selectedQuestion = null;

    if (questionGenerator && history.length > 0) {
      for (let attempt = 0; attempt < 10; attempt++) {
        const candidate = questions[Math.floor(Math.random() * questions.length)];

        if (!questionGenerator.hasQuestionBeenAsked(candidate.text, history, 3)) {
          selectedQuestion = candidate;
          break;
        }
      }
    }

    // Si aucune trouvée ou pas d'historique, prendre au hasard
    if (!selectedQuestion) {
      selectedQuestion = questions[Math.floor(Math.random() * questions.length)];
    }

    return {
      ...selectedQuestion,
      followUp: deepMode ? 'deepen_' + category : 'explore_' + category,
      expectedResponse: category,
      priority: deepMode ? 'high' : 'medium'
    };
  }
}

/**
 * Stratégie pour la phase d'exploration
 */
class ExplorationQuestions {
  constructor() {
    this.explorationQuestions = [
      {
        text: "Vous avez mentionné [INTEREST]. Qu'est-ce qui vous attire précisément dans ce domaine ? Qu'est-ce qui vous fait vibrer ?",
        type: 'clarification',
        strategy: 'follow_up',
        template: true
      },
      {
        text: "Si l'argent n'était pas un problème, quel type d'activité feriez-vous de vos journées ? Qu'est-ce qui donnerait du sens à votre vie ?",
        type: 'exploration',
        strategy: 'hypothetical'
      },
      {
        text: "Parlez-moi d'une période de votre vie où vous étiez particulièrement épanoui(e). Qu'est-ce qui rendait cette période spéciale ?",
        type: 'exploration',
        strategy: 'specific'
      },
      {
        text: "Qu'est-ce qui vous frustre le plus dans ce que vous faites actuellement ? Qu'aimeriez-vous changer ?",
        type: 'exploration',
        strategy: 'specific'
      }
    ];

    this.constraintQuestions = [
      {
        text: "Y a-t-il des contraintes importantes dans votre vie dont je devrais tenir compte ? (géographiques, familiales, financières...)",
        type: 'exploration',
        strategy: 'specific'
      },
      {
        text: "Qu'est-ce qui serait un non négociable pour vous dans un futur métier ?",
        type: 'exploration',
        strategy: 'specific'
      }
    ];
  }

  async selectNext(context) {
    const { profile, history, lastUserMessage } = context;

    // Vérifier s'il y a des éléments intéressants dans la dernière réponse à approfondir
    const followUpOpportunity = this.identifyFollowUpOpportunity(lastUserMessage, profile);

    if (followUpOpportunity) {
      return this.generatePersonalizedFollowUp(followUpOpportunity);
    }

    // Sinon, choisir une question d'exploration générale
    const hasConstraints = profile.constraints && profile.constraints.length > 0;

    if (!hasConstraints && Math.random() > 0.7) {
      // 30% de chance de poser une question sur les contraintes si pas encore abordé
      return this.constraintQuestions[Math.floor(Math.random() * this.constraintQuestions.length)];
    }

    return this.explorationQuestions[Math.floor(Math.random() * this.explorationQuestions.length)];
  }

  identifyFollowUpOpportunity(lastMessage, profile) {
    if (!lastMessage || !lastMessage.analysis) return null;

    // Chercher des intérêts ou des traits mentionnés récemment
    const recentInterests = lastMessage.analysis.detectedInterests || [];
    const recentTraits = lastMessage.analysis.extractedTraits || [];

    if (recentInterests.length > 0) {
      return {
        type: 'interest',
        value: recentInterests[0].domain,
        confidence: recentInterests[0].confidence
      };
    }

    if (recentTraits.length > 0) {
      return {
        type: 'trait',
        value: recentTraits[0].trait,
        confidence: recentTraits[0].confidence
      };
    }

    return null;
  }

  generatePersonalizedFollowUp(opportunity) {
    let questionText;

    switch (opportunity.type) {
      case 'interest':
        questionText = `Vous mentionnez ${opportunity.value}, c'est intéressant ! Qu'est-ce qui vous passionne le plus dans ce domaine ? Avez-vous déjà eu l'occasion de vous y investir ?`;
        break;
      case 'trait':
        questionText = `Je sens que vous avez un côté ${opportunity.value}. Pouvez-vous me donner un exemple concret où cette qualité vous a été utile ?`;
        break;
      default:
        questionText = "Pouvez-vous m'en dire plus sur ce que vous venez de mentionner ?";
    }

    return {
      text: questionText,
      type: 'clarification',
      strategy: 'follow_up',
      followUp: 'analyze_deeper',
      expectedResponse: opportunity.type,
      priority: 'high'
    };
  }
}

/**
 * Stratégie pour la phase de raffinement
 */
class RefinementQuestions {
  constructor() {
    this.validationQuestions = [
      {
        text: "Basé sur notre conversation, je pense que vous pourriez être intéressé(e) par [JOB_SUGGESTIONS]. Qu'en pensez-vous ? Est-ce que cela résonne avec vous ?",
        type: 'validation',
        strategy: 'choice',
        template: true
      },
      {
        text: "Qu'est-ce qui vous inquiète le plus quand vous pensez à votre avenir professionnel ?",
        type: 'exploration',
        strategy: 'specific'
      },
      {
        text: "Si vous deviez choisir entre un métier créatif mais moins stable et un métier stable mais moins créatif, que choisiriez-vous ?",
        type: 'validation',
        strategy: 'choice'
      }
    ];

    this.clarificationQuestions = [
      {
        text: "J'ai l'impression que [TRAIT] est important pour vous. Est-ce que je me trompe ? Comment cela se manifeste-t-il dans votre vie ?",
        type: 'clarification',
        strategy: 'follow_up',
        template: true
      }
    ];
  }

  async selectNext(context) {
    const { profile, jobRecommendations } = context;

    // Si on a des recommandations, les valider
    if (jobRecommendations && jobRecommendations.length > 0) {
      return this.generateJobValidationQuestion(jobRecommendations);
    }

    // Sinon, clarifier les traits les plus forts
    const strongTraits = this.getStrongTraits(profile);
    if (strongTraits.length > 0) {
      return this.generateTraitClarificationQuestion(strongTraits[0]);
    }

    // Question générale de raffinement
    return this.validationQuestions[Math.floor(Math.random() * this.validationQuestions.length)];
  }

  generateJobValidationQuestion(recommendations) {
    const topJobs = recommendations.slice(0, 3).map(rec => rec.job?.title || 'Métier inconnu');

    return {
      text: `Basé sur notre conversation, je pense que vous pourriez être intéressé(e) par des métiers comme ${topJobs.join(', ')}. Qu'en pensez-vous ? Est-ce que cela correspond à ce que vous imaginez ?`,
      type: 'validation',
      strategy: 'choice',
      followUp: 'refine_recommendations',
      expectedResponse: 'job_reaction',
      priority: 'high'
    };
  }

  generateTraitClarificationQuestion(trait) {
    return {
      text: `J'ai l'impression que l'aspect "${trait}" est important pour vous. Est-ce que je me trompe ? Comment cela se manifeste-t-il dans votre quotidien ?`,
      type: 'clarification',
      strategy: 'follow_up',
      followUp: 'trait_validation',
      expectedResponse: 'trait_confirmation',
      priority: 'medium'
    };
  }

  getStrongTraits(profile) {
    if (!profile.detectedTraits) return [];

    return Array.from(profile.detectedTraits.entries())
      .filter(([trait, data]) => data.score > 0.6)
      .sort((a, b) => b[1].score - a[1].score)
      .map(([trait, data]) => trait);
  }
}

/**
 * Stratégie pour la phase de conclusion
 */
class ConclusionQuestions {
  constructor() {
    this.conclusionQuestions = [
      {
        text: "Nous arrivons au bout de notre exploration ! Y a-t-il quelque chose d'important que vous aimeriez ajouter ou préciser ?",
        type: 'discovery',
        strategy: 'open_ended'
      },
      {
        text: "Comment vous sentez-vous par rapport aux pistes que nous avons explorées ensemble ?",
        type: 'validation',
        strategy: 'choice'
      },
      {
        text: "Quelle serait votre prochaine étape idéale pour avancer dans votre réflexion professionnelle ?",
        type: 'exploration',
        strategy: 'specific'
      }
    ];
  }

  async selectNext(context) {
    return this.conclusionQuestions[Math.floor(Math.random() * this.conclusionQuestions.length)];
  }
}

/**
 * Générateur de questions de suivi dynamiques
 */
class FollowUpGenerator {
  async generate(lastMessage, analysis, profile) {
    // Templates de questions de suivi
    const templates = [
      "C'est fascinant ! Pouvez-vous me donner un exemple concret ?",
      "Qu'est-ce qui vous attire le plus dans ce que vous venez de mentionner ?",
      "Comment avez-vous découvert cette passion ?",
      "Depuis quand cela vous intéresse-t-il ?",
      "Qu'est-ce qui rendrait cela encore plus parfait pour vous ?"
    ];

    // Sélection intelligente basée sur l'analyse
    if (analysis.emotionalTone === 'enthusiastic') {
      return {
        text: "Je sens beaucoup d'enthousiasme dans votre réponse ! Qu'est-ce qui vous rend si passionné(e) par cela ?",
        type: 'clarification',
        strategy: 'follow_up'
      };
    }

    if (analysis.extractedTraits && analysis.extractedTraits.length > 0) {
      const trait = analysis.extractedTraits[0].trait;
      return {
        text: `Vous semblez avoir un côté ${trait}. Pouvez-vous me raconter une situation où cela vous a vraiment aidé ?`,
        type: 'clarification',
        strategy: 'follow_up'
      };
    }

    // Template générique
    return {
      text: templates[Math.floor(Math.random() * templates.length)],
      type: 'clarification',
      strategy: 'follow_up'
    };
  }
}

module.exports = QuestionGenerator;