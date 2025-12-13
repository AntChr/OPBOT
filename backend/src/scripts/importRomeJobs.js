/**
 * Script d'import des métiers ROME dans la base de données
 *
 * Usage:
 *   node src/scripts/importRomeJobs.js [options]
 *
 * Options:
 *   --limit=N      Limite le nombre de métiers à importer (pour tests)
 *   --clear        Supprime les métiers ROME existants avant l'import
 *   --test         Test la connexion API sans importer
 *   --codes=A,B,C  Importe uniquement les domaines spécifiés
 *
 * Exemples:
 *   node src/scripts/importRomeJobs.js --test
 *   node src/scripts/importRomeJobs.js --limit=10
 *   node src/scripts/importRomeJobs.js --codes=M,J --limit=50
 *   node src/scripts/importRomeJobs.js --clear
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Job = require('../models/Job');
const franceTravailService = require('../services/FranceTravailService');
const romeMapper = require('../services/RomeToJobMapper');

// Parsing des arguments de ligne de commande
const args = process.argv.slice(2);
const options = {
  limit: null,
  clear: false,
  test: false,
  codes: null
};

args.forEach(arg => {
  if (arg.startsWith('--limit=')) {
    options.limit = parseInt(arg.split('=')[1]);
  } else if (arg === '--clear') {
    options.clear = true;
  } else if (arg === '--test') {
    options.test = true;
  } else if (arg.startsWith('--codes=')) {
    options.codes = arg.split('=')[1].split(',').map(c => c.trim().toUpperCase());
  }
});

class RomeImporter {
  constructor() {
    this.stats = {
      total: 0,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: 0
    };
  }

  /**
   * Connexion à la base de données
   */
  async connectDB() {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log('✅ Connecté à MongoDB');
    } catch (error) {
      console.error('❌ Erreur de connexion MongoDB:', error.message);
      throw error;
    }
  }

  /**
   * Supprime les métiers ROME existants
   */
  async clearExistingRomeJobs() {
    try {
      const result = await Job.deleteMany({ source: 'rome' });
      console.log(`🗑️  ${result.deletedCount} métiers ROME supprimés`);
    } catch (error) {
      console.error('❌ Erreur lors de la suppression:', error.message);
      throw error;
    }
  }

  /**
   * Teste la connexion à l'API
   */
  async testApiConnection() {
    console.log('\n🧪 Test de connexion à l\'API France Travail...\n');

    const isConnected = await franceTravailService.testConnection();

    if (isConnected) {
      console.log('\n✅ Test réussi! L\'API est accessible.\n');

      // Récupérer quelques métiers pour vérifier
      try {
        const jobs = await franceTravailService.getAllJobSheets();
        console.log(`📊 ${jobs.length} fiches métiers disponibles\n`);

        // Afficher un exemple
        if (jobs.length > 0) {
          const example = jobs[0];
          console.log('Exemple de fiche métier:');
          console.log(`  Code: ${example.code}`);
          console.log(`  Libellé: ${example.libelle}`);
          console.log(`  Appellations: ${example.appellations?.length || 0}\n`);
        }
      } catch (error) {
        console.error('❌ Erreur lors de la récupération des métiers');
      }
    } else {
      console.log('\n❌ Test échoué. Vérifiez vos credentials dans le fichier .env\n');
    }

    return isConnected;
  }

  /**
   * Importe un métier dans la base
   */
  async importJob(romeJobData) {
    try {
      // Récupérer les données complètes du métier
      const completeData = await franceTravailService.getCompleteJobData(romeJobData.code);

      // Mapper vers notre schéma
      const jobData = romeMapper.mapRomeToJob(completeData);

      // Vérifier si le métier existe déjà
      const existingJob = await Job.findOne({ romeCode: jobData.romeCode });

      if (existingJob) {
        // Mettre à jour le métier existant
        await Job.findByIdAndUpdate(existingJob._id, {
          ...jobData,
          enrichedAt: new Date()
        });
        this.stats.updated++;
        console.log(`  ↻ Mis à jour: ${jobData.title}`);
      } else {
        // Créer un nouveau métier
        await Job.create(jobData);
        this.stats.imported++;
        console.log(`  ✓ Importé: ${jobData.title}`);
      }
    } catch (error) {
      this.stats.errors++;
      console.error(`  ✗ Erreur pour ${romeJobData.code}: ${error.message}`);
    }
  }

  /**
   * Filtre les métiers selon les codes de domaine spécifiés
   */
  filterJobsByCodes(jobs, codes) {
    if (!codes || codes.length === 0) return jobs;

    return jobs.filter(job => {
      const domainLetter = job.code.charAt(0);
      return codes.includes(domainLetter);
    });
  }

  /**
   * Lance l'import complet
   */
  async run() {
    console.log('\n' + '='.repeat(60));
    console.log('  📥 IMPORT DES MÉTIERS ROME 4.0');
    console.log('='.repeat(60) + '\n');

    try {
      // Connexion à la base de données
      await this.connectDB();

      // Mode test uniquement
      if (options.test) {
        await this.testApiConnection();
        await mongoose.connection.close();
        return;
      }

      // Suppression des métiers existants si demandé
      if (options.clear) {
        console.log('⚠️  Mode suppression activé\n');
        await this.clearExistingRomeJobs();
      }

      // Récupération de tous les métiers ROME
      console.log('📥 Récupération des fiches métiers depuis l\'API...\n');
      let allJobs = await franceTravailService.getAllJobSheets();

      this.stats.total = allJobs.length;

      // Filtrage par codes de domaine si spécifié
      if (options.codes) {
        allJobs = this.filterJobsByCodes(allJobs, options.codes);
        console.log(`🔍 Filtrage sur les domaines: ${options.codes.join(', ')}`);
        console.log(`📊 ${allJobs.length} métiers correspondent\n`);
      }

      // Limitation du nombre si spécifié
      if (options.limit) {
        allJobs = allJobs.slice(0, options.limit);
        console.log(`⚠️  Limitation à ${options.limit} métiers\n`);
      }

      console.log(`🚀 Début de l'import de ${allJobs.length} métiers...\n`);

      // Import progressif avec affichage de la progression
      const batchSize = 10;
      for (let i = 0; i < allJobs.length; i += batchSize) {
        const batch = allJobs.slice(i, i + batchSize);
        const progress = Math.round(((i + batch.length) / allJobs.length) * 100);

        console.log(`\n[${progress}%] Traitement du lot ${Math.floor(i / batchSize) + 1}...`);

        // Traiter le lot en parallèle pour plus de rapidité
        await Promise.all(batch.map(job => this.importJob(job)));

        // Petite pause pour ne pas surcharger l'API (limite: 1 appel/seconde)
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Affichage des statistiques finales
      console.log('\n' + '='.repeat(60));
      console.log('  📊 STATISTIQUES D\'IMPORT');
      console.log('='.repeat(60));
      console.log(`  Total disponible    : ${this.stats.total}`);
      console.log(`  Nouveaux métiers    : ${this.stats.imported}`);
      console.log(`  Métiers mis à jour  : ${this.stats.updated}`);
      console.log(`  Erreurs             : ${this.stats.errors}`);
      console.log(`  Succès              : ${this.stats.imported + this.stats.updated}`);
      console.log('='.repeat(60) + '\n');

      // Afficher quelques exemples
      console.log('📋 Exemples de métiers importés:\n');
      const samples = await Job.find({ source: 'rome' }).limit(5);
      samples.forEach(job => {
        console.log(`  • ${job.title} (${job.romeCode})`);
        console.log(`    Secteur: ${job.sector} | RIASEC: ${job.riasec.join(', ')}`);
      });
      console.log('');

    } catch (error) {
      console.error('\n❌ Erreur critique:', error.message);
      console.error(error.stack);
    } finally {
      // Fermeture de la connexion
      await mongoose.connection.close();
      console.log('✅ Connexion fermée\n');
    }
  }
}

// Exécution du script
if (require.main === module) {
  const importer = new RomeImporter();
  importer.run()
    .then(() => {
      console.log('✅ Import terminé avec succès!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Import échoué:', error.message);
      process.exit(1);
    });
}

module.exports = RomeImporter;
