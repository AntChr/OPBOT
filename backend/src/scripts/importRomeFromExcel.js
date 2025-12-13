/**
 * Import complet des métiers ROME depuis les fichiers Excel
 * Parse la structure hiérarchique complète
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const Job = require('../models/Job');
const romeMapper = require('../services/RomeToJobMapper');

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'rome');

const args = process.argv.slice(2);
const options = {
  limit: args.find(a => a.startsWith('--limit='))?.split('=')[1] || null,
  clear: args.includes('--clear')
};

class RomeExcelImporter {
  constructor() {
    this.stats = {
      imported: 0,
      updated: 0,
      errors: 0,
      skipped: 0
    };
    this.competences = new Map();
    this.savoirs = new Map();
    this.contextes = new Map();
  }

  /**
   * Lit les fichiers de compétences, savoirs et contextes
   */
  loadSupportData() {
    console.log('📖 Chargement des données de support...\n');

    // Compétences
    try {
      const compFile = path.join(DATA_DIR, 'rome_competences.xlsx');
      if (fs.existsSync(compFile)) {
        const wb = XLSX.readFile(compFile);
        const ws = wb.Sheets[wb.SheetNames[1] || wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);

        data.forEach(row => {
          const code = this.findCodeInRow(row);
          if (code) {
            if (!this.competences.has(code)) this.competences.set(code, []);
            const libelle = this.findLibelleInRow(row);
            if (libelle) {
              this.competences.get(code).push({
                libelle: libelle,
                description: ''
              });
            }
          }
        });
        console.log(`  ✓ ${this.competences.size} codes avec compétences chargées`);
      }
    } catch (e) {
      console.log(`  ⚠ Compétences non chargées: ${e.message}`);
    }

    // Savoirs
    try {
      const savFile = path.join(DATA_DIR, 'rome_savoirs.xlsx');
      if (fs.existsSync(savFile)) {
        const wb = XLSX.readFile(savFile);
        const ws = wb.Sheets[wb.SheetNames[1] || wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);

        data.forEach(row => {
          const code = this.findCodeInRow(row);
          if (code) {
            if (!this.savoirs.has(code)) this.savoirs.set(code, []);
            const libelle = this.findLibelleInRow(row);
            if (libelle) {
              this.savoirs.get(code).push({ libelle: libelle });
            }
          }
        });
        console.log(`  ✓ ${this.savoirs.size} codes avec savoirs chargés`);
      }
    } catch (e) {
      console.log(`  ⚠ Savoirs non chargés: ${e.message}`);
    }

    console.log('');
  }

  /**
   * Trouve un code ROME dans une ligne (format AXXXX)
   */
  findCodeInRow(row) {
    for (const key in row) {
      const value = String(row[key]).trim();
      if (/^[A-N]\d{4}$/.test(value)) {
        return value;
      }
    }
    return null;
  }

  /**
   * Trouve un libellé dans une ligne
   */
  findLibelleInRow(row) {
    const keys = Object.keys(row);
    for (const key of keys) {
      const value = String(row[key]).trim();
      // Un libellé a au moins 3 caractères et n'est pas un code
      if (value.length > 3 && !/^[A-N]\d{4}$/.test(value)) {
        return value;
      }
    }
    return null;
  }

  /**
   * Parse l'arborescence principale pour extraire les métiers
   */
  parseArborescence() {
    const file = path.join(DATA_DIR, 'rome_metiers.xlsx');
    const workbook = XLSX.readFile(file);

    // La vraie arborescence est dans la 2ème feuille
    const sheetName = workbook.SheetNames[1];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📊 Analyse de ${data.length} lignes d'arborescence...\n`);

    const metiers = new Map();

    data.forEach(row => {
      const lettre = String(row[' '] || '').trim();
      const num1 = String(row[' _1'] || '').trim();
      const num2 = String(row[' _2'] || '').trim();
      const libelle = String(row[' _3'] || '').trim();

      if (lettre && num1 && num2.length === 2 && libelle) {
        const code = lettre + num1 + num2;

        if (/^[A-N]\d{4}$/.test(code)) {
          if (!metiers.has(code)) {
            // Premier libellé = nom du métier
            metiers.set(code, {
              code: code,
              libelle: libelle,
              appellations: []
            });
          } else {
            // Libellés suivants = appellations
            metiers.get(code).appellations.push({
              libelle: libelle
            });
          }
        }
      }
    });

    console.log(`✅ ${metiers.size} métiers uniques trouvés\n`);
    return Array.from(metiers.values());
  }

  /**
   * Enrichit un métier avec les compétences et savoirs
   */
  enrichMetier(metier) {
    const romeData = {
      code: metier.code,
      libelle: metier.libelle,
      definition: `Métier référencé dans le ROME 4.0 : ${metier.libelle}`,
      appellations: metier.appellations,
      competences: {
        savoirFaire: this.competences.get(metier.code) || [],
        savoirs: this.savoirs.get(metier.code) || []
      },
      contextes: this.contextes.get(metier.code) || []
    };

    return romeMapper.mapRomeToJob(romeData);
  }

  /**
   * Importe un métier
   */
  async importJob(metier) {
    try {
      const jobData = this.enrichMetier(metier);

      if (!jobData || !jobData.romeCode) {
        this.stats.skipped++;
        return;
      }

      const existingJob = await Job.findOne({ romeCode: jobData.romeCode });

      if (existingJob) {
        await Job.findByIdAndUpdate(existingJob._id, {
          ...jobData,
          enrichedAt: new Date()
        });
        this.stats.updated++;
        process.stdout.write('↻');
      } else {
        await Job.create(jobData);
        this.stats.imported++;
        process.stdout.write('✓');
      }

      if ((this.stats.imported + this.stats.updated) % 50 === 0) {
        console.log(` ${this.stats.imported + this.stats.updated}`);
      }
    } catch (error) {
      this.stats.errors++;
      process.stdout.write('✗');
    }
  }

  async run() {
    console.log('\n' + '='.repeat(60));
    console.log('  📥 IMPORT ROME DEPUIS EXCEL');
    console.log('='.repeat(60) + '\n');

    try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log('✅ Connecté à MongoDB\n');

      // Charger les données de support
      this.loadSupportData();

      // Parser l'arborescence
      let metiers = this.parseArborescence();

      if (options.limit) {
        metiers = metiers.slice(0, parseInt(options.limit));
        console.log(`⚠️  Limitation à ${options.limit} métiers\n`);
      }

      // Clear si demandé
      if (options.clear) {
        const result = await Job.deleteMany({ source: 'rome' });
        console.log(`🗑️  ${result.deletedCount} métiers ROME supprimés\n`);
      }

      console.log(`🚀 Import de ${metiers.length} métiers...\n`);

      // Import progressif
      for (const metier of metiers) {
        await this.importJob(metier);
      }

      console.log('\n');

      // Statistiques
      console.log('\n' + '='.repeat(60));
      console.log('  📊 STATISTIQUES');
      console.log('='.repeat(60));
      console.log(`  Nouveaux métiers   : ${this.stats.imported}`);
      console.log(`  Métiers mis à jour : ${this.stats.updated}`);
      console.log(`  Ignorés            : ${this.stats.skipped}`);
      console.log(`  Erreurs            : ${this.stats.errors}`);
      console.log('='.repeat(60) + '\n');

      // Afficher par domaine
      console.log('📋 Métiers par domaine:\n');
      const jobs = await Job.find({ source: 'rome' }).sort({ romeCode: 1 });
      const byDomain = {};

      jobs.forEach(job => {
        const domain = job.romeCode.charAt(0);
        if (!byDomain[domain]) byDomain[domain] = [];
        byDomain[domain].push(job);
      });

      Object.keys(byDomain).sort().forEach(domain => {
        const domainNames = {
          'A': 'Agriculture', 'B': 'Arts', 'C': 'Banque',
          'D': 'Commerce', 'E': 'Communication', 'F': 'BTP',
          'G': 'Hôtellerie', 'H': 'Industrie', 'I': 'Maintenance',
          'J': 'Santé', 'K': 'Services', 'L': 'Spectacle',
          'M': 'Support entreprise', 'N': 'Logistique'
        };

        console.log(`  ${domain} - ${domainNames[domain] || domain}: ${byDomain[domain].length} métiers`);
      });

      console.log(`\n  TOTAL: ${jobs.length} métiers ROME\n`);

    } catch (error) {
      console.error('\n❌ Erreur:', error.message);
      throw error;
    } finally {
      await mongoose.connection.close();
      console.log('✅ Connexion fermée\n');
    }
  }
}

if (require.main === module) {
  const importer = new RomeExcelImporter();
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

module.exports = RomeExcelImporter;
