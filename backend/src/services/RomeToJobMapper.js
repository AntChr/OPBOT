const { TRAIT_DIMENSIONS } = require('../models/Job');

/**
 * Service de mapping des données ROME vers notre schéma Job
 * Convertit les structures de données de l'API France Travail
 * vers notre format interne avec traitVector et RIASEC
 */
class RomeToJobMapper {
  constructor() {
    // Mapping des grands domaines professionnels ROME vers RIASEC
    this.romeToRiasecMapping = {
      // Agriculture, marine, pêche
      'A': ['R'], // Realistic
      // Arts et façonnage d'ouvrages d'art
      'B': ['A', 'R'], // Artistic, Realistic
      // Banque, assurance, immobilier
      'C': ['C', 'E'], // Conventional, Enterprising
      // Commerce, vente et grande distribution
      'D': ['E', 'S'], // Enterprising, Social
      // Communication, média et multimédia
      'E': ['A', 'E'], // Artistic, Enterprising
      // Construction, bâtiment et travaux publics
      'F': ['R'], // Realistic
      // Hôtellerie-restauration, tourisme, loisirs et animation
      'G': ['S', 'E'], // Social, Enterprising
      // Industrie
      'H': ['R', 'I'], // Realistic, Investigative
      // Installation et maintenance
      'I': ['R'], // Realistic
      // Santé
      'J': ['S', 'I'], // Social, Investigative
      // Services à la personne et à la collectivité
      'K': ['S'], // Social
      // Spectacle
      'L': ['A'], // Artistic
      // Support à l'entreprise
      'M': ['C', 'I'], // Conventional, Investigative
      // Enseignement et formation
      'K': ['S', 'I'], // Social, Investigative
      // Défense publique et sécurité
      'K': ['S', 'R'], // Social, Realistic
      // Transport et logistique
      'N': ['R', 'C'] // Realistic, Conventional
    };

    // Mapping des mots-clés de compétences vers les dimensions de traits
    this.skillToTraitMapping = {
      // Analytical
      'analyse': 'analytical',
      'analyser': 'analytical',
      'diagnostic': 'analytical',
      'évaluer': 'analytical',
      'recherche': 'analytical',
      'étude': 'analytical',

      // Problem-solving
      'résoudre': 'problem-solving',
      'solution': 'problem-solving',
      'dépannage': 'problem-solving',
      'résolution': 'problem-solving',
      'traiter': 'problem-solving',

      // Creativity
      'créer': 'creativity',
      'création': 'creativity',
      'concevoir': 'creativity',
      'conception': 'creativity',
      'imaginer': 'creativity',
      'design': 'creativity',
      'innover': 'innovation',
      'innovation': 'innovation',
      'développer': 'innovation',

      // Detail-oriented
      'précision': 'detail-oriented',
      'contrôle': 'detail-oriented',
      'vérifier': 'detail-oriented',
      'minutie': 'detail-oriented',
      'qualité': 'detail-oriented',
      'norme': 'detail-oriented',

      // Independent
      'autonomie': 'independent',
      'autonome': 'independent',
      'initiative': 'independent',
      'indépendant': 'independent',

      // Teamwork
      'équipe': 'teamwork',
      'collaboration': 'teamwork',
      'collaborer': 'teamwork',
      'coopérer': 'teamwork',
      'collectif': 'teamwork',

      // Leadership
      'encadrer': 'leadership',
      'management': 'leadership',
      'diriger': 'leadership',
      'coordonner': 'leadership',
      'piloter': 'leadership',
      'manager': 'leadership',
      'superviser': 'leadership',

      // Communication
      'communiquer': 'communication',
      'communication': 'communication',
      'présenter': 'communication',
      'négocier': 'communication',
      'rédiger': 'communication',
      'échanger': 'communication',

      // Organizational
      'organiser': 'organizational',
      'organisation': 'organizational',
      'planifier': 'organizational',
      'gérer': 'organizational',
      'gestion': 'organizational',

      // Empathy
      'écoute': 'empathy',
      'écouter': 'empathy',
      'accompagner': 'empathy',
      'conseil': 'empathy',
      'relation': 'empathy',
      'accueil': 'empathy',

      // Service
      'service': 'service',
      'servir': 'service',
      'assister': 'service',
      'aider': 'service',
      'assistance': 'service',

      // Teaching
      'enseigner': 'teaching',
      'former': 'teaching',
      'formation': 'teaching',
      'transmettre': 'teaching',
      'pédagogie': 'teaching',

      // Design
      'design': 'design',
      'dessiner': 'design',
      'modéliser': 'design',
      'prototype': 'design',

      // Collaborative
      'collaboratif': 'collaborative',
      'partage': 'collaborative',
      'partager': 'collaborative'
    };
  }

  /**
   * Détermine le RIASEC basé sur le code ROME
   * @param {string} romeCode - Code ROME (ex: "M1805")
   * @returns {Array<string>} - Codes RIASEC
   */
  getRiasecFromRomeCode(romeCode) {
    const domainLetter = romeCode.charAt(0);
    return this.romeToRiasecMapping[domainLetter] || ['R']; // Par défaut Realistic
  }

  /**
   * Calcule le vecteur de traits basé sur les compétences
   * @param {Array} savoirFaire - Liste des savoir-faire
   * @param {Array} savoirs - Liste des savoirs
   * @returns {Map} - Vecteur de traits normalisé
   */
  calculateTraitVector(savoirFaire = [], savoirs = []) {
    const traitVector = new Map();
    const traitCounts = new Map();

    // Initialiser toutes les dimensions à 0
    TRAIT_DIMENSIONS.forEach(trait => {
      traitVector.set(trait, 0);
      traitCounts.set(trait, 0);
    });

    // Fonction pour analyser un texte et incrémenter les traits correspondants
    const analyzeText = (text) => {
      if (!text) return;
      const lowerText = text.toLowerCase();

      for (const [keyword, trait] of Object.entries(this.skillToTraitMapping)) {
        if (lowerText.includes(keyword)) {
          traitCounts.set(trait, traitCounts.get(trait) + 1);
        }
      }
    };

    // Analyser tous les savoir-faire
    savoirFaire.forEach(sf => {
      analyzeText(sf.libelle);
      analyzeText(sf.description);
    });

    // Analyser tous les savoirs
    savoirs.forEach(s => {
      analyzeText(s.libelle);
    });

    // Normaliser les valeurs entre 0 et 1
    const maxCount = Math.max(...Array.from(traitCounts.values()), 1);

    TRAIT_DIMENSIONS.forEach(trait => {
      const count = traitCounts.get(trait);
      traitVector.set(trait, count / maxCount);
    });

    return traitVector;
  }

  /**
   * Extrait les compétences (skills) du savoir-faire ROME
   * @param {Array} savoirFaire - Liste des savoir-faire
   * @returns {Array<string>} - Liste des compétences
   */
  extractSkills(savoirFaire = []) {
    return savoirFaire
      .map(sf => sf.libelle)
      .filter(Boolean)
      .slice(0, 20); // Limiter à 20 compétences principales
  }

  /**
   * Extrait les traits de personnalité du savoir-être ROME
   * @param {Array} savoirFaire - Savoir-faire incluant savoir-être
   * @returns {Array<string>} - Liste des traits
   */
  extractTraits(savoirFaire = []) {
    const savoirEtreKeywords = [
      'autonomie', 'rigueur', 'organisation', 'communication',
      'créativité', 'leadership', 'empathie', 'adaptabilité'
    ];

    const traits = new Set();
    savoirFaire.forEach(sf => {
      const libelle = (sf.libelle || '').toLowerCase();
      savoirEtreKeywords.forEach(keyword => {
        if (libelle.includes(keyword)) {
          traits.add(keyword.charAt(0).toUpperCase() + keyword.slice(1));
        }
      });
    });

    return Array.from(traits);
  }

  /**
   * Détermine le secteur d'activité basé sur le domaine ROME
   * @param {string} romeCode - Code ROME
   * @returns {string} - Secteur d'activité
   */
  getSectorFromRomeCode(romeCode) {
    const domainLetter = romeCode.charAt(0);
    const sectorMapping = {
      'A': 'Agriculture',
      'B': 'Arts et artisanat',
      'C': 'Banque et assurance',
      'D': 'Commerce',
      'E': 'Communication et médias',
      'F': 'Construction',
      'G': 'Hôtellerie et tourisme',
      'H': 'Industrie',
      'I': 'Installation et maintenance',
      'J': 'Santé',
      'K': 'Services',
      'L': 'Spectacle',
      'M': 'Support entreprise',
      'N': 'Transport et logistique'
    };
    return sectorMapping[domainLetter] || 'Autre';
  }

  /**
   * Détermine le domaine professionnel
   * @param {string} romeCode - Code ROME
   * @returns {string} - Domaine professionnel
   */
  getDomainFromRomeCode(romeCode) {
    const domainLetter = romeCode.charAt(0);
    const domainMapping = {
      'A': 'Agriculture',
      'B': 'Arts',
      'C': 'Finance',
      'D': 'Commerce',
      'E': 'Communication',
      'F': 'BTP',
      'G': 'Services',
      'H': 'Industrie',
      'I': 'Technique',
      'J': 'Santé',
      'K': 'Services',
      'L': 'Culture',
      'M': 'IT & Support',
      'N': 'Logistique'
    };
    return domainMapping[domainLetter] || 'Général';
  }

  /**
   * Convertit une fiche métier ROME complète vers notre schéma Job
   * @param {Object} romeData - Données brutes de l'API ROME
   * @returns {Object} - Objet formaté pour notre modèle Job
   */
  mapRomeToJob(romeData) {
    const { code, libelle, appellations, competences, contextes, definition } = romeData;
    const savoirFaire = competences?.savoirFaire || [];
    const savoirs = competences?.savoirs || [];

    return {
      title: libelle,
      description: definition || `Métier de ${libelle}`,
      skills: this.extractSkills(savoirFaire),
      traits: this.extractTraits(savoirFaire),
      education: this.inferEducationLevel(savoirFaire, savoirs),
      work_environment: this.extractWorkEnvironment(contextes),
      career_path: this.generateCareerPath(code),
      riasec: this.getRiasecFromRomeCode(code),
      tags: this.generateTags(libelle, savoirFaire),
      traitVector: this.calculateTraitVector(savoirFaire, savoirs),
      source: 'rome',
      externalId: code,
      romeCode: code,
      sector: this.getSectorFromRomeCode(code),
      domain: this.getDomainFromRomeCode(code),
      altLabels: appellations?.map(a => a.libelle) || [],
      importedAt: new Date()
    };
  }

  /**
   * Infère le niveau d'éducation requis
   */
  inferEducationLevel(savoirFaire, savoirs) {
    const allTexts = [
      ...savoirFaire.map(sf => sf.libelle),
      ...savoirs.map(s => s.libelle)
    ].join(' ').toLowerCase();

    if (allTexts.includes('doctorat') || allTexts.includes('master')) {
      return 'Bac +5 ou plus';
    } else if (allTexts.includes('licence') || allTexts.includes('bachelor')) {
      return 'Bac +3';
    } else if (allTexts.includes('bts') || allTexts.includes('dut')) {
      return 'Bac +2';
    } else if (allTexts.includes('bac')) {
      return 'Baccalauréat';
    }
    return 'Formation professionnelle';
  }

  /**
   * Extrait l'environnement de travail
   */
  extractWorkEnvironment(contextes = []) {
    if (contextes.length === 0) return 'Variable selon le poste';

    const conditions = contextes
      .filter(c => c.libelle)
      .map(c => c.libelle)
      .slice(0, 3)
      .join(', ');

    return conditions || 'Environnement professionnel standard';
  }

  /**
   * Génère un parcours de carrière type
   */
  generateCareerPath(romeCode) {
    const sector = this.getSectorFromRomeCode(romeCode);
    return [
      `Débutant en ${sector}`,
      `Professionnel confirmé`,
      `Expert / Manager`
    ];
  }

  /**
   * Génère des tags pertinents
   */
  generateTags(title, savoirFaire) {
    const tags = new Set([this.getSectorFromRomeCode(title)]);

    // Ajouter des tags basés sur les compétences clés
    const commonKeywords = ['numérique', 'gestion', 'commercial', 'technique', 'créatif'];
    savoirFaire.slice(0, 5).forEach(sf => {
      const libelle = (sf.libelle || '').toLowerCase();
      commonKeywords.forEach(keyword => {
        if (libelle.includes(keyword)) {
          tags.add(keyword);
        }
      });
    });

    return Array.from(tags);
  }
}

module.exports = new RomeToJobMapper();
