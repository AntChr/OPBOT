/**
 * Script d'enrichissement intelligent des métiers
 *
 * Utilise des recherches web et l'IA pour compléter automatiquement
 * les informations manquantes sur chaque métier :
 * - Salaire moyen (junior, mid, senior)
 * - Niveau d'études requis
 * - Compétences clés
 * - Secteur d'activité
 * - Taux d'employabilité
 * - Environnement de travail
 * - Perspectives d'évolution
 * - Code ROME
 *
 * Usage:
 *   node scripts/enrichJobs.js [--limit N] [--source ESCO|onet] [--force]
 *
 * Options:
 *   --limit N       Enrichir seulement N métiers (pour tester)
 *   --source X      Enrichir uniquement les métiers de source X
 *   --force         Ré-enrichir même les métiers déjà enrichis
 *   --delay MS      Délai entre chaque enrichissement (défaut: 2000ms)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Job = require('../src/models/Job');

// Parse les arguments de ligne de commande
const args = process.argv.slice(2);
const getArg = (name) => {
  const index = args.indexOf(name);
  return index !== -1 ? args[index + 1] : null;
};
const hasFlag = (name) => args.includes(name);

const LIMIT = getArg('--limit') ? parseInt(getArg('--limit')) : null;
const SOURCE_FILTER = getArg('--source');
const FORCE = hasFlag('--force');
const DELAY = getArg('--delay') ? parseInt(getArg('--delay')) : 2000;

/**
 * Recherche d'informations sur un métier via web search
 * Simule une recherche (à remplacer par une vraie API de recherche)
 */
async function searchJobInfo(jobTitle) {
  console.log(`  🔍 Recherche d'infos pour: ${jobTitle}`);

  // TODO: Intégrer une vraie API de recherche web
  // Pour l'instant, on retourne des données simulées basées sur des patterns

  const info = {
    sources: [],
    rawData: {}
  };

  // Simuler la recherche de différentes sources
  const queries = [
    `${jobTitle} salaire moyen france 2024`,
    `${jobTitle} formation diplome requis`,
    `${jobTitle} secteur activité emploi`,
    `${jobTitle} compétences requises`
  ];

  // Ici, on pourrait utiliser une vraie API de recherche web
  // Exemple: Google Custom Search API, Bing Search API, etc.

  return info;
}

/**
 * Analyse intelligente avec LLM pour structurer les données
 */
async function analyzeJobWithAI(jobTitle, description, searchResults) {
  console.log(`  🤖 Analyse IA pour: ${jobTitle}`);

  // Construire un prompt pour extraire des informations structurées
  const prompt = `
Tu es un expert en orientation professionnelle et en analyse de métiers.

Métier: ${jobTitle}
Description: ${description}

Analyse ce métier et fournis les informations suivantes au format JSON:

{
  "education": "Niveau d'études requis (CAP, Bac, Bac+2, Bac+3, Bac+5, etc.)",
  "salary": {
    "junior": "Salaire junior annuel brut en France (format: 25000-30000)",
    "mid": "Salaire confirmé annuel brut en France (format: 30000-40000)",
    "senior": "Salaire senior annuel brut en France (format: 40000-55000)"
  },
  "sector": "Secteur d'activité principal (ex: Agriculture, Artisanat, Commerce, Santé, etc.)",
  "employability": "Niveau d'employabilité (Fort, Moyen, Faible)",
  "environment": "Environnement de travail (ex: Bureau, Extérieur, Atelier, Magasin, etc.)",
  "skills": ["Compétence 1", "Compétence 2", "Compétence 3"],
  "careerPath": ["Évolution 1", "Évolution 2"],
  "romeCode": "Code ROME si connu (ex: A1234), sinon null"
}

Réponds uniquement avec le JSON, sans texte additionnel.
Si une information est incertaine, donne ta meilleure estimation basée sur le titre et la description.
`;

  // TODO: Intégrer une vraie API LLM
  // Options: OpenAI, Anthropic Claude, Mistral, etc.

  // Pour l'instant, on utilise des heuristiques basiques
  return analyzeJobWithHeuristics(jobTitle, description);
}

/**
 * Analyse heuristique basique (en attendant l'intégration d'une vraie API LLM)
 */
function analyzeJobWithHeuristics(jobTitle, description) {
  const titleLower = jobTitle.toLowerCase();
  const text = `${titleLower} ${description.toLowerCase()}`;

  const enrichedData = {
    education: determineEducationLevel(text),
    salary: determineSalaryRange(text),
    sector: determineSector(text),
    employability: 'Moyen', // Par défaut
    environment: determineEnvironment(text),
    skills: extractSkills(text),
    careerPath: [],
    romeCode: null
  };

  return enrichedData;
}

/**
 * Détermine le niveau d'études requis
 */
function determineEducationLevel(text) {
  if (text.includes('ingénieur') || text.includes('chercheur') || text.includes('docteur')) {
    return 'Bac+5 ou plus';
  }
  if (text.includes('technicien') || text.includes('gestionnaire')) {
    return 'Bac+2/Bac+3';
  }
  if (text.includes('assistant') || text.includes('vendeur') || text.includes('commercial')) {
    return 'Bac/Bac+2';
  }
  if (text.includes('ouvrier') || text.includes('artisan') || text.includes('conducteur')) {
    return 'CAP/BEP/Bac';
  }
  return 'Bac+2/Bac+3'; // Par défaut
}

/**
 * Détermine les fourchettes de salaire
 */
function determineSalaryRange(text) {
  // Heuristiques basiques basées sur les mots-clés
  let juniorMin = 22000, juniorMax = 28000;
  let midMin = 28000, midMax = 38000;
  let seniorMin = 38000, seniorMax = 55000;

  // Métiers techniques/ingénieurs
  if (text.includes('ingénieur') || text.includes('développeur') || text.includes('architect')) {
    juniorMin = 35000; juniorMax = 42000;
    midMin = 45000; midMax = 60000;
    seniorMin = 60000; seniorMax = 85000;
  }
  // Métiers de direction/management
  else if (text.includes('directeur') || text.includes('manager') || text.includes('responsable')) {
    juniorMin = 35000; juniorMax = 45000;
    midMin = 50000; midMax = 70000;
    seniorMin = 70000; seniorMax = 120000;
  }
  // Métiers de santé
  else if (text.includes('médecin') || text.includes('chirurgien')) {
    juniorMin = 40000; juniorMax = 60000;
    midMin = 60000; midMax = 90000;
    seniorMin = 90000; seniorMax = 150000;
  }
  // Métiers artistiques/créatifs
  else if (text.includes('artist') || text.includes('designer') || text.includes('créat')) {
    juniorMin = 20000; juniorMax = 28000;
    midMin = 28000; midMax = 40000;
    seniorMin = 40000; seniorMax = 60000;
  }
  // Métiers du service/commerce
  else if (text.includes('vente') || text.includes('commercial') || text.includes('vendeur')) {
    juniorMin = 20000; juniorMax = 25000;
    midMin = 25000; midMax = 35000;
    seniorMin = 35000; seniorMax = 50000;
  }

  return {
    junior: `${juniorMin}-${juniorMax}`,
    mid: `${midMin}-${midMax}`,
    senior: `${seniorMin}-${seniorMax}`
  };
}

/**
 * Détermine le secteur d'activité
 */
function determineSector(text) {
  const sectors = {
    'Agriculture': ['agricult', 'élevage', 'culture', 'farm', 'jardin', 'horti', 'paysag'],
    'Artisanat': ['artisan', 'métier art', 'craft', 'menuisier', 'charpentier', 'plombier'],
    'Arts et spectacles': ['artist', 'music', 'acteur', 'danse', 'théâtre', 'cinéma'],
    'Banque et assurance': ['banque', 'assurance', 'financ', 'crédit'],
    'Commerce et distribution': ['commerce', 'vente', 'retail', 'magasin', 'vendeur'],
    'Communication et information': ['journal', 'média', 'communication', 'publicité', 'market'],
    'Construction et BTP': ['construct', 'bâtiment', 'btp', 'génie civil'],
    'Éducation et formation': ['enseign', 'professeur', 'formateur', 'éducat', 'teach'],
    'Hôtellerie et restauration': ['hôtel', 'restaurant', 'cuisine', 'chef', 'serveur'],
    'Industrie': ['industrie', 'production', 'manufactur', 'usine'],
    'Informatique et télécoms': ['informat', 'développeur', 'software', 'réseau', 'télécom'],
    'Santé et social': ['santé', 'médical', 'infirm', 'social', 'care', 'soin'],
    'Services aux entreprises': ['conseil', 'audit', 'ressources humaines', 'comptab'],
    'Transport et logistique': ['transport', 'logistique', 'conduc', 'livr', 'driver']
  };

  for (const [sector, keywords] of Object.entries(sectors)) {
    if (keywords.some(kw => text.includes(kw))) {
      return sector;
    }
  }

  return 'Services divers'; // Par défaut
}

/**
 * Détermine l'environnement de travail
 */
function determineEnvironment(text) {
  if (text.includes('jardin') || text.includes('extérieur') || text.includes('chantier') || text.includes('agricult')) {
    return 'Extérieur';
  }
  if (text.includes('atelier') || text.includes('usine') || text.includes('manufactur')) {
    return 'Atelier/Usine';
  }
  if (text.includes('magasin') || text.includes('boutique') || text.includes('commerce')) {
    return 'Magasin';
  }
  if (text.includes('laboratoire') || text.includes('recherche')) {
    return 'Laboratoire';
  }
  if (text.includes('hôpital') || text.includes('clinique')) {
    return 'Milieu médical';
  }
  return 'Bureau'; // Par défaut
}

/**
 * Extrait les compétences clés
 */
function extractSkills(text) {
  const skills = [];

  const skillKeywords = {
    'Gestion de projet': ['projet', 'planif', 'organis'],
    'Communication': ['commun', 'relation'],
    'Analyse de données': ['analy', 'data', 'statistic'],
    'Programmation': ['program', 'code', 'développ'],
    'Design': ['design', 'créat', 'graphi'],
    'Vente': ['vente', 'commercial', 'négociation'],
    'Management': ['manage', 'équipe', 'encadrement'],
    'Technique': ['technique', 'technolog', 'engineer']
  };

  for (const [skill, keywords] of Object.entries(skillKeywords)) {
    if (keywords.some(kw => text.includes(kw))) {
      skills.push(skill);
    }
  }

  return skills.length > 0 ? skills : ['Polyvalence', 'Adaptabilité'];
}

/**
 * Enrichit un métier avec des données complètes
 */
async function enrichJob(job) {
  try {
    console.log(`\n📝 Enrichissement: ${job.title}`);

    // 1. Rechercher des infos sur le web (pour une version future)
    // const searchResults = await searchJobInfo(job.title);

    // 2. Analyser avec IA (pour l'instant heuristique)
    const enrichedData = await analyzeJobWithAI(
      job.title,
      job.description || '',
      {}
    );

    // 3. Mettre à jour le job
    job.education = enrichedData.education;
    job.salary = enrichedData.salary;
    job.sector = enrichedData.sector;
    job.employability = enrichedData.employability;
    job.work_environment = enrichedData.environment;
    job.skills = enrichedData.skills;
    job.career_path = enrichedData.careerPath;
    job.romeCode = enrichedData.romeCode;
    job.enrichedAt = new Date();

    await job.save();

    console.log(`  ✅ Enrichi: ${job.title}`);
    console.log(`     Secteur: ${job.sector}`);
    console.log(`     Éducation: ${job.education}`);
    console.log(`     Salaire junior: ${job.salary?.junior || 'N/A'}`);
    console.log(`     Environnement: ${job.work_environment}`);

    return true;
  } catch (error) {
    console.error(`  ❌ Erreur enrichissement ${job.title}:`, error.message);
    return false;
  }
}

/**
 * Fonction principale d'enrichissement
 */
async function enrichAllJobs() {
  try {
    console.log('🧠 ENRICHISSEMENT INTELLIGENT DES MÉTIERS');
    console.log('==========================================\n');

    console.log('📊 Configuration:');
    console.log(`  Limite: ${LIMIT || 'Aucune'}`);
    console.log(`  Source: ${SOURCE_FILTER || 'Toutes'}`);
    console.log(`  Force: ${FORCE ? 'Oui' : 'Non'}`);
    console.log(`  Délai: ${DELAY}ms entre chaque métier\n`);

    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connecté à MongoDB\n');

    // Construire la requête
    const query = {};
    if (SOURCE_FILTER) {
      query.source = SOURCE_FILTER;
    }
    if (!FORCE) {
      // Ne traiter que les métiers non enrichis
      query.enrichedAt = { $exists: false };
    }

    const totalJobs = await Job.countDocuments(query);
    console.log(`📚 ${totalJobs} métiers à enrichir`);

    if (totalJobs === 0) {
      console.log('\n✨ Aucun métier à enrichir !');
      return;
    }

    const jobsToProcess = LIMIT ? Math.min(LIMIT, totalJobs) : totalJobs;
    console.log(`🎯 Traitement de ${jobsToProcess} métiers\n`);

    // Récupérer les métiers par batch
    const jobs = await Job.find(query).limit(LIMIT || 0);

    let enriched = 0;
    let failed = 0;

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];

      console.log(`\n[${i + 1}/${jobs.length}]`);

      const success = await enrichJob(job);

      if (success) {
        enriched++;
      } else {
        failed++;
      }

      // Délai entre chaque enrichissement pour éviter de surcharger les APIs
      if (i < jobs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, DELAY));
      }
    }

    console.log('\n\n📊 RÉSULTATS:');
    console.log(`  ✅ Métiers enrichis: ${enriched}`);
    console.log(`  ❌ Échecs: ${failed}`);
    console.log(`  📚 Total dans la base: ${await Job.countDocuments()}`);
    console.log(`  🎓 Métiers enrichis totaux: ${await Job.countDocuments({ enrichedAt: { $exists: true } })}`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Déconnexion de MongoDB');
  }
}

// Exécuter le script
enrichAllJobs();
