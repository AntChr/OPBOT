/**
 * Enrichissement intelligent des métiers avec IA
 *
 * Ce script utilise Claude + Web Scraping pour enrichir automatiquement
 * la base de données métiers avec des informations de qualité
 *
 * Usage:
 *   node src/scripts/intelligentEnrichment.js [options]
 *
 * Options:
 *   --job=CODE_ROME    Enrichir un métier spécifique
 *   --limit=N          Limiter à N métiers
 *   --force            Forcer le ré-enrichissement même si récent
 *   --sector=X         Enrichir uniquement un secteur (A, B, C, etc.)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Job = require('../models/Job');
const enrichmentService = require('../services/JobEnrichmentService');
const scraperService = require('../services/WebScraperService');

// Arguments CLI
const args = process.argv.slice(2);
const options = {
  job: args.find(a => a.startsWith('--job='))?.split('=')[1],
  limit: args.find(a => a.startsWith('--limit='))?.split('=')[1] || null,
  force: args.includes('--force'),
  sector: args.find(a => a.startsWith('--sector='))?.split('=')[1]
};

class IntelligentEnricher {
  constructor() {
    this.stats = {
      total: 0,
      enriched: 0,
      skipped: 0,
      errors: 0,
      apiCalls: 0,
      estimatedCost: 0
    };
  }

  /**
   * Enrichit un métier avec l'IA
   */
  async enrichJob(job) {
    try {
      console.log('\n' + '─'.repeat(70));
      console.log(`📌 ${job.title} (${job.romeCode})`);

      // 1. Vérifier si enrichissement nécessaire
      if (!options.force && !enrichmentService.needsEnrichment(job)) {
        console.log('  ⏭️  Déjà enrichi récemment, skip');
        this.stats.skipped++;
        return;
      }

      // 2. Collecter les sources web
      const sources = await scraperService.gatherAllSources({
        title: job.title,
        romeCode: job.romeCode,
        sector: job.sector
      });

      if (sources.length === 0) {
        console.log('  ⚠️  Aucune source externe trouvée');
      }

      // 3. Analyser avec l'IA
      console.log('  🤖 Analyse IA en cours...');

      const enrichedData = await enrichmentService.analyzeJobWithLLM(
        job.toObject(),
        sources
      );

      this.stats.apiCalls++;

      // Estimation du coût (Claude Sonnet: ~$3 pour 1M input tokens, ~$15 pour 1M output)
      // Approximation: 2000 tokens input + 1000 tokens output par job
      this.stats.estimatedCost += (2000 * 0.000003) + (1000 * 0.000015);

      console.log(`  ✅ Analyse terminée (qualité: ${Math.round((enrichedData.dataQuality || 0) * 100)}%)`);

      // 4. Fusionner avec les données existantes
      const mergedData = enrichmentService.mergeJobData(job, enrichedData);

      // 5. Mettre à jour dans la DB
      await Job.findByIdAndUpdate(job._id, mergedData);

      console.log('  💾 Sauvegardé');
      console.log(`  📊 Compétences: ${mergedData.skills?.length || 0}`);
      console.log(`  🧬 Traits enrichis: ${Object.keys(Object.fromEntries(mergedData.traitVector || [])).length}`);

      this.stats.enriched++;

    } catch (error) {
      console.error(`  ❌ Erreur: ${error.message}`);
      this.stats.errors++;
    }
  }

  /**
   * Récupère les métiers à enrichir
   */
  async getJobsToEnrich() {
    let query = { source: 'rome' };

    // Filtrer par code ROME spécifique
    if (options.job) {
      query.romeCode = options.job.toUpperCase();
    }

    // Filtrer par secteur
    if (options.sector) {
      query.romeCode = { $regex: `^${options.sector.toUpperCase()}` };
    }

    let jobs = await Job.find(query);

    // Si pas de force, filtrer ceux qui ont besoin d'enrichissement
    if (!options.force) {
      jobs = jobs.filter(job => enrichmentService.needsEnrichment(job));
    }

    // Limiter si demandé
    if (options.limit) {
      jobs = jobs.slice(0, parseInt(options.limit));
    }

    return jobs;
  }

  /**
   * Lance l'enrichissement
   */
  async run() {
    console.log('\n' + '='.repeat(70));
    console.log('  🧠 ENRICHISSEMENT INTELLIGENT DES MÉTIERS');
    console.log('='.repeat(70) + '\n');

    try {
      // Vérifier la clé API
      if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.startsWith('sk-ant')) {
        console.log('⚠️  Vérification de la clé API Anthropic...');
        if (!process.env.ANTHROPIC_API_KEY.includes('api03')) {
          console.log('❌ Clé API Anthropic manquante ou invalide dans .env');
          console.log('   Obtenez une clé sur: https://console.anthropic.com/');
          return;
        }
        console.log('✅ Clé API trouvée\n');
      }

      // Connexion MongoDB
      await mongoose.connect(process.env.MONGO_URI);
      console.log('✅ Connecté à MongoDB\n');

      // Récupérer les métiers
      const jobs = await this.getJobsToEnrich();
      this.stats.total = jobs.length;

      if (jobs.length === 0) {
        console.log('ℹ️  Aucun métier à enrichir\n');
        return;
      }

      console.log(`📊 ${jobs.length} métier(s) à enrichir\n`);

      if (options.limit) {
        console.log(`⚠️  Limitation à ${options.limit} métiers\n`);
      }

      // Confirmation si > 10 métiers (coût API)
      if (jobs.length > 10 && !options.limit) {
        console.log('⚠️  ATTENTION: L\'enrichissement de nombreux métiers consomme des crédits API');
        console.log(`   Estimation: ~${(jobs.length * 0.05).toFixed(2)}€ pour ${jobs.length} métiers`);
        console.log('   Utilisez --limit=N pour limiter\n');

        // Attendre 3 secondes pour permettre Ctrl+C
        console.log('   Démarrage dans 3 secondes... (Ctrl+C pour annuler)');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      console.log('🚀 Démarrage de l\'enrichissement...\n');

      // Enrichir chaque métier
      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];
        console.log(`\n[${i + 1}/${jobs.length}]`);

        await this.enrichJob(job);

        // Petite pause pour ne pas surcharger les APIs
        if (i < jobs.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Statistiques finales
      console.log('\n\n' + '='.repeat(70));
      console.log('  📊 STATISTIQUES FINALES');
      console.log('='.repeat(70));
      console.log(`  Total métiers      : ${this.stats.total}`);
      console.log(`  Enrichis           : ${this.stats.enriched}`);
      console.log(`  Ignorés (récents)  : ${this.stats.skipped}`);
      console.log(`  Erreurs            : ${this.stats.errors}`);
      console.log(`  Appels API         : ${this.stats.apiCalls}`);
      console.log(`  Coût estimé        : ~${this.stats.estimatedCost.toFixed(3)}€`);
      console.log('='.repeat(70) + '\n');

      // Afficher quelques exemples
      if (this.stats.enriched > 0) {
        console.log('📋 Exemples de métiers enrichis:\n');
        const enriched = await Job.find({
          source: 'rome',
          enrichedAt: { $exists: true }
        })
          .sort({ enrichedAt: -1 })
          .limit(3);

        enriched.forEach(job => {
          console.log(`  • ${job.title} (${job.romeCode})`);
          console.log(`    Compétences: ${job.skills?.length || 0}`);
          console.log(`    Qualité: ${Math.round((job.dataQuality || 0) * 100)}%`);
          console.log(`    Sources: ${job.enrichedSources?.join(', ') || 'N/A'}`);
          console.log('');
        });
      }

    } catch (error) {
      console.error('\n❌ Erreur:', error.message);
      if (error.message.includes('API')) {
        console.log('\n💡 Vérifiez votre clé API Anthropic dans .env');
      }
      throw error;
    } finally {
      await mongoose.connection.close();
      console.log('✅ Connexion fermée\n');
    }
  }
}

// Exécution
if (require.main === module) {
  const enricher = new IntelligentEnricher();
  enricher.run()
    .then(() => {
      console.log('✅ Enrichissement terminé!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Enrichissement échoué:', error);
      process.exit(1);
    });
}

module.exports = IntelligentEnricher;
