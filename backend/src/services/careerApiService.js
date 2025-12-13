const axios = require('axios');
const { TRAIT_DIMENSIONS } = require('../models/Job');

class CareerApiService {
  constructor() {
    // Configuration des APIs
    this.onetBaseUrl = 'https://services.onetcenter.org/ws';
    this.romeBaseUrl = 'https://francetravail.io/data/api';
    this.traitifyApiKey = process.env.TRAITIFY_API_KEY; // À configurer
  }

  // ===============================
  // O*NET Integration
  // ===============================

  async getONetOccupations(limit = 50) {
    try {
      const response = await axios.get(`${this.onetBaseUrl}/mnm/careers/`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(process.env.ONET_USERNAME + ':' + process.env.ONET_PASSWORD).toString('base64')}`,
          'User-Agent': 'career-orientation-app',
        }
      });

      return response.data.career.slice(0, limit);
    } catch (error) {
      console.error('Erreur O*NET:', error);
      return [];
    }
  }

  // Nouvelle méthode pour récupérer TOUS les métiers O*NET avec pagination
  async getAllONetOccupations() {
    const allOccupations = [];
    let start = 1;
    const pageSize = 100; // Récupérer 100 métiers par page
    let hasMore = true;

    try {
      while (hasMore) {
        const end = start + pageSize - 1;
        console.log(`📥 Récupération métiers ${start}-${end}...`);

        const response = await axios.get(`${this.onetBaseUrl}/online/occupations/?start=${start}&end=${end}`, {
          headers: {
            'Authorization': `Basic ${Buffer.from(process.env.ONET_USERNAME + ':' + process.env.ONET_PASSWORD).toString('base64')}`,
            'User-Agent': 'career-orientation-app',
          }
        });

        const occupations = response.data.occupation || [];
        allOccupations.push(...occupations);

        const total = response.data.total || 0;
        console.log(`   Récupérés: ${allOccupations.length}/${total}`);

        // Vérifier s'il y a plus de pages
        if (allOccupations.length >= total || occupations.length === 0) {
          hasMore = false;
        } else {
          start = end + 1;
          // Pause pour respecter les limites de l'API
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      console.log(`✅ Total récupéré: ${allOccupations.length} métiers`);
      return allOccupations;

    } catch (error) {
      console.error('Erreur O*NET getAllOccupations:', error.message);
      return allOccupations; // Retourner ce qui a été récupéré jusqu'ici
    }
  }

  async getONetJobDetails(onetCode) {
    try {
      const response = await axios.get(`${this.onetBaseUrl}/online/occupations/${onetCode}/details/`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(process.env.ONET_USERNAME + ':' + process.env.ONET_PASSWORD).toString('base64')}`,
        }
      });

      return response.data;
    } catch (error) {
      console.error('Erreur détails O*NET:', error);
      return null;
    }
  }

  // ===============================
  // ROME 4.0 Integration
  // ===============================

  async getRomeJobs() {
    try {
      const response = await axios.get(`${this.romeBaseUrl}/rome-4-0-fiches-metiers/v1/metiers`);
      return response.data;
    } catch (error) {
      console.error('Erreur ROME:', error);
      return [];
    }
  }

  async getRomeJobDetails(romeCode) {
    try {
      const response = await axios.get(`${this.romeBaseUrl}/rome-4-0-fiches-metiers/v1/metiers/${romeCode}`);
      return response.data;
    } catch (error) {
      console.error('Erreur détails ROME:', error);
      return null;
    }
  }

  async getRomeSkills() {
    try {
      const response = await axios.get(`${this.romeBaseUrl}/rome-4-0/v1/competences`);
      return response.data;
    } catch (error) {
      console.error('Erreur compétences ROME:', error);
      return [];
    }
  }

  // ===============================
  // Mapping vers notre système vectoriel
  // ===============================

  mapONetToTraitVector(onetJobData) {
    const vector = new Map();
    TRAIT_DIMENSIONS.forEach(trait => vector.set(trait, 0));

    // Mapping basé sur les intérêts O*NET vers nos traits
    if (onetJobData.interests && Array.isArray(onetJobData.interests)) {
      onetJobData.interests.forEach(interest => {
        switch (interest.element_name) {
          case 'Realistic':
            vector.set('independent', 1);
            vector.set('detail-oriented', 1);
            break;
          case 'Investigative':
            vector.set('analytical', 1);
            vector.set('problem-solving', 1);
            break;
          case 'Artistic':
            vector.set('creativity', 1);
            vector.set('design', 1);
            vector.set('innovation', 1);
            break;
          case 'Social':
            vector.set('empathy', 1);
            vector.set('service', 1);
            vector.set('teaching', 1);
            vector.set('communication', 1);
            break;
          case 'Enterprising':
            vector.set('leadership', 1);
            vector.set('communication', 1);
            vector.set('organizational', 1);
            break;
          case 'Conventional':
            vector.set('detail-oriented', 1);
            vector.set('organizational', 1);
            break;
        }
      });
    }

    return vector;
  }

  mapRomeToTraitVector(romeJobData) {
    const vector = new Map();
    TRAIT_DIMENSIONS.forEach(trait => vector.set(trait, 0));

    // Mapping basé sur les compétences ROME
    if (romeJobData.competences && Array.isArray(romeJobData.competences)) {
      romeJobData.competences.forEach(competence => {
        const competenceName = competence.libelle.toLowerCase();

        // Mapping par mots-clés
        if (competenceName.includes('analyse') || competenceName.includes('analytique')) {
          vector.set('analytical', 1);
        }
        if (competenceName.includes('créati') || competenceName.includes('innov')) {
          vector.set('creativity', 1);
          vector.set('innovation', 1);
        }
        if (competenceName.includes('équipe') || competenceName.includes('collabor')) {
          vector.set('teamwork', 1);
          vector.set('collaborative', 1);
        }
        if (competenceName.includes('encadr') || competenceName.includes('manag')) {
          vector.set('leadership', 1);
        }
        if (competenceName.includes('communication')) {
          vector.set('communication', 1);
        }
        if (competenceName.includes('relation') || competenceName.includes('service')) {
          vector.set('empathy', 1);
          vector.set('service', 1);
        }
        if (competenceName.includes('organis') || competenceName.includes('planif')) {
          vector.set('organizational', 1);
        }
        if (competenceName.includes('précis') || competenceName.includes('rigour')) {
          vector.set('detail-oriented', 1);
        }
        if (competenceName.includes('auton') || competenceName.includes('indépend')) {
          vector.set('independent', 1);
        }
        if (competenceName.includes('design') || competenceName.includes('graphiq')) {
          vector.set('design', 1);
        }
        if (competenceName.includes('form') || competenceName.includes('enseign')) {
          vector.set('teaching', 1);
        }
        if (competenceName.includes('résol') || competenceName.includes('problème')) {
          vector.set('problem-solving', 1);
        }
      });
    }

    return vector;
  }

  // ===============================
  // Synchronisation avec notre base
  // ===============================

  async syncJobsFromAPIs(source = 'both') {
    const jobs = [];

    try {
      if (source === 'onet' || source === 'both') {
        console.log('Synchronisation O*NET...');
        const onetJobs = await this.getONetOccupations(30);

        for (const job of onetJobs) {
          const details = await this.getONetJobDetails(job.code);
          if (details) {
            const mappedJob = {
              title: job.title,
              description: details.description || 'Description O*NET non disponible',
              skills: details.technology_skills?.map(skill => skill.example) || [],
              traits: [], // Legacy pour compatibilité
              traitVector: this.mapONetToTraitVector(details),
              education: details.education?.levels?.[0]?.name || 'Formation variable',
              salary: {
                junior: 'Données salariales O*NET non disponibles',
                mid: 'Voir O*NET pour plus de détails',
                senior: 'Évolution selon expérience'
              },
              work_environment: details.work_context?.physical || 'Environnement variable',
              career_path: details.related_occupations?.map(occ => occ.title) || [],
              riasec: details.interests?.map(interest => interest.element_name.charAt(0)) || [],
              tags: ['O*NET', ...details.interests?.map(i => i.element_name) || []],
              source: 'onet',
              externalId: job.code
            };
            jobs.push(mappedJob);
          }
        }
      }

      if (source === 'rome' || source === 'both') {
        console.log('Synchronisation ROME...');
        const romeJobs = await this.getRomeJobs();

        for (const job of romeJobs.slice(0, 30)) {
          const details = await this.getRomeJobDetails(job.code);
          if (details) {
            const mappedJob = {
              title: job.libelle,
              description: details.definition || 'Description ROME non disponible',
              skills: details.competences?.map(comp => comp.libelle) || [],
              traits: [], // Legacy pour compatibilité
              traitVector: this.mapRomeToTraitVector(details),
              education: details.acces_emploi || 'Formation selon le poste',
              salary: {
                junior: 'Voir conventions collectives',
                mid: 'Évolution selon secteur',
                senior: 'Management et expertise'
              },
              work_environment: details.conditions_travail || 'Selon l\'employeur',
              career_path: details.mobilites_professionnelles || [],
              riasec: [], // ROME n'utilise pas RIASEC directement
              tags: ['ROME', 'France', job.code],
              source: 'rome',
              externalId: job.code
            };
            jobs.push(mappedJob);
          }
        }
      }

      console.log(`${jobs.length} métiers synchronisés depuis ${source}`);
      return jobs;

    } catch (error) {
      console.error('Erreur lors de la synchronisation:', error);
      return [];
    }
  }
}

module.exports = CareerApiService;