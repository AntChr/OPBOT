/**
 * Script pour enrichir TOUS les métiers dans la base de données
 *
 * Enrichit TOUS les métiers (pas seulement obsolètes) avec Phase 2
 * Idéal pour la première exécution ou pour re-enrichir la base complète
 *
 * Usage:
 *   node src/scripts/enrichAllJobs.js [options]
 *
 * Options:
 *   --limit=50         Enrichir max 50 métiers
 *   --batch-size=10    Taille des batches
 *   --batch-delay=60   Délai en secondes entre batches
 *   --sector=M         Enrichir uniquement secteur M
 *   --force            Forcer re-enrichissement
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Job = require('../models/Job');
const AutoEnrichmentScheduler = require('../services/AutoEnrichmentScheduler');

// Parser les arguments
const args = process.argv.slice(2);
const options = {
  limit: parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '50'),
  sector: args.find(a => a.startsWith('--sector='))?.split('=')[1],
  batchSize: parseInt(args.find(a => a.startsWith('--batch-size='))?.split('=')[1] || '10'),
  batchDelay: parseInt(args.find(a => a.startsWith('--batch-delay='))?.split('=')[1] || '60') * 1000,
  force: args.includes('--force')
};

// Afficher les options
console.log('\n' + '═'.repeat(70));
console.log('🚀 ENRICHIR TOUS LES MÉTIERS');
console.log('═'.repeat(70));
console.log(`Limite: ${options.limit}`);
console.log(`Secteur: ${options.sector || 'Tous'}`);
console.log(`Force: ${options.force ? 'OUI' : 'NON'}`);
console.log(`Taille batches: ${options.batchSize}`);
console.log(`Délai: ${options.batchDelay / 1000}s`);
console.log('═'.repeat(70) + '\n');

// Fonction principale
async function main() {
  try {
    // Connexion MongoDB
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connecté à MongoDB\n');

    // Compter les métiers totaux
    const totalJobs = await Job.countDocuments();
    console.log(`📊 Métiers totaux dans la base: ${totalJobs}`);

    // Appliquer options au scheduler
    AutoEnrichmentScheduler.batchSize = options.batchSize;
    AutoEnrichmentScheduler.batchDelay = options.batchDelay;

    // Récupérer les métiers à enrichir
    console.log('\n🔍 Recherche des métiers à enrichir...');

    const query = options.sector ? { sector: options.sector } : {};
    let jobsToEnrich;

    if (options.force) {
      // Forcer: enrichir TOUS
      jobsToEnrich = await Job.find(query)
        .limit(options.limit)
        .lean();
      console.log(`   Forcé: Enrichir ${jobsToEnrich.length} métiers (force=true)`);
    } else {
      // Enrichir les métiers incomplets
      jobsToEnrich = await AutoEnrichmentScheduler.getJobsNeedingEnrichment({
        limit: options.limit,
        sector: options.sector,
        force: false,
        daysOld: 30
      });
    }

    if (jobsToEnrich.length === 0) {
      console.log('\n✅ Aucun métier à enrichir!');
      process.exit(0);
    }

    console.log(`\n📈 Métiers à enrichir: ${jobsToEnrich.length}`);
    console.log(`Exemples: ${jobsToEnrich.slice(0, 3).map(j => j.title).join(', ')}\n`);

    // Confirmer avant de lancer
    if (jobsToEnrich.length > 20) {
      console.log('⚠️  Ceci va enrichir plus de 20 métiers et peut prendre du temps...');
      console.log('💰 Coût estimé: €' + (jobsToEnrich.length * 0.008).toFixed(2));
      console.log('\nLancement dans 3 secondes...');
      await sleep(3000);
    }

    // Lancer l'enrichissement
    const stats = await AutoEnrichmentScheduler.start({
      limit: options.limit,
      sector: options.sector,
      force: options.force,
      daysOld: options.force ? 0 : 30
    });

    // Résumé final
    console.log('\n' + '═'.repeat(70));
    console.log('📊 RÉSUMÉ FINAL');
    console.log('═'.repeat(70));
    console.log(`Total traité: ${stats.total}`);
    console.log(`✅ Enrichis: ${stats.enriched}/${stats.total}`);
    console.log(`❌ Erreurs: ${stats.failed}`);
    if (stats.startTime && stats.endTime) {
      const duration = Math.round((stats.endTime - stats.startTime) / 1000);
      const hours = Math.floor(duration / 3600);
      const minutes = Math.floor((duration % 3600) / 60);
      const seconds = duration % 60;
      console.log(`⏱️  Durée: ${hours}h ${minutes}m ${seconds}s`);
    }
    console.log(`💰 Coût estimé: €${stats.estimatedCost.toFixed(3)}`);
    console.log('═'.repeat(70) + '\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Erreur fatal:', error.message);
    console.error(error.stack);
    process.exit(1);

  } finally {
    await mongoose.disconnect();
  }
}

// Fonction sleep utilitaire
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Gestion des signaux d'arrêt
process.on('SIGINT', () => {
  console.log('\n\n⛔ Arrêt demandé par l\'utilisateur (Ctrl+C)');
  AutoEnrichmentScheduler.stop();
  setTimeout(() => process.exit(0), 2000);
});

// Lancer
main();
