const compromise = require('compromise');
const natural = require('natural');

class NLPService {
  constructor() {
    this.compromise = compromise;
    this.stemmer = natural.PorterStemmerFr || natural.PorterStemmer;

    // Charger les dictionnaires de mots-clés
    this.traitKeywords = this.loadTraitKeywords();
    this.interestDomains = this.loadInterestDomains();
    this.valueKeywords = this.loadValueKeywords();
    this.constraintIndicators = this.loadConstraintIndicators();

    // Mots d'intensité pour la pondération
    this.intensityWords = {
      high: ['absolument', 'vraiment', 'totalement', 'énormément', 'passionnément', 'adore'],
      medium: ['beaucoup', 'assez', 'plutôt', 'bien', 'aime'],
      low: ['un peu', 'parfois', 'peut-être', 'légèrement'],
      negative: ['pas', 'jamais', 'déteste', 'horrible', 'difficile', 'ennuyeux']
    };

    // Mots d'émotion pour analyser le ton
    this.emotionWords = {
      positive: ['heureux', 'content', 'passionné', 'motivé', 'excité', 'enthousiaste', 'ravi'],
      negative: ['triste', 'ennuyé', 'frustré', 'déçu', 'anxieux', 'stressé'],
      uncertain: ['peut-être', 'pas sûr', 'hésitant', 'confus', 'indécis']
    };
  }

  /**
   * Analyse complète d'un message utilisateur
   */
  async analyzeUserMessage(message, conversationContext = {}) {
    const text = message.toLowerCase().trim();

    if (!text) {
      return this.getEmptyAnalysis();
    }

    try {
      const analysis = {
        extractedTraits: await this.extractTraits(text),
        detectedInterests: await this.extractInterests(text),
        detectedValues: await this.extractValues(text),
        detectedConstraints: await this.extractConstraints(text),
        emotionalTone: await this.analyzeTone(text),
        keyTopics: await this.extractTopics(text),
        engagementLevel: await this.calculateEngagementLevel(text),
        responseLength: text.length,
        wordCount: text.split(/\s+/).length
      };

      // Ajuster l'analyse selon le contexte de la conversation
      this.adjustAnalysisWithContext(analysis, conversationContext);

      return analysis;

    } catch (error) {
      console.error('Erreur dans l\'analyse NLP:', error);
      return this.getEmptyAnalysis();
    }
  }

  /**
   * Extraction des traits de personnalité basée sur les mots-clés
   */
  async extractTraits(text) {
    const traits = [];

    for (const [trait, keywords] of Object.entries(this.traitKeywords)) {
      const matches = this.findKeywordMatches(text, keywords);

      if (matches.length > 0) {
        // Calculer la confiance basée sur le nombre et la qualité des matches
        const confidence = this.calculateTraitConfidence(matches, text, trait);

        if (confidence > 0.1) { // Seuil minimum
          traits.push({
            trait,
            confidence: Math.min(confidence, 1.0),
            evidence: matches.slice(0, 3), // Limiter les preuves
            intensity: this.calculateIntensity(text, matches)
          });
        }
      }
    }

    // Trier par confiance décroissante
    return traits.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Extraction des domaines d'intérêt
   */
  async extractInterests(text) {
    const interests = [];

    for (const [domain, indicators] of Object.entries(this.interestDomains)) {
      const matches = this.findKeywordMatches(text, indicators);

      if (matches.length > 0) {
        const intensity = this.calculateIntensity(text, matches);

        interests.push({
          domain,
          confidence: Math.min(matches.length * 0.3 * intensity, 1.0),
          evidence: matches.slice(0, 2),
          intensity
        });
      }
    }

    return interests.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Extraction des valeurs importantes
   */
  async extractValues(text) {
    const values = [];

    for (const [value, indicators] of Object.entries(this.valueKeywords)) {
      const matches = this.findKeywordMatches(text, indicators);

      if (matches.length > 0) {
        values.push({
          value,
          confidence: Math.min(matches.length * 0.4, 1.0),
          evidence: matches[0],
          context: this.extractContext(text, matches[0])
        });
      }
    }

    return values;
  }

  /**
   * Extraction des contraintes mentionnées
   */
  async extractConstraints(text) {
    const constraints = [];

    for (const [type, indicators] of Object.entries(this.constraintIndicators)) {
      const matches = this.findKeywordMatches(text, indicators);

      if (matches.length > 0) {
        constraints.push({
          type,
          confidence: Math.min(matches.length * 0.5, 1.0),
          evidence: matches[0],
          impact: this.determineConstraintImpact(text, matches[0])
        });
      }
    }

    return constraints;
  }

  /**
   * Analyse du ton émotionnel
   */
  async analyzeTone(text) {
    let positiveScore = 0;
    let negativeScore = 0;
    let uncertainScore = 0;

    // Compter les mots d'émotion
    for (const word of this.emotionWords.positive) {
      if (text.includes(word)) positiveScore += 1;
    }

    for (const word of this.emotionWords.negative) {
      if (text.includes(word)) negativeScore += 1;
    }

    for (const word of this.emotionWords.uncertain) {
      if (text.includes(word)) uncertainScore += 1;
    }

    // Analyser les points d'exclamation et d'interrogation
    const exclamations = (text.match(/!/g) || []).length;
    const questions = (text.match(/\?/g) || []).length;

    positiveScore += exclamations * 0.5;
    uncertainScore += questions * 0.3;

    // Déterminer le ton dominant
    if (positiveScore > negativeScore && positiveScore > uncertainScore) {
      return exclamations > 1 ? 'enthusiastic' : 'positive';
    } else if (negativeScore > positiveScore) {
      return 'concerned';
    } else if (uncertainScore > 0.5) {
      return 'confused';
    } else {
      return 'neutral';
    }
  }

  /**
   * Extraction des sujets clés mentionnés
   */
  async extractTopics(text) {
    const doc = this.compromise(text);

    // Extraire les noms propres et concepts importants
    const people = doc.people().out('array');
    const places = doc.places().out('array');
    const organizations = doc.organizations().out('array');
    const nouns = doc.nouns().out('array');

    // Filtrer et nettoyer les topics
    const topics = [...people, ...places, ...organizations, ...nouns]
      .filter(topic => topic.length > 2) // Mots de plus de 2 caractères
      .filter(topic => !this.isCommonWord(topic))
      .slice(0, 5); // Limiter à 5 topics

    return [...new Set(topics)]; // Supprimer les doublons
  }

  /**
   * Calcul du niveau d'engagement dans la réponse
   */
  async calculateEngagementLevel(text) {
    let score = 3; // Score de base (neutre)

    // Longueur de la réponse
    const wordCount = text.split(/\s+/).length;
    if (wordCount > 50) score += 1;
    if (wordCount > 100) score += 0.5;
    if (wordCount < 5) score -= 2;

    // Ponctuation expressive
    const exclamations = (text.match(/!/g) || []).length;
    const questions = (text.match(/\?/g) || []).length;

    score += exclamations * 0.3;
    score += questions * 0.2;

    // Mots d'intensité positive
    for (const word of this.intensityWords.high) {
      if (text.includes(word)) score += 0.5;
    }

    // Détails et exemples
    if (text.includes('par exemple') || text.includes('comme') || text.includes('notamment')) {
      score += 0.5;
    }

    return Math.max(1, Math.min(5, score));
  }

  /**
   * Utilitaires privés
   */

  findKeywordMatches(text, keywords) {
    const matches = [];

    for (const keyword of keywords) {
      // Recherche exacte et variations
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const found = text.match(regex);

      if (found) {
        matches.push(...found.map(match => match.toLowerCase()));
      }

      // Recherche avec stemming pour les variations
      const stemmed = this.stemmer.stem(keyword);
      const stemRegex = new RegExp(`\\b${stemmed}`, 'gi');
      const stemFound = text.match(stemRegex);

      if (stemFound) {
        matches.push(...stemFound.map(match => match.toLowerCase()));
      }
    }

    return [...new Set(matches)]; // Supprimer les doublons
  }

  calculateTraitConfidence(matches, text, trait) {
    let confidence = matches.length * 0.2; // Base : 0.2 par match

    // Bonus pour les mots d'intensité
    const intensity = this.calculateIntensity(text, matches);
    confidence *= intensity;

    // Bonus pour la longueur du texte (plus c'est long, plus c'est fiable)
    const lengthBonus = Math.min(text.length / 100, 1.5);
    confidence *= lengthBonus;

    // Malus si trop de négations
    const negations = (text.match(/\b(pas|non|jamais|aucun)\b/gi) || []).length;
    if (negations > 0) {
      confidence *= Math.max(0.3, 1 - (negations * 0.3));
    }

    return Math.min(confidence, 1.0);
  }

  calculateIntensity(text, matches) {
    let intensity = 1.0;

    // Chercher des mots d'intensité près des matches
    for (const match of matches) {
      const matchIndex = text.indexOf(match);
      const context = text.substring(
        Math.max(0, matchIndex - 20),
        Math.min(text.length, matchIndex + match.length + 20)
      );

      // Vérifier la présence de mots d'intensité
      for (const word of this.intensityWords.high) {
        if (context.includes(word)) intensity += 0.3;
      }

      for (const word of this.intensityWords.medium) {
        if (context.includes(word)) intensity += 0.1;
      }

      for (const word of this.intensityWords.negative) {
        if (context.includes(word)) intensity *= 0.3;
      }
    }

    return Math.max(0.1, Math.min(2.0, intensity));
  }

  extractContext(text, keyword) {
    const index = text.indexOf(keyword);
    if (index === -1) return '';

    const start = Math.max(0, index - 30);
    const end = Math.min(text.length, index + keyword.length + 30);

    return text.substring(start, end).trim();
  }

  determineConstraintImpact(text, constraint) {
    const context = this.extractContext(text, constraint);

    if (context.includes('obligé') || context.includes('impossible') || context.includes('jamais')) {
      return 'blocking';
    } else if (context.includes('difficile') || context.includes('compliqué')) {
      return 'limiting';
    } else {
      return 'preferential';
    }
  }

  isCommonWord(word) {
    const commonWords = [
      'être', 'avoir', 'faire', 'dire', 'aller', 'voir', 'savoir', 'prendre',
      'venir', 'vouloir', 'pouvoir', 'falloir', 'devoir', 'autre', 'grand',
      'nouveau', 'premier', 'dernier', 'bon', 'français', 'long', 'petit'
    ];

    return commonWords.includes(word.toLowerCase());
  }

  adjustAnalysisWithContext(analysis, context) {
    // Ajuster l'analyse selon le contexte de la conversation
    if (context.phase === 'intro') {
      // En phase d'intro, être moins strict sur les seuils
      analysis.extractedTraits = analysis.extractedTraits.filter(trait => trait.confidence > 0.05);
    } else if (context.phase === 'refinement') {
      // En phase de raffinement, être plus exigeant
      analysis.extractedTraits = analysis.extractedTraits.filter(trait => trait.confidence > 0.3);
    }

    // Pondérer selon l'historique
    if (context.detectedTraits) {
      for (const trait of analysis.extractedTraits) {
        if (context.detectedTraits.has(trait.trait)) {
          // Bonus si le trait a déjà été détecté
          trait.confidence *= 1.2;
        }
      }
    }
  }

  getEmptyAnalysis() {
    return {
      extractedTraits: [],
      detectedInterests: [],
      detectedValues: [],
      detectedConstraints: [],
      emotionalTone: 'neutral',
      keyTopics: [],
      engagementLevel: 3,
      responseLength: 0,
      wordCount: 0
    };
  }

  /**
   * Configuration des mots-clés par trait
   */
  loadTraitKeywords() {
    return {
      analytical: [
        'analyser', 'analyse', 'logique', 'rationnel', 'données', 'recherche',
        'comprendre', 'étudier', 'investiguer', 'examiner', 'évaluer', 'systématique',
        'méthodique', 'réfléchir', 'problème', 'solution', 'raisonnement'
      ],
      creativity: [
        'créatif', 'créer', 'imagination', 'innovant', 'artistique', 'design',
        'original', 'inventer', 'composer', 'concevoir', 'inspiration', 'unique',
        'nouveau', 'expérimenter', 'libre', 'expression', 'art'
      ],
      leadership: [
        'diriger', 'manager', 'équipe', 'responsabilité', 'décision', 'leader',
        'organiser', 'coordonner', 'superviser', 'motiver', 'guider', 'influencer',
        'déléguer', 'stratégie', 'vision', 'objectifs'
      ],
      communication: [
        'parler', 'expliquer', 'présenter', 'convaincre', 'écouter', 'dialogue',
        'négocier', 'rédiger', 'enseigner', 'partager', 'transmettre', 'clarifier',
        'discussion', 'contact', 'relation', 'social'
      ],
      empathy: [
        'aider', 'comprendre', 'soutenir', 'écouter', 'bienveillant', 'humain',
        'sensible', 'social', 'accompagner', 'compassion', 'altruiste',
        'service', 'entraide', 'solidaire', 'attentionnée'
      ],
      'problem-solving': [
        'résoudre', 'solution', 'problème', 'défi', 'surmonter', 'trouver',
        'réparer', 'corriger', 'améliorer', 'optimiser', 'diagnostic',
        'dépannage', 'troubleshooting', 'innovation'
      ],
      'detail-oriented': [
        'précis', 'détail', 'minutieux', 'rigoureux', 'méticuleux', 'exact',
        'attention', 'soin', 'qualité', 'perfection', 'vérification',
        'contrôle', 'organisation', 'planification'
      ],
      independent: [
        'autonome', 'indépendant', 'seul', 'liberté', 'initiative', 'auto',
        'propre rythme', 'sans supervision', 'responsable', 'autodidacte',
        'personnel', 'individuel'
      ],
      teamwork: [
        'équipe', 'groupe', 'ensemble', 'collaboration', 'coopération',
        'partager', 'collectif', 'solidaire', 'entraide', 'synergie',
        'partenariat', 'communauté'
      ],
      organizational: [
        'organiser', 'planifier', 'structurer', 'ordonner', 'classer',
        'gérer', 'administrer', 'coordination', 'méthode', 'système',
        'programme', 'calendrier', 'process'
      ],
      innovation: [
        'innover', 'nouveau', 'révolutionnaire', 'avant-garde', 'pionnier',
        'disruptif', 'moderne', 'futur', 'évolution', 'changement',
        'transformation', 'amélioration'
      ],
      design: [
        'design', 'esthétique', 'beauté', 'forme', 'style', 'visuel',
        'graphique', 'interface', 'apparence', 'harmonieux', 'élégant',
        'composition', 'couleur', 'typographie'
      ],
      service: [
        'service', 'client', 'satisfaction', 'besoin', 'demande', 'accueil',
        'assistance', 'conseil', 'support', 'aide', 'réponse', 'utilité'
      ],
      teaching: [
        'enseigner', 'former', 'éduquer', 'transmettre', 'expliquer',
        'apprendre', 'pédagogie', 'formation', 'cours', 'leçon',
        'instruction', 'guide', 'mentor'
      ],
      collaborative: [
        'collaborer', 'coopérer', 'partager', 'échanger', 'participer',
        'contribuer', 'joindre', 'unir', 'associer', 'partenaire',
        'alliance', 'réseau'
      ]
    };
  }

  loadInterestDomains() {
    return {
      technology: [
        'informatique', 'programmation', 'code', 'développement', 'tech', 'numérique',
        'intelligence artificielle', 'robot', 'application', 'logiciel', 'internet',
        'web', 'mobile', 'données', 'algorithme', 'système', 'réseau', 'ordinateur',
        'serveur', 'cloud', 'cybersécurité', 'software', 'hardware'
      ],
      health: [
        'santé', 'médecine', 'soigner', 'patient', 'bien-être', 'thérapie',
        'psychologie', 'biologie', 'pharmacie', 'hôpital', 'clinique',
        'diagnostic', 'traitement', 'prévention', 'rééducation', 'infirmier',
        'médecin', 'soin', 'urgence', 'chirurgie'
      ],
      education: [
        'éducation', 'enseigner', 'former', 'apprendre', 'école', 'université',
        'formation', 'pédagogie', 'cours', 'élève', 'étudiant', 'connaissance',
        'transmission', 'apprentissage', 'professeur', 'enseignement', 'leçon'
      ],
      business: [
        'entreprise', 'commerce', 'vente', 'marketing', 'finance', 'économie',
        'management', 'stratégie', 'business', 'marché', 'client', 'profit',
        'investissement', 'négociation', 'comptabilité', 'gestion', 'commercial'
      ],
      art: [
        'art', 'musique', 'peinture', 'design', 'créatif', 'esthétique',
        'culture', 'expression', 'artistique', 'spectacle', 'théâtre',
        'danse', 'sculpture', 'photographie', 'cinéma', 'vidéo', 'graphisme',
        'illustration', 'mode', 'stylisme'
      ],
      environment: [
        'environnement', 'nature', 'écologie', 'durable', 'vert', 'climat',
        'pollution', 'conservation', 'biodiversité', 'renewable', 'recyclage',
        'protection', 'planète', 'forêt', 'océan', 'animaux', 'faune', 'flore'
      ],
      sports: [
        'sport', 'fitness', 'entraînement', 'compétition', 'athlète',
        'performance', 'physique', 'mouvement', 'activité', 'coach',
        'préparation', 'récupération', 'musculation', 'cardio', 'yoga'
      ],
      science: [
        'science', 'recherche', 'expérience', 'laboratoire', 'découverte',
        'théorie', 'expérimentation', 'analyse', 'chimie', 'physique',
        'mathématiques', 'innovation', 'technologie', 'scientifique', 'étude'
      ],
      agriculture: [
        'agriculture', 'ferme', 'agriculteur', 'culture', 'plantation', 'récolte',
        'élevage', 'animal', 'terre', 'sol', 'semis', 'jardinage', 'potager',
        'maraîcher', 'paysan', 'rural', 'campagne', 'tracteur', 'champ'
      ],
      horticulture: [
        'fleur', 'plante', 'jardin', 'jardinage', 'botanique', 'horticulteur',
        'paysagiste', 'végétal', 'arbre', 'arbuste', 'fleuriste', 'bouquet',
        'rose', 'tulipe', 'orchidée', 'pépinière', 'serre', 'verdure', 'nature'
      ],
      construction: [
        'construction', 'bâtiment', 'maçon', 'chantier', 'architecte', 'ouvrier',
        'bricolage', 'rénovation', 'travaux', 'bois', 'béton', 'menuisier',
        'électricien', 'plombier', 'peintre', 'charpentier'
      ],
      culinary: [
        'cuisine', 'culinaire', 'chef', 'cuisiner', 'restaurant', 'gastronomie',
        'pâtisserie', 'boulangerie', 'recette', 'plat', 'aliment', 'nourriture',
        'goût', 'saveur', 'ingredient', 'menu'
      ],
      transport: [
        'transport', 'conduite', 'véhicule', 'voiture', 'camion', 'bus',
        'logistique', 'livraison', 'chauffeur', 'route', 'voyage', 'déplacement'
      ],
      social: [
        'social', 'aide', 'accompagnement', 'solidarité', 'humanitaire',
        'association', 'bénévolat', 'communauté', 'insertion', 'travailleur social'
      ],
      law: [
        'droit', 'justice', 'loi', 'juridique', 'avocat', 'juge', 'tribunal',
        'contrat', 'légal', 'réglementation', 'jurisprudence'
      ],
      communication: [
        'communication', 'média', 'journalisme', 'presse', 'radio', 'télévision',
        'rédaction', 'relations publiques', 'publicité', 'événementiel'
      ],
      mechanics: [
        'mécanique', 'moteur', 'réparation', 'maintenance', 'garage', 'automobile',
        'machine', 'outil', 'technique', 'entretien', 'dépannage'
      ],
      beauty: [
        'beauté', 'coiffure', 'esthétique', 'maquillage', 'soin', 'cosmétique',
        'spa', 'bien-être', 'manucure', 'coiffeur', 'esthéticienne'
      ],
      hospitality: [
        'hôtellerie', 'tourisme', 'accueil', 'hôtel', 'réception', 'service',
        'voyage', 'hébergement', 'restauration', 'client'
      ],
      security: [
        'sécurité', 'surveillance', 'protection', 'garde', 'agent', 'contrôle',
        'prévention', 'risque', 'pompier', 'police', 'urgence'
      ]
    };
  }

  loadValueKeywords() {
    return {
      autonomy: ['autonomie', 'liberté', 'indépendance', 'initiative', 'choix'],
      security: ['sécurité', 'stabilité', 'garanti', 'permanent', 'stable'],
      creativity: ['créativité', 'expression', 'originalité', 'innovation', 'art'],
      recognition: ['reconnaissance', 'mérite', 'appréciation', 'valorisation', 'récompense'],
      growth: ['évolution', 'progression', 'développement', 'apprentissage', 'carrière'],
      balance: ['équilibre', 'vie privée', 'famille', 'temps libre', 'conciliation'],
      impact: ['impact', 'contribution', 'utilité', 'différence', 'sens', 'mission'],
      challenge: ['défi', 'challenge', 'stimulation', 'nouveauté', 'complexité']
    };
  }

  loadConstraintIndicators() {
    return {
      geographic: ['déménager', 'voyager', 'région', 'ville', 'lieu', 'distance', 'transport'],
      schedule: ['horaires', 'temps', 'flexible', 'week-end', 'soir', 'nuit', 'disponibilité'],
      physical: ['physique', 'santé', 'mobilité', 'fatigue', 'force', 'condition'],
      financial: ['salaire', 'argent', 'revenus', 'budget', 'financier', 'rémunération'],
      family: ['famille', 'enfants', 'conjoint', 'parents', 'responsabilités familiales'],
      education: ['diplôme', 'formation', 'études', 'qualification', 'compétences', 'expérience']
    };
  }
}

module.exports = NLPService;