/**
 * Utilitaire pour nettoyer et valider les données de messages
 */

class MessageSanitizer {
  /**
   * Nettoie l'analyse NLP avant de l'enregistrer
   */
  static sanitizeAnalysis(rawAnalysis) {
    if (!rawAnalysis) return this.getEmptyAnalysis();

    return {
      extractedTraits: this.ensureArray(rawAnalysis.extractedTraits),
      detectedInterests: this.ensureArray(rawAnalysis.detectedInterests),
      detectedValues: this.ensureArray(rawAnalysis.detectedValues),
      detectedConstraints: this.ensureArray(rawAnalysis.detectedConstraints),
      emotionalTone: rawAnalysis.emotionalTone || 'neutral',
      keyTopics: this.ensureArray(rawAnalysis.keyTopics),
      engagementLevel: rawAnalysis.engagementLevel || 3,
      responseLength: rawAnalysis.responseLength || 0,
      wordCount: rawAnalysis.wordCount || 0
    };
  }

  /**
   * Nettoie les messages existants d'une conversation
   */
  static sanitizeConversationMessages(messages) {
    if (!Array.isArray(messages)) return [];

    messages.forEach((msg, index) => {
      if (!msg.analysis) return;

      // Nettoyer chaque champ de l'analyse
      msg.analysis.detectedConstraints = this.parseIfString(msg.analysis.detectedConstraints);
      msg.analysis.detectedInterests = this.parseIfString(msg.analysis.detectedInterests);
      msg.analysis.detectedValues = this.parseIfString(msg.analysis.detectedValues);
      msg.analysis.extractedTraits = this.parseIfString(msg.analysis.extractedTraits);
      msg.analysis.keyTopics = this.parseIfString(msg.analysis.keyTopics);

      // S'assurer que tout est en tableau
      msg.analysis.detectedConstraints = this.ensureArray(msg.analysis.detectedConstraints);
      msg.analysis.detectedInterests = this.ensureArray(msg.analysis.detectedInterests);
      msg.analysis.detectedValues = this.ensureArray(msg.analysis.detectedValues);
      msg.analysis.extractedTraits = this.ensureArray(msg.analysis.extractedTraits);
      msg.analysis.keyTopics = this.ensureArray(msg.analysis.keyTopics);
    });

    return messages;
  }

  /**
   * Parse une chaîne JSON si nécessaire, sinon retourne l'entrée
   */
  static parseIfString(value) {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (e) {
        return [];
      }
    }
    return value;
  }

  /**
   * S'assure qu'une valeur est un tableau
   */
  static ensureArray(value) {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  }

  /**
   * Retourne une structure d'analyse vide
   */
  static getEmptyAnalysis() {
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
}

module.exports = MessageSanitizer;
