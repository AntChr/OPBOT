const { TRAIT_DIMENSIONS } = require('../models/Job');

class VectorMatchingService {
  static cosineSimilarity(vectorA, vectorB) {
    if (!vectorA || !vectorB) {
      throw new Error('Both vectors are required for similarity calculation');
    }

    const valuesA = TRAIT_DIMENSIONS.map(trait => vectorA.get(trait) || 0);
    const valuesB = TRAIT_DIMENSIONS.map(trait => vectorB.get(trait) || 0);

    const dotProduct = valuesA.reduce((sum, a, i) => sum + a * valuesB[i], 0);
    const magnitudeA = Math.sqrt(valuesA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(valuesB.reduce((sum, b) => sum + b * b, 0));

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  static calculateMatchPercentage(userVector, jobVector) {
    const similarity = this.cosineSimilarity(userVector, jobVector);
    return Math.round(similarity * 100);
  }

  static updateUserTraitVector(userTraitVector, traitsToAdd) {
    const updatedVector = new Map(userTraitVector);

    traitsToAdd.forEach(trait => {
      if (TRAIT_DIMENSIONS.includes(trait)) {
        // Plafonner à 1 au lieu d'accumuler
        updatedVector.set(trait, 1);
      }
    });

    return updatedVector;
  }

  static normalizeTraitVector(traitVector) {
    const normalized = new Map();
    TRAIT_DIMENSIONS.forEach(trait => {
      const value = traitVector.get(trait) || 0;
      normalized.set(trait, Math.min(value, 1));
    });
    return normalized;
  }

  static getTraitVectorAsArray(traitVector) {
    return TRAIT_DIMENSIONS.map(trait => traitVector.get(trait) || 0);
  }

  static createTraitVectorFromArray(array) {
    const vector = new Map();
    TRAIT_DIMENSIONS.forEach((trait, index) => {
      vector.set(trait, array[index] || 0);
    });
    return vector;
  }

  static async findBestMatches(userTraitVector, jobs, limit = 10) {
    const matches = jobs.map(job => ({
      job,
      matchPercentage: this.calculateMatchPercentage(userTraitVector, job.traitVector)
    }));

    return matches
      .sort((a, b) => b.matchPercentage - a.matchPercentage)
      .slice(0, limit);
  }
}

module.exports = VectorMatchingService;