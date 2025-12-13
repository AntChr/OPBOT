#!/usr/bin/env node

const mongoose = require('mongoose');
const CareerApiService = require('../src/services/careerApiService');
const Job = require('../src/models/Job');
require('dotenv').config();

class ONetBulkImporter {
  constructor() {
    this.careerApiService = new CareerApiService();
    this.importedCount = 0;
    this.skippedCount = 0;
    this.errorCount = 0;
  }

  async connectDB() {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log('✅ Connexion MongoDB établie');
    } catch (error) {
      console.error('❌ Erreur connexion MongoDB:', error);
      process.exit(1);
    }
  }

  async importAllONetJobs(options = {}) {
    const {
      limit = 1000,
      batchSize = 50,
      clearExisting = false,
      source = 'onet'
    } = options;

    console.log(`🚀 Début de l'import O*NET (limite: ${limit}, batch: ${batchSize})`);

    if (clearExisting) {
      console.log('🗑️ Suppression des métiers O*NET existants...');
      await Job.deleteMany({ source: 'onet' });
    }

    try {
      // Récupérer toutes les occupations O*NET disponibles
      console.log('📋 Récupération de la liste des métiers O*NET...');
      const allOccupations = await this.careerApiService.getAllONetOccupations();

      if (!allOccupations || allOccupations.length === 0) {
        console.log('⚠️ Aucun métier trouvé dans O*NET');
        return;
      }

      console.log(`📊 ${allOccupations.length} métiers trouvés dans O*NET`);

      // Traitement par batch pour éviter de surcharger l'API
      for (let i = 0; i < allOccupations.length; i += batchSize) {
        const batch = allOccupations.slice(i, i + batchSize);
        console.log(`\n🔄 Traitement du batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(allOccupations.length/batchSize)} (${batch.length} métiers)`);

        await this.processBatch(batch);

        // Pause entre les batches pour respecter les limites de l'API
        if (i + batchSize < allOccupations.length) {
          console.log('⏸️ Pause de 2 secondes...');
          await this.sleep(2000);
        }
      }

      this.printSummary();

    } catch (error) {
      console.error('❌ Erreur lors de l\'import:', error);
    }
  }

  async processBatch(occupations) {
    const jobs = [];

    for (const occupation of occupations) {
      try {
        // Vérifier si le métier existe déjà
        const existingJob = await Job.findOne({
          externalId: occupation.code,
          source: 'onet'
        });

        if (existingJob) {
          this.skippedCount++;
          console.log(`⏭️ Métier déjà existant: ${occupation.title} (${occupation.code})`);
          continue;
        }

        // Récupérer les détails du métier
        console.log(`📖 Récupération détails: ${occupation.title} (${occupation.code})`);
        const details = await this.careerApiService.getONetJobDetails(occupation.code);

        if (!details) {
          console.log(`⚠️ Aucun détail disponible pour: ${occupation.title}`);
          this.errorCount++;
          continue;
        }

        // Mapper vers notre format
        const mappedJob = this.mapONetJob(occupation, details);
        jobs.push(mappedJob);

        console.log(`✅ Métier préparé: ${mappedJob.title}`);

      } catch (error) {
        console.error(`❌ Erreur pour ${occupation.title}:`, error.message);
        this.errorCount++;
      }
    }

    // Insertion en batch
    if (jobs.length > 0) {
      try {
        await Job.insertMany(jobs, { ordered: false });
        this.importedCount += jobs.length;
        console.log(`💾 ${jobs.length} métiers insérés en base`);
      } catch (error) {
        console.error('❌ Erreur insertion batch:', error.message);
        // Tentative d'insertion individuelle pour identifier les problèmes
        await this.insertIndividually(jobs);
      }
    }
  }

  async insertIndividually(jobs) {
    for (const job of jobs) {
      try {
        await Job.create(job);
        this.importedCount++;
        console.log(`✅ Insertion individuelle: ${job.title}`);
      } catch (error) {
        console.error(`❌ Échec insertion: ${job.title} -`, error.message);
        this.errorCount++;
      }
    }
  }

  mapONetJob(occupation, details) {
    return {
      title: occupation.title,
      description: details.description || `Métier: ${occupation.title}. Détails supplémentaires disponibles via O*NET.`,
      skills: this.extractSkills(details),
      traits: [], // Legacy, maintenant on utilise traitVector
      traitVector: this.careerApiService.mapONetToTraitVector(details),
      education: this.extractEducation(details),
      salary: this.extractSalary(details),
      work_environment: this.extractWorkEnvironment(details),
      career_path: this.extractCareerPath(details),
      riasec: this.extractRiasec(details),
      tags: this.extractTags(occupation, details),
      source: 'onet',
      externalId: occupation.code,
      importedAt: new Date()
    };
  }

  extractSkills(details) {
    const skills = [];

    // Technologies
    if (details.technology_skills && Array.isArray(details.technology_skills)) {
      skills.push(...details.technology_skills.map(tech => tech.example).filter(Boolean));
    }

    // Compétences techniques
    if (details.skills && Array.isArray(details.skills)) {
      skills.push(...details.skills.map(skill => skill.element_name).filter(Boolean));
    }

    // Outils et équipements
    if (details.tools_used && Array.isArray(details.tools_used)) {
      skills.push(...details.tools_used.map(tool => tool.example).filter(Boolean));
    }

    return [...new Set(skills)].slice(0, 15); // Limiter à 15 compétences uniques
  }

  extractEducation(details) {
    if (details.education && details.education.levels && details.education.levels.length > 0) {
      return details.education.levels[0].name;
    }

    if (details.job_zone && details.job_zone.education) {
      return details.job_zone.education;
    }

    return 'Formation variable selon l\'employeur';
  }

  extractSalary(details) {
    // O*NET ne fournit pas toujours des données salariales détaillées
    if (details.wages) {
      return {
        junior: details.wages.entry_level || 'Variable selon région',
        mid: details.wages.median || 'Évolution avec expérience',
        senior: details.wages.experienced || 'Postes de direction disponibles'
      };
    }

    return {
      junior: 'Données salariales non disponibles',
      mid: 'Consulter O*NET pour plus de détails',
      senior: 'Évolution selon expérience et région'
    };
  }

  extractWorkEnvironment(details) {
    const environments = [];

    if (details.work_context && details.work_context.physical) {
      environments.push(details.work_context.physical);
    }

    if (details.work_context && details.work_context.interpersonal) {
      environments.push(details.work_context.interpersonal);
    }

    return environments.join('. ') || 'Environnement de travail variable';
  }

  extractCareerPath(details) {
    if (details.related_occupations && Array.isArray(details.related_occupations)) {
      return details.related_occupations.map(occ => occ.title).slice(0, 8);
    }
    return [];
  }

  extractRiasec(details) {
    if (details.interests && Array.isArray(details.interests)) {
      return details.interests.map(interest => interest.element_name.charAt(0));
    }
    return [];
  }

  extractTags(occupation, details) {
    const tags = ['O*NET'];

    // Ajouter la catégorie principale
    if (occupation.career_cluster) {
      tags.push(occupation.career_cluster);
    }

    // Ajouter les intérêts RIASEC
    if (details.interests && Array.isArray(details.interests)) {
      tags.push(...details.interests.map(i => i.element_name));
    }

    // Ajouter le niveau d'éducation
    if (details.job_zone) {
      tags.push(`Zone-${details.job_zone.title}`);
    }

    return [...new Set(tags)];
  }

  printSummary() {
    console.log('\n📊 RÉSUMÉ DE L\'IMPORT');
    console.log('═'.repeat(50));
    console.log(`✅ Métiers importés: ${this.importedCount}`);
    console.log(`⏭️ Métiers ignorés: ${this.skippedCount}`);
    console.log(`❌ Erreurs: ${this.errorCount}`);
    console.log(`📈 Total traité: ${this.importedCount + this.skippedCount + this.errorCount}`);
    console.log('═'.repeat(50));
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async disconnect() {
    await mongoose.disconnect();
    console.log('👋 Déconnexion MongoDB');
  }
}

// Script principal
async function main() {
  const importer = new ONetBulkImporter();

  try {
    await importer.connectDB();

    // Options d'import
    const options = {
      limit: 950,           // Maximum de métiers à traiter
      batchSize: 25,        // Taille des batches (pour éviter de surcharger l'API)
      clearExisting: true,  // Supprimer les métiers O*NET existants pour réimporter proprement
      source: 'onet'
    };

    console.log('🎯 Configuration:', options);
    console.log('\n⚠️ Vérifiez que vos identifiants O*NET sont configurés dans .env');
    console.log('ONET_USERNAME et ONET_PASSWORD\n');

    await importer.importAllONetJobs(options);

  } catch (error) {
    console.error('💥 Erreur fatale:', error);
  } finally {
    await importer.disconnect();
  }
}

// Gestion des arguments de ligne de commande
if (require.main === module) {
  main().catch(console.error);
}

module.exports = ONetBulkImporter;