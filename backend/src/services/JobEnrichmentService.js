/**
 * Service d'enrichissement intelligent de métiers
 * Utilise un LLM (Claude) pour analyser, enrichir et harmoniser les données métiers
 * depuis multiples sources web
 */

const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');

class JobEnrichmentService {
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    // Using Claude 3 Haiku (available with current API key)
    // Note: For production, consider upgrading to Sonnet/Opus for better quality
    this.model = 'claude-3-haiku-20240307';
  }

  /**
   * Analyse un métier avec Claude et extrait des informations structurées
   *
   * @param {Object} jobData - Données brutes du métier
   * @param {Array} sources - Données des différentes sources (Wikipedia, LinkedIn, etc.)
   * @returns {Object} - Données enrichies et structurées
   */
  async analyzeJobWithLLM(jobData, sources = []) {
    const prompt = this.buildAnalysisPrompt(jobData, sources);

    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 4000,
        temperature: 0.3, // Bas pour plus de cohérence
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const response = message.content[0].text;
      const enrichedData = this.parseAIResponse(response);

      // Ajouter les sources utilisées
      enrichedData.sources = sources.map(s => s.name);

      return enrichedData;
    } catch (error) {
      console.error('Erreur LLM:', error.message);
      throw error;
    }
  }

  /**
   * Construit le prompt pour l'analyse LLM
   */
  buildAnalysisPrompt(jobData, sources) {
    return `Tu es un expert en analyse de métiers et d'orientation professionnelle.
Ton rôle est d'analyser des informations sur un métier provenant de multiples sources
et de produire une fiche métier enrichie, cohérente et structurée.

# MÉTIER À ANALYSER

Code ROME: ${jobData.romeCode || 'N/A'}
Titre: ${jobData.title}
Secteur: ${jobData.sector || 'N/A'}
Description actuelle: ${jobData.description || 'Aucune'}

${jobData.skills && jobData.skills.length > 0 ? `Compétences actuelles: ${jobData.skills.join(', ')}` : ''}

# SOURCES DISPONIBLES

${sources.map((source, idx) => `
## Source ${idx + 1}: ${source.name}
${source.content}
`).join('\n')}

# TÂCHE

Analyse ces informations et produis une fiche métier enrichie au format JSON suivant :

\`\`\`json
{
  "title": "Titre officiel du métier",
  "description": "Description complète et précise (2-3 phrases)",
  "skills": ["compétence 1", "compétence 2", ...], // 8-12 compétences clés
  "education": "Niveau d'études requis",
  "salary": {
    "junior": "Fourchette junior",
    "mid": "Fourchette confirmé",
    "senior": "Fourchette senior"
  },
  "workEnvironment": "Description de l'environnement de travail",
  "careerPath": ["Évolution 1", "Évolution 2", "Évolution 3"],
  "riasec": ["R", "I", "A", "S", "E", "C"], // 1-3 codes RIASEC pertinents
  "traitVector": {
    "analytical": 0.0-1.0,
    "problem-solving": 0.0-1.0,
    "creativity": 0.0-1.0,
    "innovation": 0.0-1.0,
    "detail-oriented": 0.0-1.0,
    "independent": 0.0-1.0,
    "teamwork": 0.0-1.0,
    "leadership": 0.0-1.0,
    "communication": 0.0-1.0,
    "organizational": 0.0-1.0,
    "empathy": 0.0-1.0,
    "design": 0.0-1.0,
    "service": 0.0-1.0,
    "teaching": 0.0-1.0,
    "collaborative": 0.0-1.0
  },
  "emergingTrends": ["Tendance 1", "Tendance 2", ...], // Évolutions récentes du métier
  "relatedJobs": ["Métier similaire 1", "Métier similaire 2", ...],
  "tags": ["tag1", "tag2", ...],
  "remoteWorkCompatibility": "Full|Hybrid|OnSite",
  "growthPotential": "Excellent|Bon|Stable|Déclin",
  "dataQuality": 0.0-1.0, // Ton estimation de la qualité des données
  "sources": ["source1", "source2"] // Sources utilisées
}
\`\`\`

# RÈGLES IMPORTANTES

1. **TraitVector**: Évalue chaque trait sur une échelle de 0 à 1
   - 0.0-0.3: Peu important pour ce métier
   - 0.4-0.6: Moyennement important
   - 0.7-0.9: Très important
   - 1.0: Critique/essentiel

2. **RIASEC**: Choisis 1 à 3 codes maximum, par ordre d'importance
   - R (Realistic): Métiers manuels, techniques, concrets
   - I (Investigative): Recherche, analyse, sciences
   - A (Artistic): Créativité, expression, design
   - S (Social): Aide, enseignement, relation
   - E (Enterprising): Commerce, persuasion, management
   - C (Conventional): Organisation, précision, procédures

3. **Cohérence**: Assure la cohérence entre compétences, traits, et RIASEC

4. **Données manquantes**: Si une info n'est pas disponible, mets null

5. **Modernité**: Inclus les tendances récentes (IA, télétravail, etc.)

Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.`;
  }

  /**
   * Parse la réponse de l'IA
   */
  parseAIResponse(response) {
    try {
      // Nettoyer la réponse (enlever les ```json si présents)
      let cleaned = response.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/```\n?/g, '');
      }

      const parsed = JSON.parse(cleaned);

      // Convertir traitVector en Map
      if (parsed.traitVector && typeof parsed.traitVector === 'object') {
        const traitMap = new Map();
        Object.entries(parsed.traitVector).forEach(([key, value]) => {
          traitMap.set(key, value);
        });
        parsed.traitVector = traitMap;
      }

      return parsed;
    } catch (error) {
      console.error('Erreur parsing réponse AI:', error.message);
      console.error('Réponse:', response);
      throw new Error('Format de réponse AI invalide');
    }
  }

  /**
   * Enrichit un métier existant avec de nouvelles données
   * @param {Object} existingJob - Métier existant dans la DB
   * @param {Object} newData - Nouvelles données enrichies
   * @returns {Object} - Métier fusionné
   */
  mergeJobData(existingJob, newData) {
    return {
      ...existingJob.toObject(),

      // Garder les IDs et métadonnées
      _id: existingJob._id,
      romeCode: existingJob.romeCode,
      source: existingJob.source,

      // Mettre à jour les données
      title: newData.title || existingJob.title,
      description: newData.description || existingJob.description,

      // Fusionner les compétences (garder l'union)
      skills: this.mergeArrays(existingJob.skills, newData.skills),

      // Mettre à jour les traits si meilleure qualité
      traitVector: newData.dataQuality > 0.6 && newData.traitVector
        ? newData.traitVector
        : existingJob.traitVector,

      // Préférer les nouvelles données pour le reste
      education: newData.education || existingJob.education,
      salary: newData.salary || existingJob.salary,
      workEnvironment: newData.workEnvironment || existingJob.workEnvironment,
      careerPath: newData.careerPath || existingJob.careerPath,
      riasec: newData.riasec || existingJob.riasec,
      tags: this.mergeArrays(existingJob.tags, newData.tags),

      // Nouveaux champs
      remoteWorkCompatibility: newData.remoteWorkCompatibility || existingJob.remoteWorkCompatibility,
      growthPotential: newData.growthPotential || existingJob.growthPotential,

      // Métadonnées
      enrichedAt: new Date(),
      enrichedSources: newData.sources || [],
      dataQuality: newData.dataQuality || 0
    };
  }

  /**
   * Fusionne deux tableaux en gardant les éléments uniques
   */
  mergeArrays(arr1 = [], arr2 = []) {
    const combined = [...arr1, ...(arr2 || [])];
    return [...new Set(combined)].filter(Boolean);
  }

  /**
   * Évalue si un métier nécessite un enrichissement
   * @param {Object} job - Métier à évaluer
   * @returns {Boolean}
   */
  needsEnrichment(job) {
    // Pas d'enrichissement si fait récemment (< 30 jours)
    if (job.enrichedAt) {
      const daysSinceEnrichment = (Date.now() - job.enrichedAt) / (1000 * 60 * 60 * 24);
      if (daysSinceEnrichment < 30) return false;
    }

    // Enrichir si données manquantes ou incomplètes
    if (!job.description || job.description.length < 50) return true;
    if (!job.skills || job.skills.length < 5) return true;
    if (!job.salary || !job.salary.junior) return true;
    if (!job.traitVector) return true;

    // Enrichir si faible qualité de données
    const traitValues = job.traitVector ? Array.from(job.traitVector.values()) : [];
    const avgTrait = traitValues.reduce((a, b) => a + b, 0) / traitValues.length;
    if (avgTrait < 0.1) return true; // Vecteur presque vide

    return false;
  }

  /**
   * Calcule un score de similarité entre deux métiers
   * Utile pour détecter les doublons
   */
  calculateSimilarity(job1, job2) {
    let score = 0;
    let factors = 0;

    // Titre similaire
    if (job1.title && job2.title) {
      const title1 = job1.title.toLowerCase();
      const title2 = job2.title.toLowerCase();
      if (title1 === title2) score += 1;
      else if (title1.includes(title2) || title2.includes(title1)) score += 0.7;
      factors++;
    }

    // Secteur identique
    if (job1.sector === job2.sector) {
      score += 0.5;
    }
    factors++;

    // RIASEC similaire
    if (job1.riasec && job2.riasec) {
      const common = job1.riasec.filter(r => job2.riasec.includes(r));
      score += (common.length / Math.max(job1.riasec.length, job2.riasec.length)) * 0.5;
      factors++;
    }

    return score / factors;
  }
}

module.exports = new JobEnrichmentService();
