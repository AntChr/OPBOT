/**
 * Service pour construire et mettre à jour le profil utilisateur
 * Extrait de ConversationService pour meilleure modularité
 */

const { TRAIT_DIMENSIONS } = require('../models/Job');

class ProfileBuilder {
  constructor() {
    // Mapping intérêts → traits
    this.interestToTraitMap = {
      'horticulture': ['creativity', 'design', 'independent', 'detail-oriented', 'service'],
      'technology': ['analytical', 'problem-solving', 'innovation', 'technical'],
      'arts': ['creativity', 'innovation', 'design'],
      'science': ['analytical', 'problem-solving', 'detail-oriented'],
      'helping': ['empathy', 'service', 'communication', 'teamwork'],
      'business': ['leadership', 'organizational', 'communication'],
      'teaching': ['teaching', 'communication', 'empathy', 'organizational'],
      'health': ['empathy', 'service', 'detail-oriented', 'collaborative']
    };
  }

  /**
   * Met à jour le profil utilisateur avec une analyse NLP
   */
  updateProfile(profile, nlpAnalysis) {
    if (!profile) {
      profile = this.createEmptyProfile();
    }

    // Initialiser detectedTraits si nécessaire
    if (!profile.detectedTraits) {
      profile.detectedTraits = {};
    }

    // 1. Mettre à jour les intérêts
    this.updateInterests(profile, nlpAnalysis.detectedInterests);

    // 2. Mettre à jour les valeurs
    this.updateValues(profile, nlpAnalysis.detectedValues);

    // 3. Mettre à jour les contraintes
    this.updateConstraints(profile, nlpAnalysis.detectedConstraints);

    // 4. Mettre à jour les traits
    this.updateTraits(profile, nlpAnalysis.extractedTraits);

    // 5. Mapper les intérêts vers les traits
    this.mapInterestsToTraits(profile);

    return profile;
  }

  /**
   * Crée un profil vide
   */
  createEmptyProfile() {
    return {
      detectedTraits: {},
      interests: [],
      values: [],
      constraints: []
    };
  }

  /**
   * Met à jour les intérêts avec accumulation
   */
  updateInterests(profile, detectedInterests) {
    if (!Array.isArray(detectedInterests)) return;

    detectedInterests.forEach(interest => {
      const existingInterest = profile.interests.find(i => i.domain === interest.domain);

      if (existingInterest) {
        // Augmenter progressivement le niveau à chaque mention
        const increment = interest.confidence > 0.5 ? 1 : 0.5;
        existingInterest.level = Math.min(5, existingInterest.level + increment);
        existingInterest.lastMentioned = new Date();
      } else {
        // Ajouter nouvel intérêt
        const initialLevel = Math.max(2, Math.round(interest.confidence * 5));
        profile.interests.push({
          domain: interest.domain,
          level: initialLevel,
          context: interest.evidence ? interest.evidence.join(', ') : '',
          discoveredAt: new Date(),
          lastMentioned: new Date()
        });
      }
    });
  }

  /**
   * Met à jour les valeurs
   */
  updateValues(profile, detectedValues) {
    if (!Array.isArray(detectedValues)) return;

    detectedValues.forEach(value => {
      const existingValue = profile.values.find(v => v.name === value.name);

      if (!existingValue) {
        profile.values.push({
          name: value.name,
          importance: value.importance || 'medium',
          context: value.context || '',
          discoveredAt: new Date()
        });
      }
    });
  }

  /**
   * Met à jour les contraintes
   */
  updateConstraints(profile, detectedConstraints) {
    if (!Array.isArray(detectedConstraints)) return;

    detectedConstraints.forEach(constraint => {
      const existingConstraint = profile.constraints.find(
        c => c.type === constraint.type
      );

      if (!existingConstraint) {
        profile.constraints.push({
          type: constraint.type,
          value: constraint.value,
          flexibility: constraint.flexibility || 'medium',
          discoveredAt: new Date()
        });
      }
    });
  }

  /**
   * Met à jour les traits de personnalité
   */
  updateTraits(profile, extractedTraits) {
    if (!Array.isArray(extractedTraits)) return;

    extractedTraits.forEach(trait => {
      if (TRAIT_DIMENSIONS.includes(trait.trait)) {
        const currentValue = profile.detectedTraits[trait.trait] || 0;
        profile.detectedTraits[trait.trait] = Math.min(1, currentValue + (trait.strength * 0.2));
      }
    });
  }

  /**
   * Mappe les intérêts vers les traits de personnalité
   */
  mapInterestsToTraits(profile) {
    profile.interests.forEach(interest => {
      const traits = this.interestToTraitMap[interest.domain];

      if (traits && interest.level >= 3) {
        const strength = interest.level / 5;

        traits.forEach(trait => {
          if (TRAIT_DIMENSIONS.includes(trait)) {
            const currentValue = profile.detectedTraits[trait] || 0;
            const newValue = Math.max(currentValue, strength * 0.6);
            profile.detectedTraits[trait] = Math.min(1, newValue);
          }
        });
      }
    });
  }

  /**
   * Génère un vecteur de traits à partir du profil
   */
  generateTraitVector(profile) {
    const vector = new Map();

    TRAIT_DIMENSIONS.forEach(trait => {
      vector.set(trait, profile.detectedTraits[trait] || 0);
    });

    return vector;
  }

  /**
   * Récupère le résumé du profil
   */
  getProfileSummary(profile) {
    return {
      topInterests: profile.interests
        .sort((a, b) => b.level - a.level)
        .slice(0, 3)
        .map(i => ({ domain: i.domain, level: i.level })),

      topTraits: Object.entries(profile.detectedTraits)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([trait, value]) => ({ trait, value })),

      constraintsCount: profile.constraints.length,
      valuesCount: profile.values.length
    };
  }
}

module.exports = ProfileBuilder;
