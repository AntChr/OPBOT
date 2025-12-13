/**
 * Service pour filtrer les métiers basé sur les données enrichies
 * Secteur, salaire, environnement, niveau d'études, etc.
 */

class JobFilterService {
  /**
   * Construit une requête MongoDB basée sur le profil et les contraintes
   */
  static buildQuery(profile, options = {}) {
    const query = {};
    const filters = [];

    // 1. Filtrer par secteur si l'utilisateur a exprimé une préférence
    if (profile.preferredSectors && profile.preferredSectors.length > 0) {
      filters.push({ sector: { $in: profile.preferredSectors } });
    }

    // 2. Filtrer par environnement de travail
    const envConstraint = profile.constraints?.find(c => c.type === 'environment');
    if (envConstraint) {
      filters.push({ work_environment: new RegExp(envConstraint.value, 'i') });
    }

    // 3. Filtrer par niveau d'études si spécifié
    if (profile.educationLevel) {
      filters.push({ education: new RegExp(profile.educationLevel, 'i') });
    }

    // 4. Filtrer par salaire minimum si spécifié
    if (profile.minSalary) {
      // Chercher des métiers où le salaire junior >= minSalary
      filters.push({
        'salary.junior': { $exists: true, $ne: null }
        // TODO: Parser et comparer les fourchettes de salaire
      });
    }

    // 5. Filtrer par intérêts dominants (via mots-clés)
    if (profile.interests && profile.interests.length > 0 && options.useInterestKeywords) {
      const topInterests = profile.interests
        .filter(i => i.level >= 3)
        .sort((a, b) => b.level - a.level)
        .slice(0, 3);

      if (topInterests.length > 0) {
        const keywordFilters = this.buildInterestKeywordFilter(topInterests);
        if (keywordFilters) {
          filters.push(keywordFilters);
        }
      }
    }

    // 6. N'inclure que les métiers enrichis si demandé
    if (options.onlyEnriched) {
      filters.push({ enrichedAt: { $exists: true } });
    }

    // 7. Préférer les métiers ESCO (français) si demandé
    if (options.preferESCO) {
      query.$or = [
        { source: 'ESCO' },
        { source: { $ne: 'ESCO' } }
      ];
    }

    // Combiner tous les filtres
    if (filters.length > 0) {
      query.$and = filters;
    }

    return query;
  }

  /**
   * Construit un filtre de mots-clés basé sur les intérêts
   */
  static buildInterestKeywordFilter(interests) {
    const keywordMap = {
      'horticulture': ['fleur', 'floral', 'flower', 'jardin', 'garden', 'plant', 'landscap', 'paysag', 'horti', 'botan', 'arbre', 'nature', 'nurser', 'greenhouse'],
      'technology': ['tech', 'software', 'hardware', 'computer', 'digital', 'web', 'mobile', 'develop', 'program'],
      'arts': ['art', 'design', 'créat', 'music', 'paint', 'sculpt', 'graph', 'photo'],
      'science': ['scien', 'research', 'laborat', 'biology', 'chemistry', 'physics', 'analy'],
      'health': ['health', 'medical', 'nurse', 'doctor', 'care', 'patient', 'clinic', 'hospital', 'santé', 'médical'],
      'teaching': ['teach', 'educat', 'professor', 'instructor', 'trainer', 'enseign', 'formateur'],
      'business': ['business', 'manage', 'market', 'sales', 'commerce', 'entreprise']
    };

    const regexPatterns = [];

    interests.forEach(interest => {
      const keywords = keywordMap[interest.domain];
      if (keywords) {
        keywords.forEach(kw => {
          regexPatterns.push(kw);
        });
      }
    });

    if (regexPatterns.length === 0) return null;

    const combinedPattern = regexPatterns.join('|');

    return {
      $or: [
        { title: { $regex: combinedPattern, $options: 'i' } },
        { description: { $regex: combinedPattern, $options: 'i' } },
        { altLabels: { $elemMatch: { $regex: combinedPattern, $options: 'i' } } }
      ]
    };
  }

  /**
   * Applique un score de pertinence supplémentaire basé sur les données enrichies
   */
  static calculateEnrichedScore(job, profile) {
    let score = 0;

    // Bonus si le secteur correspond aux intérêts
    if (job.sector && profile.preferredSectors?.includes(job.sector)) {
      score += 0.15;
    }

    // Bonus si l'environnement correspond
    const envConstraint = profile.constraints?.find(c => c.type === 'environment');
    if (envConstraint && job.work_environment) {
      if (job.work_environment.toLowerCase().includes(envConstraint.value.toLowerCase())) {
        score += 0.10;
      }
    }

    // Bonus pour employabilité forte
    if (job.employability === 'Fort') {
      score += 0.05;
    }

    // Bonus si le niveau d'études correspond
    if (job.education && profile.educationLevel) {
      if (job.education.includes(profile.educationLevel)) {
        score += 0.08;
      }
    }

    // Bonus si c'est un métier ESCO (français)
    if (job.source === 'ESCO') {
      score += 0.02;
    }

    return Math.min(1, score);
  }

  /**
   * Parse une fourchette de salaire (ex: "28000-35000" -> { min: 28000, max: 35000 })
   */
  static parseSalaryRange(salaryString) {
    if (!salaryString || typeof salaryString !== 'string') return null;

    const match = salaryString.match(/(\d+)-(\d+)/);
    if (!match) return null;

    return {
      min: parseInt(match[1]),
      max: parseInt(match[2])
    };
  }

  /**
   * Vérifie si un métier correspond aux critères de salaire
   */
  static matchesSalaryCriteria(job, minSalary, level = 'junior') {
    if (!minSalary || !job.salary || !job.salary[level]) return true;

    const salaryRange = this.parseSalaryRange(job.salary[level]);
    if (!salaryRange) return true;

    return salaryRange.max >= minSalary;
  }

  /**
   * Filtre post-requête (pour critères complexes)
   */
  static postFilterJobs(jobs, profile, options = {}) {
    return jobs.filter(job => {
      // Filtrer par salaire si nécessaire
      if (profile.minSalary) {
        if (!this.matchesSalaryCriteria(job, profile.minSalary, options.salaryLevel || 'junior')) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Trie les métiers par pertinence enrichie
   */
  static sortByEnrichedRelevance(jobs, profile) {
    return jobs.map(job => ({
      job,
      enrichedScore: this.calculateEnrichedScore(job, profile)
    }))
    .sort((a, b) => b.enrichedScore - a.enrichedScore)
    .map(item => item.job);
  }
}

module.exports = JobFilterService;
