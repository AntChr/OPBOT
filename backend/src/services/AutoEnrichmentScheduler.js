/**
 * Service AutoEnrichmentScheduler - Enrichissement automatique et planifié
 *
 * Objectifs:
 * - Enrichir automatiquement les métiers qui n'ont pas été mis à jour récemment
 * - Détecter les données obsolètes (>30 jours)
 * - Mettre à jour les tendances salariales
 * - Scheduler les enrichissements par batch
 * - Gérer les limites de l'API Claude
 */

const Job = require('../models/Job');
const enrichmentService = require('./JobEnrichmentService');
const scraperService = require('./WebScraperService');
const apecService = require('./APECService');
const linkedInService = require('./LinkedInSkillsService');
const rncpService = require('./RNCPService');

class AutoEnrichmentScheduler {
  constructor() {
    this.isRunning = false;
    this.stats = {
      total: 0,
      enriched: 0,
      failed: 0,
      skipped: 0,
      startTime: null,
      endTime: null,
      estimatedCost: 0
    };

    // Configuration de la limite d'API (Claude: max 50 appels/minute pour éviter throttling)
    this.apiRateLimit = {
      maxCallsPerMinute: 30,
      callsThisMinute: 0,
      resetTime: Date.now()
    };

    // Batches
    this.batchSize = 10; // Nombre de métiers par batch
    this.batchDelay = 60000; // Délai entre batches (60s)
  }

  /**
   * Démarre l'enrichissement automatique
   * @param {Object} options - Options de configuration
   * @returns {Object} - Statistiques de la session
   */
  async start(options = {}) {
    if (this.isRunning) {
      return { error: 'Un enrichissement est déjà en cours' };
    }

    this.isRunning = true;
    this.stats = {
      total: 0,
      enriched: 0,
      failed: 0,
      skipped: 0,
      startTime: new Date(),
      endTime: null,
      estimatedCost: 0
    };

    try {
      console.log('\n' + '='.repeat(70));
      console.log('🚀 AutoEnrichmentScheduler démarré');
      console.log('='.repeat(70));

      // Récupérer les métiers à enrichir
      const jobsToEnrich = await this.getJobsNeedingEnrichment(options);
      this.stats.total = jobsToEnrich.length;

      if (jobsToEnrich.length === 0) {
        console.log('✅ Aucun métier à enrichir');
        this.isRunning = false;
        return this.stats;
      }

      console.log(`\n📊 ${jobsToEnrich.length} métier(s) à enrichir`);

      // Enrichir par batches
      await this.enrichBatches(jobsToEnrich);

      // Finaliser
      this.stats.endTime = new Date();
      const duration = (this.stats.endTime - this.stats.startTime) / 1000;

      console.log('\n' + '='.repeat(70));
      console.log('✅ Enrichissement terminé');
      console.log(`  Durée: ${Math.round(duration)}s`);
      console.log(`  Enrichis: ${this.stats.enriched}/${this.stats.total}`);
      console.log(`  Erreurs: ${this.stats.failed}`);
      console.log(`  Coût estimé: €${(this.stats.estimatedCost).toFixed(3)}`);
      console.log('='.repeat(70));

    } catch (error) {
      console.error('❌ Erreur lors de l\'enrichissement:', error.message);
      this.stats.failed++;
    } finally {
      this.isRunning = false;
    }

    return this.stats;
  }

  /**
   * Récupère les métiers ayant besoin d'enrichissement
   * @param {Object} options - Filtres optionnels
   * @returns {Array} - Métiers à enrichir
   */
  async getJobsNeedingEnrichment(options = {}) {
    try {
      const {
        sector = null,
        limit = 100,
        force = false,
        daysOld = 30
      } = options;

      const query = {};

      // Filtrer par secteur si spécifié
      if (sector) {
        query.sector = sector;
      }

      if (!force) {
        const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

        // Enrichir si:
        // 1. Jamais enrichis (enrichedAt = null/undefined)
        // 2. Enrichis il y a plus de daysOld jours
        // 3. Faible qualité (<0.6)
        // 4. Données manquantes (skills, salaire, description)
        query.$or = [
          { enrichedAt: { $exists: false } },
          { enrichedAt: null },
          { enrichedAt: { $lt: cutoffDate } },
          { dataQuality: { $lt: 0.6 } },
          { skills: { $exists: false } },
          { skills: { $size: 0 } },
          { 'salary.junior': { $exists: false } },
          { 'salary.junior': null },
          { description: { $exists: false } },
          { description: { $eq: '' } },
          { description: { $regex: '^.{0,50}$' } } // Description courte (<50 chars)
        ];
      }

      const jobs = await Job.find(query)
        .limit(limit)
        .sort({ enrichedAt: 1, dataQuality: 1 })
        .lean();

      console.log(`  📊 Métiers trouvés: ${jobs.length}`);
      if (jobs.length > 0) {
        console.log(`     Premiers: ${jobs.slice(0, 3).map(j => `${j.title} (Q: ${j.dataQuality || 0})`).join(', ')}`);
      }

      return jobs;
    } catch (error) {
      console.error('Erreur lors de la récupération des métiers:', error.message);
      return [];
    }
  }

  /**
   * Enrichit les métiers par batches
   * @param {Array} jobs - Métiers à enrichir
   */
  async enrichBatches(jobs) {
    for (let i = 0; i < jobs.length; i += this.batchSize) {
      const batch = jobs.slice(i, i + this.batchSize);
      const batchNum = Math.floor(i / this.batchSize) + 1;

      console.log(`\n📦 Batch ${batchNum}/${Math.ceil(jobs.length / this.batchSize)}`);

      // Enrichir en parallèle dans le batch (mais pas trop pour ne pas trop charger l'API)
      const enrichmentPromises = batch.map(job =>
        this.enrichJob(job)
          .catch(error => {
            this.stats.failed++;
            console.error(`  ❌ Erreur ${job.title}: ${error.message}`);
          })
      );

      await Promise.all(enrichmentPromises);

      // Délai entre batches pour respecter les limites API
      if (i + this.batchSize < jobs.length) {
        console.log(`  ⏳ Délai ${this.batchDelay / 1000}s avant le prochain batch...`);
        await this.sleep(this.batchDelay);
      }
    }
  }

  /**
   * Enrichit un métier unique
   * @param {Object} job - Métier à enrichir
   */
  async enrichJob(job) {
    try {
      // Attendre le rate limit
      await this.waitForRateLimit();

      console.log(`  📌 ${job.title} (${job.romeCode})`);

      // Collecter les sources
      const sources = await scraperService.gatherAllSources({
        title: job.title,
        romeCode: job.romeCode,
        sector: job.sector
      });

      // Ajouter sources spécialisées
      const apecData = await apecService.searchJobOffers(job.title, job.romeCode);
      if (apecData && apecData.quality > 0.3) {
        sources.push(apecData);
      }

      const linkedInData = await linkedInService.getTrendingSkillsForJob(job.title, job.sector);
      if (linkedInData && linkedInData.quality > 0.3) {
        sources.push(linkedInData);
      }

      // Analyser avec Claude
      const enrichedData = await enrichmentService.analyzeJobWithLLM(
        job,
        sources.slice(0, 5) // Limiter à top 5 sources
      );

      // Fusionner avec données existantes
      const merged = enrichmentService.mergeJobData(
        await Job.findById(job._id),
        enrichedData
      );

      // Sauvegarder
      await Job.updateOne({ _id: job._id }, merged);

      this.stats.enriched++;
      console.log(`    ✅ Qualité: ${Math.round(enrichedData.dataQuality * 100)}%`);

      // Estimer le coût (Claude Haiku: ~$0.80 pour 1M input tokens, ~$4 pour 1M output)
      const estimatedTokens = (JSON.stringify(job).length + JSON.stringify(sources).length) / 4;
      const estimatedCost = (estimatedTokens / 1000000) * 0.80;
      this.stats.estimatedCost += estimatedCost;

    } catch (error) {
      this.stats.failed++;
      throw error;
    }
  }

  /**
   * Attend le respect du rate limit API
   */
  async waitForRateLimit() {
    const now = Date.now();

    // Réinitialiser le compteur chaque minute
    if (now - this.apiRateLimit.resetTime > 60000) {
      this.apiRateLimit.callsThisMinute = 0;
      this.apiRateLimit.resetTime = now;
    }

    // Si dépassement, attendre
    if (this.apiRateLimit.callsThisMinute >= this.apiRateLimit.maxCallsPerMinute) {
      const waitTime = 60000 - (now - this.apiRateLimit.resetTime);
      console.log(`  ⏳ Rate limit atteint, attente ${Math.round(waitTime / 1000)}s...`);
      await this.sleep(waitTime);
      this.apiRateLimit.callsThisMinute = 0;
      this.apiRateLimit.resetTime = Date.now();
    }

    this.apiRateLimit.callsThisMinute++;
  }

  /**
   * Détecte les données obsolètes
   * @param {Number} daysThreshold - Seuil en jours (30 par défaut)
   * @returns {Object} - Métiers obsolètes par catégorie
   */
  async detectStaleData(daysThreshold = 30) {
    try {
      const cutoffDate = new Date(Date.now() - daysThreshold * 24 * 60 * 60 * 1000);

      const staleJobs = await Job.find({
        $or: [
          { enrichedAt: { $lt: cutoffDate } },
          { dataQuality: { $lt: 0.5 } },
          { skills: { $size: 0 } },
          { salary: { $exists: false } }
        ]
      }).select('_id title romeCode sector enrichedAt dataQuality').lean();

      return {
        totalStale: staleJobs.length,
        byCategory: this.categorizeStaleJobs(staleJobs),
        jobs: staleJobs
      };
    } catch (error) {
      console.error('Erreur détection données obsolètes:', error.message);
      return { totalStale: 0, byCategory: {} };
    }
  }

  /**
   * Catégorise les métiers obsolètes
   * @param {Array} staleJobs - Métiers obsolètes
   * @returns {Object} - Catégorisation
   */
  categorizeStaleJobs(staleJobs) {
    const categories = {
      neverEnriched: [],
      lowQuality: [],
      missingSkills: [],
      missingSalary: []
    };

    staleJobs.forEach(job => {
      if (!job.enrichedAt) categories.neverEnriched.push(job);
      if (job.dataQuality < 0.5) categories.lowQuality.push(job);
      if (!job.skills || job.skills.length === 0) categories.missingSkills.push(job);
      if (!job.salary) categories.missingSalary.push(job);
    });

    return {
      neverEnriched: categories.neverEnriched.length,
      lowQuality: categories.lowQuality.length,
      missingSkills: categories.missingSkills.length,
      missingSalary: categories.missingSalary.length
    };
  }

  /**
   * Fonction sleep utilitaire
   * @param {Number} ms - Millisecondes à attendre
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Arrête l'enrichissement en cours
   */
  stop() {
    console.log('\n⛔ Arrêt demandé...');
    this.isRunning = false;
  }

  /**
   * Récupère le statut de l'enrichissement
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      stats: this.stats,
      apiRateLimit: this.apiRateLimit
    };
  }
}

module.exports = new AutoEnrichmentScheduler();
