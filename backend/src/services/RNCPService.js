/**
 * Service RNCP - Registre National de Certification Professionnelle
 *
 * Objectifs:
 * - Mapper les certifications professionnelles à un métier
 * - Récupérer les niveaux de qualification (1-8 EQF)
 * - Extraire les formations requises
 * - Identifier les parcours de certification
 *
 * RNCP = Registre National de Certification Professionnelle (France Compétences)
 */

const axios = require('axios');
const cheerio = require('cheerio');

class RNCPService {
  constructor() {
    this.baseURL = 'https://www.francecompetences.fr';
    this.apiURL = 'https://www.francetravail.fr/api';
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
    this.timeout = 15000;

    this.cache = new Map();
    this.cacheExpiry = 7 * 24 * 60 * 60 * 1000; // 7 jours

    // Niveaux EQF (European Qualifications Framework)
    this.eqfLevels = {
      1: { name: 'Niveau 1', description: 'Savoirs généraux de base', eqf: 1 },
      2: { name: 'Niveau 2', description: 'Savoirs de base en lecture/écriture/calcul', eqf: 2 },
      3: { name: 'Niveau 3', description: 'CAP/BEP', eqf: 3 },
      4: { name: 'Niveau 4', description: 'Baccalauréat', eqf: 4 },
      5: { name: 'Niveau 5', description: 'Bac+2 (BTS, DUT)', eqf: 5 },
      6: { name: 'Niveau 6', description: 'Licence (Bac+3)', eqf: 6 },
      7: { name: 'Niveau 7', description: 'Master (Bac+5)', eqf: 7 },
      8: { name: 'Niveau 8', description: 'Doctorat', eqf: 8 }
    };

    // Base de données de certifications RNCP majeures (mise à jour 2025)
    this.certificationDatabase = {
      'Développeur web': [
        {
          rncpId: 'RNCP35899',
          title: 'Développeur web et web mobile',
          level: 5,
          duration: '6-12 mois',
          format: 'Formation continue, apprentissage',
          skills: ['HTML/CSS', 'JavaScript', 'Framework web', 'Base de données']
        },
        {
          rncpId: 'RNCP15290',
          title: 'Expert en informatique et systèmes d\'information',
          level: 7,
          duration: '2 ans',
          format: 'Master, Formation continue',
          skills: ['Architecture web', 'Sécurité', 'Cloud computing', 'Gestion de projet']
        }
      ],
      'Data Scientist': [
        {
          rncpId: 'RNCP34143',
          title: 'Expert en data science et intelligence artificielle',
          level: 7,
          duration: '2 ans',
          format: 'Master, Bootcamp',
          skills: ['Machine Learning', 'Python', 'Data Analysis', 'Big Data']
        },
        {
          rncpId: 'RNCP35357',
          title: 'Data analyst',
          level: 5,
          duration: '6-12 mois',
          format: 'Formation continue',
          skills: ['SQL', 'Tableau', 'Excel avancé', 'Statistics']
        }
      ],
      'Manager': [
        {
          rncpId: 'RNCP17791',
          title: 'Responsable de projet ou de programme informatique',
          level: 7,
          duration: '2 ans',
          format: 'Formation continue, Master',
          skills: ['Gestion de projet', 'Leadership', 'Agile', 'Communication']
        }
      ]
    };
  }

  /**
   * Récupère les certifications RNCP pour un métier
   * @param {String} jobTitle - Titre du métier
   * @returns {Array} - Certifications RNCP applicables
   */
  async getCertificationsForJob(jobTitle) {
    try {
      console.log(`  📜 RNCP: ${jobTitle}`);

      const cacheKey = `rncp_${jobTitle}`;
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheExpiry) {
          return cached.data;
        }
      }

      // Chercher dans notre base de données
      let certifications = this.searchInDatabase(jobTitle);

      if (certifications.length === 0) {
        // Fallback: chercher via France Compétences API
        certifications = await this.searchViaAPI(jobTitle);
      }

      const result = {
        name: 'RNCP',
        jobTitle: jobTitle,
        certifications: certifications,
        totalCount: certifications.length,
        url: `${this.baseURL}/search?search=${encodeURIComponent(jobTitle)}`,
        quality: certifications.length > 0 ? 0.85 : 0.4,
        lastUpdated: new Date()
      };

      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;

    } catch (error) {
      console.log(`  ⚠️  RNCP Error: ${error.message}`);
      return this.getDefaultResult(jobTitle);
    }
  }

  /**
   * Cherche dans la base de données locale
   * @param {String} jobTitle - Titre du métier
   * @returns {Array} - Certifications trouvées
   */
  searchInDatabase(jobTitle) {
    const jobTitleLower = jobTitle.toLowerCase();
    const certifications = [];

    for (const [job, certs] of Object.entries(this.certificationDatabase)) {
      if (
        jobTitleLower.includes(job.toLowerCase()) ||
        job.toLowerCase().includes(jobTitleLower.split(' ')[0])
      ) {
        certifications.push(...certs);
      }
    }

    return certifications;
  }

  /**
   * Récupère les certifications via API France Compétences
   * @param {String} jobTitle - Titre du métier
   * @returns {Array} - Certifications trouvées
   */
  async searchViaAPI(jobTitle) {
    try {
      const searchURL = `${this.baseURL}/api/search`;

      const response = await axios.post(
        searchURL,
        { keywords: jobTitle },
        {
          headers: {
            'User-Agent': this.userAgent,
            'Content-Type': 'application/json'
          },
          timeout: this.timeout
        }
      );

      if (response.data?.results) {
        return response.data.results.map(cert => ({
          rncpId: cert.id,
          title: cert.title,
          level: cert.level || 5,
          duration: cert.duration || 'Variable',
          format: cert.format || 'Formation',
          skills: cert.skills || []
        }));
      }

      return [];
    } catch (error) {
      console.log(`  ⚠️  RNCP API Error: ${error.message}`);
      return [];
    }
  }

  /**
   * Récupère le détail d'une certification RNCP
   * @param {String} rncpId - ID RNCP (ex: RNCP35899)
   * @returns {Object} - Détails complets de la certification
   */
  async getCertificationDetails(rncpId) {
    try {
      console.log(`  📋 RNCP Details: ${rncpId}`);

      const detailURL = `${this.baseURL}/search_article/${rncpId}`;

      const response = await axios.get(detailURL, {
        headers: { 'User-Agent': this.userAgent },
        timeout: this.timeout
      });

      const $ = cheerio.load(response.data);

      const details = {
        rncpId: rncpId,
        title: $('[data-title], .title, h1').first().text().trim(),
        description: $('[data-description], .description').first().text().trim(),
        level: this.extractLevel($('[data-level], .level').text()),
        duration: $('[data-duration], .duration').text().trim() || 'Variable',
        format: $('[data-format], .format').text().trim() || 'Formation',
        skills: [],
        sectors: [],
        url: detailURL
      };

      // Extraire les compétences
      $('[data-competency], .competency, li.skill').each((idx, elem) => {
        const skill = $(elem).text().trim();
        if (skill && details.skills.length < 20) {
          details.skills.push(skill);
        }
      });

      // Extraire les secteurs
      $('[data-sector], .sector').each((idx, elem) => {
        const sector = $(elem).text().trim();
        if (sector && !details.sectors.includes(sector)) {
          details.sectors.push(sector);
        }
      });

      return details;
    } catch (error) {
      console.log(`  ⚠️  Details Error: ${error.message}`);
      return null;
    }
  }

  /**
   * Récupère les formations accréditées pour une certification
   * @param {String} rncpId - ID RNCP
   * @returns {Array} - Formations proposant cette certification
   */
  async getAccreditedTrainings(rncpId) {
    try {
      console.log(`  🏫 RNCP Trainings: ${rncpId}`);

      // Appel API France Compétences pour récupérer les formations
      const trainingsURL = `${this.baseURL}/api/trainings?rncp=${rncpId}`;

      const response = await axios.get(trainingsURL, {
        headers: { 'User-Agent': this.userAgent },
        timeout: this.timeout
      });

      if (response.data?.trainings) {
        return response.data.trainings.map(training => ({
          name: training.name,
          provider: training.provider,
          duration: training.duration,
          location: training.location,
          format: training.format,
          cost: training.cost,
          url: training.url
        }));
      }

      return [];
    } catch (error) {
      console.log(`  ⚠️  Trainings Error: ${error.message}`);
      return [];
    }
  }

  /**
   * Récupère les parcours de formation pour atteindre un niveau
   * @param {String} jobTitle - Titre du métier
   * @param {Number} targetLevel - Niveau EQF cible (1-8)
   * @returns {Array} - Parcours possibles
   */
  getLearningPaths(jobTitle, targetLevel = 6) {
    const paths = [];

    // Parcours classique
    if (targetLevel >= 5) {
      paths.push({
        name: 'Parcours Bac+2/3',
        steps: [
          { level: 4, duration: '3 ans', example: 'Baccalauréat S/STI2D' },
          { level: 5, duration: '2 ans', example: 'BTS / DUT Informatique' },
          { level: 6, duration: '1 an', example: 'Licence Professionnelle' }
        ],
        totalDuration: '6 ans',
        cost: '€€€'
      });
    }

    // Parcours alternance
    paths.push({
      name: 'Parcours Alternance',
      steps: [
        { level: 4, duration: '2 ans', example: 'Prépa alternance' },
        { level: 5, duration: '2 ans', example: 'Formation en alternance' },
        { level: 6, duration: 'Optionnel', example: 'Licence en apprentissage' }
      ],
      totalDuration: '2-4 ans',
      cost: 'Gratuit (employeur paie)',
      advantage: 'Expérience professionnelle'
    });

    // Parcours reconversion rapide
    if (targetLevel <= 5) {
      paths.push({
        name: 'Parcours Reconversion Rapide',
        steps: [
          { level: 0, duration: '3-6 mois', example: 'Bootcamp ou Formation intensive' },
          { level: 5, duration: '0 ans', example: 'Certification obtenue' }
        ],
        totalDuration: '3-6 mois',
        cost: '€€',
        advantage: 'Accès rapide au marché du travail'
      });
    }

    return paths;
  }

  /**
   * Extrait le niveau EQF d'une chaîne de texte
   * @param {String} text - Texte contenant le niveau
   * @returns {Number} - Niveau EQF (1-8)
   */
  extractLevel(text) {
    const match = text.match(/niveau\s+(\d)/i);
    if (match) {
      return Math.min(Math.max(parseInt(match[1]), 1), 8);
    }

    if (text.includes('baccalauréat') || text.includes('bac')) return 4;
    if (text.includes('master') || text.includes('m2')) return 7;
    if (text.includes('licence')) return 6;
    if (text.includes('bts') || text.includes('dut')) return 5;
    if (text.includes('cap')) return 3;

    return 5; // Par défaut
  }

  /**
   * Récupère les compétences requises pour un niveau RNCP
   * @param {Number} level - Niveau EQF (1-8)
   * @returns {Object} - Compétences et prérequis
   */
  getCompetenciesForLevel(level) {
    const levelInfo = this.eqfLevels[level] || { name: 'Niveau 5', description: 'Niveau intermédiaire' };

    return {
      level: level,
      levelName: levelInfo.name,
      description: levelInfo.description,
      coreCompetencies: [
        'Knowledge in field',
        'Problem-solving',
        'Communication',
        'Teamwork'
      ],
      technicalCompetencies: level >= 5 ? [
        'Specialized knowledge',
        'Technical tools',
        'Project implementation',
        'Quality assurance'
      ] : [],
      softSkills: [
        'Adaptability',
        'Continuous learning',
        'Professional ethics',
        'Leadership' // if level >= 6
      ]
    };
  }

  /**
   * Résultat par défaut
   */
  getDefaultResult(jobTitle) {
    return {
      name: 'RNCP',
      jobTitle: jobTitle,
      certifications: [],
      totalCount: 0,
      note: 'Aucune certification RNCP trouvée. Consulter France Compétences.',
      url: `${this.baseURL}/search?search=${encodeURIComponent(jobTitle)}`,
      quality: 0.3
    };
  }

  /**
   * Efface le cache
   */
  clearCache() {
    this.cache.clear();
  }
}

module.exports = new RNCPService();
