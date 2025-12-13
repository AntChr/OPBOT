/**
 * Script pour importer les métiers depuis ESCO (European Skills, Competences, Qualifications and Occupations)
 *
 * INSTRUCTIONS:
 * 1. Téléchargez le fichier CSV des occupations ESCO en français depuis:
 *    https://esco.ec.europa.eu/en/use-esco/download
 *    - Version: ESCO dataset v1.2.0
 *    - Langue: Français (fr)
 *    - Format: CSV
 *    - Contenu: Occupations
 *
 * 2. Placez le fichier téléchargé dans le dossier backend/data/ avec le nom: occupations_fr.csv
 *
 * 3. Exécutez ce script: node scripts/importESCOJobs.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const Job = require('../src/models/Job');

// Dimensions de traits pour le matching
const TRAIT_DIMENSIONS = [
  'analytical', 'creativity', 'leadership', 'teamwork', 'communication',
  'detail-oriented', 'problem-solving', 'adaptability', 'organizational',
  'technical', 'independent', 'service', 'design'
];

// Mapping de mots-clés vers traits (basé sur le titre et la description)
const KEYWORD_TO_TRAITS = {
  // Analytique
  'analy': ['analytical'],
  'data': ['analytical', 'technical'],
  'research': ['analytical', 'problem-solving'],
  'scientif': ['analytical', 'technical'],
  'statistic': ['analytical', 'technical'],
  'financial': ['analytical', 'detail-oriented'],

  // Créativité & Design
  'design': ['creativity', 'design'],
  'art': ['creativity', 'design'],
  'creat': ['creativity'],
  'innov': ['creativity', 'problem-solving'],
  'architect': ['creativity', 'design', 'technical'],
  'graphic': ['creativity', 'design', 'technical'],

  // Leadership & Management
  'manag': ['leadership', 'organizational', 'communication'],
  'direc': ['leadership', 'organizational'],
  'supervis': ['leadership', 'teamwork'],
  'coordinat': ['organizational', 'leadership'],
  'execut': ['leadership', 'analytical'],

  // Technique
  'engineer': ['technical', 'analytical', 'problem-solving'],
  'technician': ['technical', 'detail-oriented'],
  'develop': ['technical', 'problem-solving'],
  'program': ['technical', 'analytical'],
  'software': ['technical', 'problem-solving'],
  'hardware': ['technical', 'detail-oriented'],
  'mechan': ['technical', 'problem-solving'],
  'electr': ['technical', 'problem-solving'],

  // Communication
  'commun': ['communication'],
  'market': ['communication', 'creativity'],
  'public relation': ['communication', 'organizational'],
  'journalist': ['communication', 'analytical'],
  'writer': ['communication', 'creativity'],
  'translator': ['communication', 'detail-oriented'],

  // Service & Social
  'service': ['service', 'communication'],
  'customer': ['service', 'communication'],
  'social': ['service', 'communication', 'teamwork'],
  'care': ['service', 'teamwork'],
  'health': ['service', 'technical'],
  'nurs': ['service', 'teamwork', 'detail-oriented'],
  'teach': ['communication', 'service', 'organizational'],
  'educat': ['communication', 'service'],

  // Organisation
  'admin': ['organizational', 'detail-oriented'],
  'clerical': ['organizational', 'detail-oriented'],
  'office': ['organizational', 'communication'],
  'secretar': ['organizational', 'communication', 'detail-oriented'],

  // Métiers spécifiques
  'fleur': ['creativity', 'service', 'design'],
  'floral': ['creativity', 'service', 'design'],
  'horti': ['creativity', 'independent', 'service'],
  'jardin': ['creativity', 'independent', 'service'],
  'landscap': ['creativity', 'design', 'independent'],
  'paysag': ['creativity', 'design', 'independent'],

  // Vente
  'sales': ['communication', 'service'],
  'retail': ['service', 'communication'],
  'commerce': ['communication', 'service'],
  'vente': ['communication', 'service'],

  // Artisanat
  'craft': ['creativity', 'technical', 'detail-oriented'],
  'artisan': ['creativity', 'technical', 'independent'],
  'baker': ['technical', 'creativity', 'detail-oriented'],
  'cook': ['creativity', 'technical', 'service'],
  'chef': ['creativity', 'leadership', 'technical'],

  // Agriculture
  'farm': ['independent', 'technical', 'organizational'],
  'agricult': ['independent', 'technical', 'organizational'],
  'agronome': ['analytical', 'technical', 'independent'],

  // Construction
  'construct': ['technical', 'teamwork', 'problem-solving'],
  'build': ['technical', 'teamwork', 'problem-solving'],
  'carpent': ['technical', 'detail-oriented', 'problem-solving'],

  // Transport & Logistique
  'transport': ['organizational', 'technical'],
  'logistic': ['organizational', 'analytical', 'problem-solving'],
  'driver': ['independent', 'service'],
  'pilot': ['technical', 'analytical', 'independent'],

  // Juridique
  'legal': ['analytical', 'communication', 'detail-oriented'],
  'law': ['analytical', 'communication', 'problem-solving'],
  'jurid': ['analytical', 'communication', 'detail-oriented']
};

/**
 * Génère un vecteur de traits basé sur le titre et la description du métier
 */
function generateTraitVector(title, description = '') {
  const vector = new Map();
  TRAIT_DIMENSIONS.forEach(trait => vector.set(trait, 0));

  const text = `${title} ${description}`.toLowerCase();
  const traitScores = new Map();
  TRAIT_DIMENSIONS.forEach(trait => traitScores.set(trait, 0));

  // Compter les correspondances de mots-clés
  for (const [keyword, traits] of Object.entries(KEYWORD_TO_TRAITS)) {
    if (text.includes(keyword)) {
      traits.forEach(trait => {
        const currentScore = traitScores.get(trait) || 0;
        traitScores.set(trait, currentScore + 0.3);
      });
    }
  }

  // Normaliser les scores (max 1.0)
  for (const [trait, score] of traitScores.entries()) {
    vector.set(trait, Math.min(1.0, score));
  }

  return vector;
}

/**
 * Parse un fichier CSV ESCO et retourne un tableau d'objets
 */
async function parseESCOCSV(filePath) {
  return new Promise((resolve, reject) => {
    const jobs = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        // Les fichiers ESCO ont généralement ces colonnes:
        // conceptUri, conceptType, preferredLabel, altLabels, description, etc.

        if (row.conceptType === 'Occupation' || !row.conceptType) {
          jobs.push({
            escoUri: row.conceptUri || row.URI || row.uri,
            title: row.preferredLabel || row.title || row.Title,
            description: row.description || row.Description || '',
            altLabels: row.altLabels || row.alternativeLabels || '',
            iscoGroup: row.iscoGroup || row.ISCOGroup || '',
            code: row.code || row.Code || ''
          });
        }
      })
      .on('end', () => {
        console.log(`✅ ${jobs.length} occupations trouvées dans le fichier CSV`);
        resolve(jobs);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

/**
 * Importe les métiers ESCO dans MongoDB
 */
async function importESCOJobs() {
  try {
    console.log('📚 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connecté à MongoDB\n');

    // Chemin vers le fichier CSV
    const csvPath = path.join(__dirname, '../data/occupations_fr.csv');

    if (!fs.existsSync(csvPath)) {
      console.error('❌ Fichier non trouvé:', csvPath);
      console.log('\n📥 INSTRUCTIONS:');
      console.log('1. Allez sur: https://esco.ec.europa.eu/en/use-esco/download');
      console.log('2. Sélectionnez:');
      console.log('   - Version: ESCO dataset v1.2.0');
      console.log('   - Langue: Français (fr)');
      console.log('   - Format: CSV');
      console.log('   - Contenu: Occupations');
      console.log('3. Téléchargez le fichier');
      console.log('4. Placez-le dans backend/data/occupations_fr.csv');
      console.log('5. Relancez ce script\n');
      process.exit(1);
    }

    console.log('📖 Lecture du fichier CSV ESCO...');
    const escoJobs = await parseESCOCSV(csvPath);

    if (escoJobs.length === 0) {
      console.log('⚠️ Aucune occupation trouvée dans le fichier CSV');
      process.exit(1);
    }

    console.log(`\n🔄 Traitement de ${escoJobs.length} occupations ESCO...`);

    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (const escoJob of escoJobs) {
      try {
        // Vérifier si le métier existe déjà (par URI ESCO)
        const existing = await Job.findOne({ escoUri: escoJob.escoUri });

        // Générer le vecteur de traits
        const traitVector = generateTraitVector(escoJob.title, escoJob.description);

        const jobData = {
          title: escoJob.title,
          description: escoJob.description || `Métier: ${escoJob.title}`,
          source: 'ESCO',
          escoUri: escoJob.escoUri,
          escoCode: escoJob.code,
          iscoGroup: escoJob.iscoGroup,
          altLabels: escoJob.altLabels ? escoJob.altLabels.split('\n') : [],
          traitVector: traitVector,
          importedAt: new Date()
        };

        if (existing) {
          // Mettre à jour si nécessaire
          await Job.updateOne({ _id: existing._id }, jobData);
          updated++;

          if (updated % 100 === 0) {
            console.log(`  📝 ${updated} métiers mis à jour...`);
          }
        } else {
          // Créer nouveau métier
          await Job.create(jobData);
          imported++;

          if (imported % 100 === 0) {
            console.log(`  ✨ ${imported} nouveaux métiers importés...`);
          }
        }

      } catch (error) {
        console.error(`❌ Erreur pour "${escoJob.title}":`, error.message);
        skipped++;
      }
    }

    console.log('\n📊 RÉSULTATS:');
    console.log(`  ✨ Nouveaux métiers importés: ${imported}`);
    console.log(`  📝 Métiers mis à jour: ${updated}`);
    console.log(`  ⏭️  Métiers ignorés (erreurs): ${skipped}`);
    console.log(`  📚 Total dans la base: ${await Job.countDocuments()}`);

    // Statistiques sur les vecteurs de traits
    // Compter les jobs ESCO qui devraient tous avoir des vecteurs de traits
    const escoJobsCount = await Job.countDocuments({ source: 'ESCO' });

    console.log(`  ✅ Métiers ESCO avec vecteurs de traits: ${escoJobsCount}`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Déconnexion de MongoDB');
  }
}

// Exécuter le script
importESCOJobs();
