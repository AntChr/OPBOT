/**
 * Script de lancement de l'enrichissement automatique
 *
 * Lance l'enrichissement en batch des métiers
 * Peut être exécuté manuellement ou via cron job
 *
 * Usage:
 *   node src/scripts/runAutoEnrichment.js [options]
 *
 * Options:
 *   --limit=50         Enrichir max 50 métiers
 *   --sector=M         Enrichir uniquement secteur M
 *   --force            Forcer re-enrichissement même si récent
 *   --days=30          Métiers enrichis il y a +30 jours
 *   --batch-size=10    Taille des batches (défaut: 10)
 *   --batch-delay=60   Délai entre batches en secondes (défaut: 60)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const AutoEnrichmentScheduler = require('../services/AutoEnrichmentScheduler');

// Parser les arguments
const args = process.argv.slice(2);
const options = {
  limit: parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '50'),
  sector: args.find(a => a.startsWith('--sector='))?.split('=')[1],
  force: args.includes('--force'),
  daysOld: parseInt(args.find(a => a.startsWith('--days='))?.split('=')[1] || '30'),
  batchSize: parseInt(args.find(a => a.startsWith('--batch-size='))?.split('=')[1] || '10'),
  batchDelay: parseInt(args.find(a => a.startsWith('--batch-delay='))?.split('=')[1] || '60') * 1000
};

// Afficher les options
console.log('\n' + '═'.repeat(70));
console.log('⚙️  CONFIGURATION');
console.log('═'.repeat(70));
console.log(`Limite de métiers: ${options.limit}`);
console.log(`Secteur: ${options.sector || 'Tous'}`);
console.log(`Force re-enrichissement: ${options.force ? 'OUI' : 'NON'}`);
console.log(`Métiers enrichis il y a >: ${options.daysOld} jours`);
console.log(`Taille des batches: ${options.batchSize}`);
console.log(`Délai entre batches: ${options.batchDelay / 1000}s`);
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

    // Appliquer les options du scheduler
    AutoEnrichmentScheduler.batchSize = options.batchSize;
    AutoEnrichmentScheduler.batchDelay = options.batchDelay;

    // Lancer l'enrichissement
    const stats = await AutoEnrichmentScheduler.start({
      limit: options.limit,
      sector: options.sector,
      force: options.force,
      daysOld: options.daysOld
    });

    // Afficher le résumé final
    console.log('\n📊 RÉSUMÉ FINAL');
    console.log('═'.repeat(70));
    console.log(`Total traité: ${stats.total}`);
    console.log(`✅ Enrichis avec succès: ${stats.enriched}`);
    console.log(`❌ Erreurs: ${stats.failed}`);
    console.log(`⏭️  Skippés: ${stats.skipped}`);
    if (stats.startTime && stats.endTime) {
      const duration = Math.round((stats.endTime - stats.startTime) / 1000);
      console.log(`⏱️  Durée totale: ${duration}s (${Math.round(duration / 60)}min)`);
    }
    console.log(`💰 Coût estimé (Claude): €${stats.estimatedCost.toFixed(3)}`);
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

// Gestion des signaux d'arrêt
process.on('SIGINT', () => {
  console.log('\n\n⛔ Arrêt demandé par l\'utilisateur (Ctrl+C)');
  AutoEnrichmentScheduler.stop();
  setTimeout(() => process.exit(0), 2000);
});

process.on('SIGTERM', () => {
  console.log('\n\n⛔ Arrêt demandé par le système');
  AutoEnrichmentScheduler.stop();
  setTimeout(() => process.exit(0), 2000);
});

// Lancer
main();
