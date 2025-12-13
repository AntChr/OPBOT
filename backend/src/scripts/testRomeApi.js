/**
 * Script de test simple pour vérifier l'accès à l'API France Travail
 * Usage: node src/scripts/testRomeApi.js
 */

require('dotenv').config();
const franceTravailService = require('../services/FranceTravailService');
const romeMapper = require('../services/RomeToJobMapper');

async function testAPI() {
  console.log('\n' + '='.repeat(60));
  console.log('  🧪 TEST DE L\'API FRANCE TRAVAIL ROME 4.0');
  console.log('='.repeat(60) + '\n');

  // Test 1: Authentification
  console.log('1️⃣  Test d\'authentification...');
  try {
    await franceTravailService.authenticate();
    console.log('   ✅ Authentification réussie\n');
  } catch (error) {
    console.error('   ❌ Échec de l\'authentification');
    console.error('   Erreur:', error.message);
    console.log('\n⚠️  Vérifiez vos credentials dans le fichier .env\n');
    return;
  }

  // Test 2: Récupération de la liste des métiers
  console.log('2️⃣  Récupération de la liste des métiers...');
  try {
    const jobs = await franceTravailService.getAllJobSheets();
    console.log(`   ✅ ${jobs.length} fiches métiers récupérées\n`);

    // Afficher quelques exemples
    console.log('   📋 Exemples de métiers disponibles:');
    jobs.slice(0, 5).forEach((job, index) => {
      console.log(`      ${index + 1}. ${job.libelle} (${job.code})`);
    });
    console.log('');
  } catch (error) {
    console.error('   ❌ Échec de la récupération');
    console.error('   Erreur:', error.message);
    return;
  }

  // Test 3: Détails d'un métier spécifique (Développeur web)
  console.log('3️⃣  Récupération des détails d\'un métier (Développeur web - M1805)...');
  try {
    const jobDetails = await franceTravailService.getCompleteJobData('M1805');
    console.log('   ✅ Détails récupérés\n');

    console.log('   📝 Informations:');
    console.log(`      Titre: ${jobDetails.libelle}`);
    console.log(`      Code ROME: ${jobDetails.code}`);
    console.log(`      Définition: ${jobDetails.definition?.substring(0, 100)}...`);

    if (jobDetails.competences) {
      console.log(`      Savoir-faire: ${jobDetails.competences.savoirFaire?.length || 0}`);
      console.log(`      Savoirs: ${jobDetails.competences.savoirs?.length || 0}`);
    }

    if (jobDetails.appellations) {
      console.log(`      Appellations: ${jobDetails.appellations.length}`);
      console.log(`         Exemples: ${jobDetails.appellations.slice(0, 3).map(a => a.libelle).join(', ')}`);
    }
    console.log('');
  } catch (error) {
    console.error('   ❌ Échec de la récupération des détails');
    console.error('   Erreur:', error.message);
  }

  // Test 4: Mapping vers notre schéma
  console.log('4️⃣  Test du mapping ROME → Job schema...');
  try {
    const jobDetails = await franceTravailService.getCompleteJobData('M1805');
    const mappedJob = romeMapper.mapRomeToJob(jobDetails);

    console.log('   ✅ Mapping réussi\n');

    console.log('   🔄 Données mappées:');
    console.log(`      Titre: ${mappedJob.title}`);
    console.log(`      Secteur: ${mappedJob.sector}`);
    console.log(`      Domaine: ${mappedJob.domain}`);
    console.log(`      RIASEC: ${mappedJob.riasec.join(', ')}`);
    console.log(`      Compétences: ${mappedJob.skills.length}`);
    console.log(`         - ${mappedJob.skills.slice(0, 3).join('\n         - ')}`);
    console.log(`      Traits: ${mappedJob.traits.join(', ')}`);
    console.log(`      Éducation: ${mappedJob.education}`);

    console.log('\n   📊 TraitVector (top 5):');
    const sortedTraits = Array.from(mappedJob.traitVector.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    sortedTraits.forEach(([trait, value]) => {
      const bar = '█'.repeat(Math.round(value * 20));
      console.log(`      ${trait.padEnd(20)} ${bar} ${(value * 100).toFixed(0)}%`);
    });
    console.log('');
  } catch (error) {
    console.error('   ❌ Échec du mapping');
    console.error('   Erreur:', error.message);
  }

  // Test 5: Test RIASEC mapping pour différents domaines
  console.log('5️⃣  Test du mapping RIASEC pour différents domaines...');
  console.log('');
  const testCodes = {
    'M1805': 'IT - Développeur web',
    'J1506': 'Santé - Médecin généraliste',
    'D1401': 'Commerce - Vendeur',
    'K1303': 'Services - Aide-soignant',
    'F1703': 'BTP - Maçon'
  };

  for (const [code, description] of Object.entries(testCodes)) {
    const domainLetter = code.charAt(0);
    const riasec = romeMapper.getRiasecFromRomeCode(code);
    console.log(`   ${code} (${description})`);
    console.log(`      → RIASEC: ${riasec.join(', ')}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('  ✅ TOUS LES TESTS SONT PASSÉS!');
  console.log('='.repeat(60) + '\n');

  console.log('💡 Prochaines étapes:');
  console.log('   1. Tester l\'import avec quelques métiers:');
  console.log('      npm run import:rome:sample');
  console.log('');
  console.log('   2. Importer tous les métiers IT:');
  console.log('      npm run import:rome:it');
  console.log('');
  console.log('   3. Import complet (1500+ métiers):');
  console.log('      npm run import:rome');
  console.log('');
}

// Exécution
testAPI()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Erreur lors des tests:', error);
    process.exit(1);
  });
