/**
 * Script de test Phase 2 - Enrichissement avec services spécialisés
 *
 * Usage:
 *   node src/scripts/testPhase2Enrichment.js [options]
 *
 * Options:
 *   --jobs=3           Enrichir 3 métiers aléatoires
 *   --sector=M         Enrichir un secteur spécifique
 *   --job=M1805        Enrichir un métier spécifique
 *   --force            Forcer le ré-enrichissement
 *   --test             Mode test (sans sauvegarder)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Job = require('../models/Job');

// Importer les nouveaux services Phase 2
const APECService = require('../services/APECService');
const LinkedInService = require('../services/LinkedInSkillsService');
const RNCPService = require('../services/RNCPService');
const AutoEnrichmentScheduler = require('../services/AutoEnrichmentScheduler');
const scraperService = require('../services/WebScraperService');
const enrichmentService = require('../services/JobEnrichmentService');

// Parser les arguments
const args = process.argv.slice(2);
const options = {
  jobCount: parseInt(args.find(a => a.startsWith('--jobs='))?.split('=')[1] || '3'),
  sector: args.find(a => a.startsWith('--sector='))?.split('=')[1],
  jobCode: args.find(a => a.startsWith('--job='))?.split('=')[1],
  force: args.includes('--force'),
  testMode: args.includes('--test')
};

class Phase2Tester {
  async run() {
    try {
      // Connexion MongoDB
      await mongoose.connect(process.env.MONGO_URI);
      console.log('✅ MongoDB connecté\n');

      // 1. Tester APEC Service
      console.log('═'.repeat(70));
      console.log('🧪 TEST 1: APEC Service');
      console.log('═'.repeat(70));
      await this.testAPECService();

      // 2. Tester LinkedIn Service
      console.log('\n═'.repeat(70));
      console.log('🧪 TEST 2: LinkedIn Skills Service');
      console.log('═'.repeat(70));
      await this.testLinkedInService();

      // 3. Tester RNCP Service
      console.log('\n═'.repeat(70));
      console.log('🧪 TEST 3: RNCP Service');
      console.log('═'.repeat(70));
      await this.testRNCPService();

      // 4. Tester enrichissement complet
      console.log('\n═'.repeat(70));
      console.log('🧪 TEST 4: Enrichissement Complet');
      console.log('═'.repeat(70));
      await this.testFullEnrichment();

      // 5. Tester scheduler
      console.log('\n═'.repeat(70));
      console.log('🧪 TEST 5: Auto Enrichment Scheduler');
      console.log('═'.repeat(70));
      await this.testScheduler();

      console.log('\n✅ Tous les tests sont terminés!\n');

    } catch (error) {
      console.error('❌ Erreur:', error.message);
    } finally {
      await mongoose.disconnect();
    }
  }

  /**
   * Test APEC Service
   */
  async testAPECService() {
    try {
      const testJob = 'Développeur web';

      console.log(`\n1️⃣  Recherche d'offres APEC pour: ${testJob}`);
      const offers = await APECService.searchJobOffers(testJob);
      console.log(`   ✅ ${offers.offerCount} offres trouvées`);
      console.log(`   Salaire moyen: ${offers.salaryData?.junior || 'N/A'}`);
      console.log(`   Qualité: ${Math.round(offers.quality * 100)}%`);

      console.log(`\n2️⃣  Récupération profil métier`);
      const profile = await APECService.getJobProfile(testJob);
      console.log(`   ✅ Compétences requises: ${profile?.requiredSkills?.length || 0}`);

      console.log(`\n3️⃣  Tendances du marché`);
      const trends = await APECService.getMarketTrends('Informatique');
      console.log(`   ✅ Données de tendances récupérées`);

      console.log(`\n4️⃣  Données salariales`);
      const salaries = await APECService.getSalaryData(testJob);
      console.log(`   ✅ Fourchettes: Junior ${salaries.junior || 'N/A'}, Senior ${salaries.senior || 'N/A'}`);

    } catch (error) {
      console.error(`   ❌ Erreur APEC: ${error.message}`);
    }
  }

  /**
   * Test LinkedIn Service
   */
  async testLinkedInService() {
    try {
      const testJob = 'Développeur web';
      const sector = 'Informatique';

      console.log(`\n1️⃣  Compétences tendances pour: ${testJob}`);
      const skills = await LinkedInService.getTrendingSkillsForJob(testJob, sector);
      console.log(`   ✅ ${skills.skills?.length || 0} compétences identifiées`);
      console.log(`   Compétences essentielles: ${skills.essentialSkills?.join(', ') || 'N/A'}`);
      console.log(`   Score de demande: ${Math.round(skills.demandScore * 100)}%`);

      console.log(`\n2️⃣  Compétences émergentes par secteur`);
      const emerging = LinkedInService.getEmergingSkillsBySector(sector);
      console.log(`   ✅ ${emerging.length} catégories émergentes trouvées`);
      emerging.slice(0, 3).forEach(cat => {
        console.log(`      - ${cat.category}: ${cat.growth}% de croissance`);
      });

      console.log(`\n3️⃣  Score de tendance pour une skill`);
      const score = LinkedInService.getSkillTrendScore('Python');
      console.log(`   ✅ Python: ${Math.round(score * 100)}% tendance`);

      console.log(`\n4️⃣  Endossements de compétence`);
      const endorsements = await LinkedInService.getSkillEndorsements('Machine Learning');
      console.log(`   ✅ Compétence: ${endorsements.skill}`);
      console.log(`   Croissance: ${endorsements.growth}`);
      console.log(`   Top entreprises: ${endorsements.companies?.join(', ')}`);

    } catch (error) {
      console.error(`   ❌ Erreur LinkedIn: ${error.message}`);
    }
  }

  /**
   * Test RNCP Service
   */
  async testRNCPService() {
    try {
      const testJob = 'Développeur web';

      console.log(`\n1️⃣  Certifications RNCP pour: ${testJob}`);
      const certs = await RNCPService.getCertificationsForJob(testJob);
      console.log(`   ✅ ${certs.certifications?.length || 0} certifications trouvées`);
      certs.certifications?.slice(0, 2).forEach(cert => {
        console.log(`      - ${cert.title} (Niveau ${cert.level})`);
      });

      console.log(`\n2️⃣  Compétences requises par niveau`);
      const comp = RNCPService.getCompetenciesForLevel(6);
      console.log(`   ✅ Niveau: ${comp.levelName}`);
      console.log(`   Compétences: ${comp.coreCompetencies?.join(', ')}`);

      console.log(`\n3️⃣  Parcours de formation possibles`);
      const paths = RNCPService.getLearningPaths(testJob, 6);
      console.log(`   ✅ ${paths.length} parcours trouvés`);
      paths.slice(0, 2).forEach(path => {
        console.log(`      - ${path.name}: ${path.totalDuration}`);
      });

    } catch (error) {
      console.error(`   ❌ Erreur RNCP: ${error.message}`);
    }
  }

  /**
   * Test enrichissement complet
   */
  async testFullEnrichment() {
    try {
      // Récupérer un métier de test
      let testJob;

      if (options.jobCode) {
        testJob = await Job.findOne({ romeCode: options.jobCode });
      } else if (options.sector) {
        testJob = await Job.findOne({ sector: options.sector });
      } else {
        testJob = await Job.findOne().skip(Math.floor(Math.random() * 100));
      }

      if (!testJob) {
        console.log('   ❌ Aucun métier trouvé pour le test');
        return;
      }

      console.log(`\n📌 Enrichissement: ${testJob.title} (${testJob.romeCode})`);

      // Collecter les sources
      console.log(`\n1️⃣  Collecte des sources...`);
      const sources = await scraperService.gatherAllSources({
        title: testJob.title,
        romeCode: testJob.romeCode,
        sector: testJob.sector
      });

      // Ajouter les sources Phase 2
      const apecData = await APECService.searchJobOffers(testJob.title, testJob.romeCode);
      if (apecData?.quality > 0.3) sources.push(apecData);

      const linkedInData = await LinkedInService.getTrendingSkillsForJob(testJob.title, testJob.sector);
      if (linkedInData?.quality > 0.3) sources.push(linkedInData);

      const rncpData = await RNCPService.getCertificationsForJob(testJob.title);
      if (rncpData?.certifications?.length > 0) sources.push(rncpData);

      console.log(`   ✅ ${sources.length} sources collectées`);

      // Enrichir avec Claude
      console.log(`\n2️⃣  Analyse avec Claude...`);
      const enrichedData = await enrichmentService.analyzeJobWithLLM(
        testJob.toObject(),
        sources.slice(0, 5)
      );

      console.log(`   ✅ Données enrichies:`);
      console.log(`      - Titre: ${enrichedData.title}`);
      console.log(`      - Compétences: ${enrichedData.skills?.length || 0}`);
      if (enrichedData.skills?.length > 0) {
        console.log(`        ${enrichedData.skills.slice(0, 3).join(', ')}...`);
      }
      console.log(`      - Salaires: ${enrichedData.salary?.junior || 'N/A'}`);
      console.log(`      - RIASEC: ${enrichedData.riasec?.join(', ') || 'N/A'}`);
      console.log(`      - Qualité: ${Math.round(enrichedData.dataQuality * 100)}%`);

      // Fusionner et sauvegarder
      if (!options.testMode) {
        console.log(`\n3️⃣  Sauvegarde en base...`);
        const merged = enrichmentService.mergeJobData(testJob, enrichedData);
        await Job.updateOne({ _id: testJob._id }, merged);
        console.log(`   ✅ Métier sauvegardé`);
      } else {
        console.log(`\n3️⃣  Mode test: données non sauvegardées`);
      }

    } catch (error) {
      console.error(`   ❌ Erreur enrichissement: ${error.message}`);
    }
  }

  /**
   * Test scheduler
   */
  async testScheduler() {
    try {
      console.log(`\n1️⃣  Détection de données obsolètes...`);
      const staleData = await AutoEnrichmentScheduler.detectStaleData(30);
      console.log(`   ✅ Données obsolètes: ${staleData.totalStale}`);
      console.log(`      - Jamais enrichis: ${staleData.byCategory.neverEnriched}`);
      console.log(`      - Faible qualité: ${staleData.byCategory.lowQuality}`);
      console.log(`      - Compétences manquantes: ${staleData.byCategory.missingSkills}`);

      console.log(`\n2️⃣  Préparation enrichissement...`);
      const jobsToEnrich = await AutoEnrichmentScheduler.getJobsNeedingEnrichment({
        limit: options.jobCount,
        sector: options.sector,
        force: options.force
      });
      console.log(`   ✅ ${jobsToEnrich.length} métier(s) prêt(s) pour enrichissement`);

      if (jobsToEnrich.length > 0) {
        console.log(`\n3️⃣  Métiers à enrichir:`);
        jobsToEnrich.slice(0, 5).forEach(job => {
          const days = job.enrichedAt
            ? Math.floor((Date.now() - job.enrichedAt) / (1000 * 60 * 60 * 24))
            : null;
          console.log(`      - ${job.title} (${days ? `${days}j ago` : 'jamais enrichi'})`);
        });
      }

    } catch (error) {
      console.error(`   ❌ Erreur scheduler: ${error.message}`);
    }
  }
}

// Lancer les tests
const tester = new Phase2Tester();
tester.run();
