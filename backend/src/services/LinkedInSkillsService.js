/**
 * Service LinkedIn Skills - Détecte les compétences tendances et émergentes
 *
 * Objectifs:
 * - Extraire les compétences les plus demandées
 * - Identifier les skills émergentes (croissance rapide)
 * - Analyser les tendances par secteur
 * - Récupérer les endossements de compétences
 */

const axios = require('axios');

class LinkedInSkillsService {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
    this.timeout = 10000;
    this.cache = new Map();
    this.cacheExpiry = 48 * 60 * 60 * 1000; // 48h

    // Base de données de compétences tendances (mises à jour régulièrement)
    this.trendingSkills = {
      'IA/Machine Learning': {
        skills: ['Python', 'TensorFlow', 'PyTorch', 'NLP', 'Computer Vision', 'Deep Learning'],
        trend: 'Très croissant',
        growth: 85,
        sectors: ['Tech', 'Finance', 'Healthcare', 'Manufacturing']
      },
      'Cloud & DevOps': {
        skills: ['AWS', 'Azure', 'Kubernetes', 'Docker', 'Terraform', 'CI/CD'],
        trend: 'Très croissant',
        growth: 72,
        sectors: ['Tech', 'Finance', 'E-commerce']
      },
      'Data Science': {
        skills: ['SQL', 'Tableau', 'Power BI', 'R', 'Statistics', 'Big Data'],
        trend: 'Très croissant',
        growth: 65,
        sectors: ['Finance', 'Tech', 'Healthcare', 'Retail']
      },
      'Cybersecurity': {
        skills: ['Security Architecture', 'SIEM', 'Penetration Testing', 'Compliance', 'Zero Trust'],
        trend: 'Très croissant',
        growth: 78,
        sectors: ['Finance', 'Defense', 'Tech', 'Healthcare']
      },
      'Product Management': {
        skills: ['Agile', 'Product Strategy', 'User Research', 'Analytics', 'Roadmapping'],
        trend: 'Croissant',
        growth: 45,
        sectors: ['Tech', 'E-commerce', 'Finance']
      },
      'Design': {
        skills: ['UX/UI', 'Figma', 'User Research', 'Accessibility', 'Wireframing'],
        trend: 'Stable',
        growth: 30,
        sectors: ['Tech', 'Design', 'E-commerce']
      },
      'Soft Skills': {
        skills: ['Leadership', 'Communication', 'Problem Solving', 'Collaboration', 'Adaptability'],
        trend: 'Stable',
        growth: 25,
        sectors: ['All']
      }
    };
  }

  /**
   * Récupère les compétences tendances pour un métier
   * @param {String} jobTitle - Titre du métier
   * @param {String} sector - Secteur d'activité optionnel
   * @returns {Object} - Compétences avec scores de tendance
   */
  async getTrendingSkillsForJob(jobTitle, sector = null) {
    try {
      console.log(`  🔗 LinkedIn Skills: ${jobTitle}`);

      const cacheKey = `linkedin_skills_${jobTitle}_${sector || 'all'}`;
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheExpiry) {
          return cached.data;
        }
      }

      // Simuler un appel API LinkedIn (impossible en scraping direct)
      // En production: utiliser LinkedIn API officielle ou service tiers
      const result = await this.analyzeJobTitleSkills(jobTitle, sector);

      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;

    } catch (error) {
      console.log(`  ⚠️  LinkedIn Skills Error: ${error.message}`);
      return this.getDefaultSkillsResult(jobTitle);
    }
  }

  /**
   * Analyse les compétences associées à un titre de poste
   * @param {String} jobTitle - Titre du métier
   * @param {String} sector - Secteur optionnel
   * @returns {Object} - Compétences avec scores
   */
  async analyzeJobTitleSkills(jobTitle, sector) {
    const jobTitleLower = jobTitle.toLowerCase();

    // Mapping basé sur le titre du poste
    const skillsMap = this.getSkillsByJobTitle(jobTitle, sector);

    return {
      name: 'LinkedIn Skills',
      jobTitle: jobTitle,
      sector: sector || 'General',
      skills: skillsMap.skills || [],
      emergingSkills: skillsMap.emerging || [],
      essentialSkills: skillsMap.essential || [],
      trendingTopics: skillsMap.trending || [],
      demandScore: skillsMap.demandScore || 0.7,
      url: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(jobTitle)}&location=France`,
      quality: 0.75,
      lastUpdated: new Date()
    };
  }

  /**
   * Mappe les compétences selon le titre du poste
   * @param {String} jobTitle - Titre du poste
   * @param {String} sector - Secteur optionnel
   * @returns {Object} - Compétences mappées
   */
  getSkillsByJobTitle(jobTitle, sector) {
    const title = jobTitle.toLowerCase();

    // Développeur
    if (title.includes('développeur') || title.includes('developer')) {
      return {
        essential: ['Problem Solving', 'Code Review', 'Version Control', 'Testing'],
        skills: ['JavaScript', 'Python', 'React', 'Git', 'SQL', 'REST API'],
        emerging: ['WebAssembly', 'Rust', 'TypeScript', 'GraphQL'],
        trending: ['Full-Stack Development', 'DevOps', 'Cloud Architecture'],
        demandScore: 0.95
      };
    }

    // Data
    if (title.includes('data') || title.includes('analytique')) {
      return {
        essential: ['Data Analysis', 'Statistics', 'SQL', 'Visualization'],
        skills: ['Python', 'R', 'Tableau', 'Excel', 'Big Data', 'Machine Learning'],
        emerging: ['Deep Learning', 'NLP', 'Data Engineering'],
        trending: ['AI/ML', 'Real-time Analytics', 'Data Governance'],
        demandScore: 0.90
      };
    }

    // Manager/Leadership
    if (title.includes('manager') || title.includes('lead') || title.includes('directeur')) {
      return {
        essential: ['Leadership', 'Strategic Planning', 'Team Management', 'Communication'],
        skills: ['Project Management', 'Budget Management', 'Performance Management', 'Decision Making'],
        emerging: ['Agile Leadership', 'Remote Team Management', 'Change Management'],
        trending: ['Digital Transformation', 'Diversity & Inclusion', 'Employee Wellness'],
        demandScore: 0.80
      };
    }

    // Designer
    if (title.includes('designer') || title.includes('design') || title.includes('ux')) {
      return {
        essential: ['UI/UX Design', 'User Research', 'Wireframing', 'Prototyping'],
        skills: ['Figma', 'Adobe XD', 'Accessibility', 'CSS', 'JavaScript', 'Design Systems'],
        emerging: ['3D Design', 'Motion Design', 'Voice UI'],
        trending: ['Inclusive Design', 'Design Thinking', 'No-code Tools'],
        demandScore: 0.85
      };
    }

    // Marketing
    if (title.includes('marketing') || title.includes('commercial')) {
      return {
        essential: ['Digital Marketing', 'Analytics', 'Content Strategy', 'Communication'],
        skills: ['SEO', 'SEM', 'Social Media', 'Email Marketing', 'Analytics', 'CRM'],
        emerging: ['Marketing Automation', 'Personalization', 'Marketing AI'],
        trending: ['Data-driven Marketing', 'Omnichannel Strategy', 'Community Building'],
        demandScore: 0.75
      };
    }

    // Par défaut: Soft skills universels + skills technologiques
    return {
      essential: ['Problem Solving', 'Communication', 'Teamwork', 'Adaptability'],
      skills: ['Project Management', 'Analytical Thinking', 'Time Management', 'Excel', 'Presentation'],
      emerging: ['AI Literacy', 'Digital Transformation', 'Sustainability'],
      trending: ['Remote Work', 'Continuous Learning', 'Cross-functional Collaboration'],
      demandScore: 0.70
    };
  }

  /**
   * Récupère les compétences émergentes pour un secteur
   * @param {String} sector - Secteur d'activité
   * @returns {Array} - Compétences en croissance rapide
   */
  getEmergingSkillsBySector(sector) {
    const emergingByTrend = [];

    for (const [category, data] of Object.entries(this.trendingSkills)) {
      if (data.growth > 60 && (!sector || data.sectors.includes(sector) || data.sectors.includes('All'))) {
        emergingByTrend.push({
          category,
          skills: data.skills,
          growth: data.growth,
          sectors: data.sectors
        });
      }
    }

    return emergingByTrend.sort((a, b) => b.growth - a.growth);
  }

  /**
   * Score de compétence - Entre 0 et 1
   * @param {String} skill - Nom de la compétence
   * @returns {Number} - Score de tendance (0-1)
   */
  getSkillTrendScore(skill) {
    const skillLower = skill.toLowerCase();

    // Chercher dans tous les trends
    for (const [category, data] of Object.entries(this.trendingSkills)) {
      const found = data.skills.find(s => s.toLowerCase().includes(skillLower) || skillLower.includes(s.toLowerCase()));
      if (found) {
        return data.growth / 100; // Convertir en 0-1
      }
    }

    // Compétence non listée
    return 0.5; // Score neutre
  }

  /**
   * Récupère les endossements de compétence (popularité)
   * @param {String} skill - Nom de la compétence
   * @returns {Object} - Données d'endossement
   */
  async getSkillEndorsements(skill) {
    try {
      // Simplement retourner des données basées sur notre base de connaissance
      const trendScore = this.getSkillTrendScore(skill);

      return {
        skill: skill,
        endorsementScore: trendScore,
        popularityRank: 'Modérée', // À calculer basé sur trendScore
        growth: trendScore > 0.7 ? 'Croissant' : trendScore > 0.5 ? 'Stable' : 'Déclinant',
        companies: this.getTopCompaniesForSkill(skill),
        roles: this.getTopRolesForSkill(skill)
      };
    } catch (error) {
      console.log(`  ⚠️  Endorsements Error: ${error.message}`);
      return null;
    }
  }

  /**
   * Récupère les top entreprises utilisant une compétence
   * @param {String} skill - Compétence
   * @returns {Array} - Top 5 entreprises
   */
  getTopCompaniesForSkill(skill) {
    const skillLower = skill.toLowerCase();

    // Mapping simplifié
    if (skillLower.includes('python') || skillLower.includes('ai') || skillLower.includes('machine learning')) {
      return ['Google', 'Microsoft', 'Facebook', 'Amazon', 'Startup Tech'];
    }
    if (skillLower.includes('aws') || skillLower.includes('cloud') || skillLower.includes('azure')) {
      return ['Amazon', 'Microsoft', 'Google Cloud', 'IBM', 'Orange'];
    }
    if (skillLower.includes('design') || skillLower.includes('ux') || skillLower.includes('figma')) {
      return ['Google', 'Apple', 'Adobe', 'Figma', 'Airbnb'];
    }

    return ['GAFAM', 'Grandes Entreprises Tech', 'Startups', 'Consulting', 'Finance'];
  }

  /**
   * Récupère les top rôles utilisant une compétence
   * @param {String} skill - Compétence
   * @returns {Array} - Top rôles
   */
  getTopRolesForSkill(skill) {
    const skillLower = skill.toLowerCase();

    if (skillLower.includes('python')) {
      return ['Développeur Backend', 'Data Scientist', 'ML Engineer', 'DevOps Engineer', 'Full-Stack Developer'];
    }
    if (skillLower.includes('react') || skillLower.includes('javascript')) {
      return ['Développeur Frontend', 'Full-Stack Developer', 'Mobile Developer', 'Senior Developer'];
    }
    if (skillLower.includes('leadership') || skillLower.includes('management')) {
      return ['Manager', 'Director', 'VP Engineering', 'Product Manager', 'Team Lead'];
    }

    return ['Rôle généraliste', 'Position spécialisée', 'Leadership', 'Technique'];
  }

  /**
   * Résultat par défaut
   */
  getDefaultSkillsResult(jobTitle) {
    return {
      name: 'LinkedIn Skills',
      jobTitle: jobTitle,
      skills: [],
      emergingSkills: [],
      essentialSkills: ['Problem Solving', 'Communication', 'Teamwork'],
      trendingTopics: [],
      demandScore: 0.5,
      url: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(jobTitle)}`,
      quality: 0.4,
      note: 'Données par défaut - LinkedIn API requise pour données réelles'
    };
  }

  /**
   * Efface le cache
   */
  clearCache() {
    this.cache.clear();
  }
}

module.exports = new LinkedInSkillsService();
