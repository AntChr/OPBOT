/**
 * Import des métiers ROME depuis le fichier XML complet
 * Source: API France Travail Open Data
 */

require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const Job = require('../models/Job');
const romeMapper = require('../services/RomeToJobMapper');

const XML_URL = 'https://api.francetravail.fr/api-nomenclatureemploi/v1/open-data/xml';
const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'rome');
const XML_FILE = path.join(DATA_DIR, 'rome_complet.xml');

// Arguments CLI
const args = process.argv.slice(2);
const options = {
  download: args.includes('--download'),
  limit: args.find(a => a.startsWith('--limit='))?.split('=')[1] || null,
  clear: args.includes('--clear')
};

class RomeXMLImporter {
  constructor() {
    this.stats = {
      imported: 0,
      updated: 0,
      errors: 0
    };
  }

  ensureDataDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  async downloadXML() {
    if (fs.existsSync(XML_FILE) && !options.download) {
      console.log('✓ Fichier XML existe déjà\n');
      return;
    }

    console.log('📥 Téléchargement du fichier XML ROME complet...\n');

    try {
      const response = await axios.get(XML_URL, {
        responseType: 'text',
        timeout: 120000,
        headers: {
          'Accept': 'application/xml'
        }
      });

      fs.writeFileSync(XML_FILE, response.data);
      const sizeKB = (Buffer.byteLength(response.data) / 1024).toFixed(0);
      console.log(`✅ Téléchargé: ${sizeKB} KB\n`);
    } catch (error) {
      console.error('❌ Erreur téléchargement:', error.message);
      throw error;
    }
  }

  async parseXML() {
    console.log('📖 Lecture du fichier XML...\n');

    const xmlContent = fs.readFileSync(XML_FILE, 'utf8');
    const parser = new xml2js.Parser({ explicitArray: false });

    try {
      const result = await parser.parseStringPromise(xmlContent);
      console.log('✅ XML parsé avec succès\n');
      return result;
    } catch (error) {
      console.error('❌ Erreur parsing XML:', error.message);
      throw error;
    }
  }

  extractMetiers(data) {
    // La structure du XML peut varier, on cherche les métiers
    // Généralement dans une structure comme: root > metiers > metier[]
    let metiers = [];

    // Essayer différentes structures possibles
    if (data.nomenclature?.metiers?.metier) {
      metiers = Array.isArray(data.nomenclature.metiers.metier)
        ? data.nomenclature.metiers.metier
        : [data.nomenclature.metiers.metier];
    } else if (data.rome?.metiers?.metier) {
      metiers = Array.isArray(data.rome.metiers.metier)
        ? data.rome.metiers.metier
        : [data.rome.metiers.metier];
    } else if (data.metiers?.metier) {
      metiers = Array.isArray(data.metiers.metier)
        ? data.metiers.metier
        : [data.metiers.metier];
    }

    console.log(`📊 ${metiers.length} métiers trouvés dans le XML\n`);
    return metiers;
  }

  mapXMLToRomeData(metierXML) {
    // Convertir le format XML vers le format attendu par le mapper
    const getArray = (value) => {
      if (!value) return [];
      return Array.isArray(value) ? value : [value];
    };

    const romeData = {
      code: metierXML.$.code || metierXML.code || '',
      libelle: metierXML.libelle || metierXML.$.libelle || '',
      definition: metierXML.definition || '',
      appellations: getArray(metierXML.appellations?.appellation).map(app => ({
        libelle: typeof app === 'string' ? app : (app.libelle || app.$ || '')
      })),
      competences: {
        savoirFaire: getArray(metierXML.savoirFaire?.item || metierXML.competences?.savoirFaire).map(sf => ({
          libelle: typeof sf === 'string' ? sf : (sf.libelle || sf.$ || ''),
          description: typeof sf === 'object' ? sf.description || '' : ''
        })),
        savoirs: getArray(metierXML.savoirs?.item || metierXML.competences?.savoirs).map(s => ({
          libelle: typeof s === 'string' ? s : (s.libelle || s.$ || '')
        }))
      },
      contextes: getArray(metierXML.contextes?.item).map(ctx => ({
        libelle: typeof ctx === 'string' ? ctx : (ctx.libelle || ctx.$ || '')
      }))
    };

    return romeMapper.mapRomeToJob(romeData);
  }

  async importJob(metierXML) {
    try {
      const jobData = this.mapXMLToRomeData(metierXML);

      if (!jobData || !jobData.romeCode) {
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
        console.log(`  ↻ ${jobData.title} (${jobData.romeCode})`);
      } else {
        await Job.create(jobData);
        this.stats.imported++;
        console.log(`  ✓ ${jobData.title} (${jobData.romeCode})`);
      }
    } catch (error) {
      this.stats.errors++;
      console.error(`  ✗ Erreur: ${error.message}`);
    }
  }

  async run() {
    console.log('\n' + '='.repeat(60));
    console.log('  📥 IMPORT ROME DEPUIS XML');
    console.log('='.repeat(60) + '\n');

    try {
      // MongoDB
      await mongoose.connect(process.env.MONGO_URI);
      console.log('✅ Connecté à MongoDB\n');

      // Préparer le répertoire
      this.ensureDataDirectory();

      // Télécharger
      await this.downloadXML();

      // Clear si demandé
      if (options.clear) {
        const result = await Job.deleteMany({ source: 'rome' });
        console.log(`🗑️  ${result.deletedCount} métiers supprimés\n`);
      }

      // Parser le XML
      const data = await this.parseXML();

      // Extraire les métiers
      let metiers = this.extractMetiers(data);

      if (options.limit) {
        metiers = metiers.slice(0, parseInt(options.limit));
        console.log(`⚠️  Limitation à ${options.limit} métiers\n`);
      }

      console.log(`🚀 Import de ${metiers.length} métiers...\n`);

      // Import
      for (const metier of metiers) {
        await this.importJob(metier);
      }

      // Stats
      console.log('\n' + '='.repeat(60));
      console.log('  📊 STATISTIQUES');
      console.log('='.repeat(60));
      console.log(`  Nouveaux métiers   : ${this.stats.imported}`);
      console.log(`  Métiers mis à jour : ${this.stats.updated}`);
      console.log(`  Erreurs            : ${this.stats.errors}`);
      console.log('='.repeat(60) + '\n');

      // Exemples
      console.log('📋 Exemples importés:\n');
      const samples = await Job.find({ source: 'rome' }).limit(5);
      samples.forEach(job => {
        console.log(`  • ${job.title} (${job.romeCode})`);
        console.log(`    Secteur: ${job.sector} | RIASEC: ${job.riasec.join(', ')}`);
      });
      console.log('');

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
  const importer = new RomeXMLImporter();
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

module.exports = RomeXMLImporter;
