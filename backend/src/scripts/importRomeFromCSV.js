/**
 * Import des métiers ROME depuis les fichiers CSV/XLSX de data.gouv.fr
 *
 * Ce script télécharge automatiquement les fichiers depuis data.gouv.fr
 * et importe les métiers dans MongoDB
 *
 * Usage:
 *   node src/scripts/importRomeFromCSV.js [options]
 *
 * Options:
 *   --download     Télécharge les fichiers depuis data.gouv.fr
 *   --limit=N      Limite l'import à N métiers
 *   --clear        Supprime les métiers ROME existants
 */

require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const Job = require('../models/Job');
const romeMapper = require('../services/RomeToJobMapper');

// URLs des fichiers ROME depuis francetravail.org (juin 2025)
const ROME_FILES = {
  metiers: 'https://www.francetravail.org/files/live/sites/peorg/files/documents/Statistiques-et-analyses/Open-data/ROME/ROME%20Arborescence%20principale%20-%20juin%202025.xlsx',
  competences: 'https://www.francetravail.org/files/live/sites/peorg/files/documents/Statistiques-et-analyses/Open-data/ROME/ROME%20Arborescence%20des%20comp%c3%a9tences%20-%20juin%202025.xlsx',
  savoirs: 'https://www.francetravail.org/files/live/sites/peorg/files/documents/Statistiques-et-analyses/Open-data/ROME/ROME%20Arborescence%20des%20savoirs%20-%20juin%202025.xlsx',
  contextes: 'https://www.francetravail.org/files/live/sites/peorg/files/documents/Statistiques-et-analyses/Open-data/ROME/ROME%20Arborescence%20des%20contextes%20de%20travail%20-%20juin%202025.xlsx',
};

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'rome');

// Arguments CLI
const args = process.argv.slice(2);
const options = {
  download: args.includes('--download'),
  limit: args.find(a => a.startsWith('--limit='))?.split('=')[1] || null,
  clear: args.includes('--clear')
};

class RomeCSVImporter {
  constructor() {
    this.stats = {
      downloaded: 0,
      imported: 0,
      updated: 0,
      errors: 0
    };
    this.data = {
      metiers: [],
      competences: [],
      savoirs: [],
      contextes: []
    };
  }

  /**
   * Crée le répertoire de données si nécessaire
   */
  ensureDataDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      console.log(`📁 Répertoire créé: ${DATA_DIR}\n`);
    }
  }

  /**
   * Télécharge un fichier depuis data.gouv.fr
   */
  async downloadFile(url, filename) {
    const filepath = path.join(DATA_DIR, filename);

    // Si le fichier existe déjà et qu'on ne force pas le téléchargement
    if (fs.existsSync(filepath) && !options.download) {
      console.log(`✓ Fichier existe déjà: ${filename}`);
      return filepath;
    }

    try {
      console.log(`📥 Téléchargement de ${filename}...`);

      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 60000
      });

      fs.writeFileSync(filepath, response.data);
      this.stats.downloaded++;
      console.log(`✅ Téléchargé: ${filename} (${(response.data.length / 1024).toFixed(0)} KB)\n`);

      return filepath;
    } catch (error) {
      console.error(`❌ Erreur lors du téléchargement de ${filename}:`, error.message);
      throw error;
    }
  }

  /**
   * Lit un fichier XLSX et retourne les données
   */
  readXLSX(filepath) {
    try {
      const workbook = XLSX.readFile(filepath);
      const sheetName = workbook.SheetNames[0]; // Prendre la première feuille
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      console.log(`📊 Fichier lu: ${path.basename(filepath)} (${data.length} lignes)\n`);
      return data;
    } catch (error) {
      console.error(`❌ Erreur lecture XLSX:`, error.message);
      return [];
    }
  }

  /**
   * Télécharge tous les fichiers ROME
   */
  async downloadAllFiles() {
    console.log('📥 Téléchargement des fichiers ROME depuis data.gouv.fr...\n');

    this.ensureDataDirectory();

    const downloads = [
      this.downloadFile(ROME_FILES.metiers, 'rome_metiers.xlsx'),
      this.downloadFile(ROME_FILES.competences, 'rome_competences.xlsx'),
      this.downloadFile(ROME_FILES.savoirs, 'rome_savoirs.xlsx'),
      this.downloadFile(ROME_FILES.contextes, 'rome_contextes.xlsx')
    ];

    await Promise.all(downloads);
  }

  /**
   * Charge les données depuis les fichiers
   */
  loadData() {
    console.log('📖 Lecture des fichiers ROME...\n');

    const metiersPath = path.join(DATA_DIR, 'rome_metiers.xlsx');
    const competencesPath = path.join(DATA_DIR, 'rome_competences.xlsx');
    const savoirsPath = path.join(DATA_DIR, 'rome_savoirs.xlsx');
    const contextesPath = path.join(DATA_DIR, 'rome_contextes.xlsx');

    if (fs.existsSync(metiersPath)) {
      this.data.metiers = this.readXLSX(metiersPath);
    }
    if (fs.existsSync(competencesPath)) {
      this.data.competences = this.readXLSX(competencesPath);
    }
    if (fs.existsSync(savoirsPath)) {
      this.data.savoirs = this.readXLSX(savoirsPath);
    }
    if (fs.existsSync(contextesPath)) {
      this.data.contextes = this.readXLSX(contextesPath);
    }
  }

  /**
   * Mappe les données CSV vers le format de notre base
   */
  mapRomeData(romeRow) {
    // Les fichiers ROME ont une structure spécifique
    // On va créer un objet similaire à ce que renvoie l'API
    const code = romeRow['code_rome'] || romeRow['Code ROME'] || romeRow['CODE_ROME'];
    const libelle = romeRow['libelle'] || romeRow['Libellé'] || romeRow['LIBELLE'];

    if (!code || !libelle) {
      return null;
    }

    // Préparer les données au format attendu par le mapper
    const romeData = {
      code: code,
      libelle: libelle,
      definition: romeRow['definition'] || `Métier de ${libelle}`,
      appellations: [],
      competences: {
        savoirFaire: this.getCompetencesForCode(code),
        savoirs: this.getSavoirsForCode(code)
      },
      contextes: this.getContextesForCode(code)
    };

    // Utiliser le mapper existant
    return romeMapper.mapRomeToJob(romeData);
  }

  /**
   * Récupère les compétences pour un code ROME
   */
  getCompetencesForCode(code) {
    return this.data.competences
      .filter(c => (c['code_rome'] || c['Code ROME']) === code)
      .map(c => ({
        libelle: c['libelle'] || c['Libellé'] || c['LIBELLE'] || '',
        description: c['description'] || ''
      }));
  }

  /**
   * Récupère les savoirs pour un code ROME
   */
  getSavoirsForCode(code) {
    return this.data.savoirs
      .filter(s => (s['code_rome'] || s['Code ROME']) === code)
      .map(s => ({
        libelle: s['libelle'] || s['Libellé'] || s['LIBELLE'] || ''
      }));
  }

  /**
   * Récupère les contextes pour un code ROME
   */
  getContextesForCode(code) {
    return this.data.contextes
      .filter(ctx => (ctx['code_rome'] || ctx['Code ROME']) === code)
      .map(ctx => ({
        libelle: ctx['libelle'] || ctx['Libellé'] || ctx['LIBELLE'] || ''
      }));
  }

  /**
   * Importe un métier dans la base
   */
  async importJob(romeData) {
    try {
      const jobData = this.mapRomeData(romeData);

      if (!jobData) {
        this.stats.errors++;
        return;
      }

      const existingJob = await Job.findOne({ romeCode: jobData.romeCode });

      if (existingJob) {
        await Job.findByIdAndUpdate(existingJob._id, {
          ...jobData,
          enrichedAt: new Date()
        });
        this.stats.updated++;
        console.log(`  ↻ Mis à jour: ${jobData.title}`);
      } else {
        await Job.create(jobData);
        this.stats.imported++;
        console.log(`  ✓ Importé: ${jobData.title}`);
      }
    } catch (error) {
      this.stats.errors++;
      console.error(`  ✗ Erreur: ${error.message}`);
    }
  }

  /**
   * Lance l'import complet
   */
  async run() {
    console.log('\n' + '='.repeat(60));
    console.log('  📥 IMPORT ROME DEPUIS CSV/XLSX');
    console.log('='.repeat(60) + '\n');

    try {
      // Connexion MongoDB
      await mongoose.connect(process.env.MONGO_URI);
      console.log('✅ Connecté à MongoDB\n');

      // Télécharger les fichiers si demandé
      if (options.download || !fs.existsSync(DATA_DIR)) {
        await this.downloadAllFiles();
      } else {
        console.log('ℹ️  Utilisation des fichiers locaux (--download pour re-télécharger)\n');
      }

      // Supprimer les métiers existants si demandé
      if (options.clear) {
        const result = await Job.deleteMany({ source: 'rome' });
        console.log(`🗑️  ${result.deletedCount} métiers ROME supprimés\n`);
      }

      // Charger les données
      this.loadData();

      let metiers = this.data.metiers;

      if (options.limit) {
        metiers = metiers.slice(0, parseInt(options.limit));
        console.log(`⚠️  Limitation à ${options.limit} métiers\n`);
      }

      console.log(`🚀 Import de ${metiers.length} métiers...\n`);

      // Import progressif
      for (const metier of metiers) {
        await this.importJob(metier);
      }

      // Statistiques
      console.log('\n' + '='.repeat(60));
      console.log('  📊 STATISTIQUES');
      console.log('='.repeat(60));
      console.log(`  Fichiers téléchargés : ${this.stats.downloaded}`);
      console.log(`  Nouveaux métiers     : ${this.stats.imported}`);
      console.log(`  Métiers mis à jour   : ${this.stats.updated}`);
      console.log(`  Erreurs              : ${this.stats.errors}`);
      console.log('='.repeat(60) + '\n');

    } catch (error) {
      console.error('\n❌ Erreur:', error.message);
      throw error;
    } finally {
      await mongoose.connection.close();
      console.log('✅ Connexion fermée\n');
    }
  }
}

// Exécution
if (require.main === module) {
  const importer = new RomeCSVImporter();
  importer.run()
    .then(() => {
      console.log('✅ Import terminé!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Import échoué:', error);
      process.exit(1);
    });
}

module.exports = RomeCSVImporter;
