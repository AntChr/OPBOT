/**
 * Routes API Phase 2 - Enrichissement avancé
 *
 * Endpoints pour les nouveaux services:
 * - APEC (offres d'emploi, salaires)
 * - LinkedIn (skills tendances)
 * - RNCP (certifications)
 * - Auto-enrichment scheduler
 */

const express = require('express');
const router = express.Router();

// Importer les services
const APECService = require('../services/APECService');
const LinkedInService = require('../services/LinkedInSkillsService');
const RNCPService = require('../services/RNCPService');
const AutoEnrichmentScheduler = require('../services/AutoEnrichmentScheduler');
const Job = require('../models/Job');

// =====================
// APEC ENDPOINTS
// =====================

/**
 * GET /api/phase2/apec/offers/:jobTitle
 * Récupère les offres d'emploi APEC pour un métier
 */
router.get('/apec/offers/:jobTitle', async (req, res) => {
  try {
    const { jobTitle } = req.params;
    const { romeCode } = req.query;

    const offers = await APECService.searchJobOffers(jobTitle, romeCode);

    if (!offers) {
      return res.status(404).json({
        success: false,
        message: 'Aucune offre trouvée'
      });
    }

    res.json({
      success: true,
      data: offers
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/phase2/apec/profile/:jobTitle
 * Récupère le profil métier APEC
 */
router.get('/apec/profile/:jobTitle', async (req, res) => {
  try {
    const { jobTitle } = req.params;

    const profile = await APECService.getJobProfile(jobTitle);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profil non trouvé'
      });
    }

    res.json({
      success: true,
      data: profile
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/phase2/apec/salaries/:jobTitle
 * Récupère les données salariales APEC
 */
router.get('/apec/salaries/:jobTitle', async (req, res) => {
  try {
    const { jobTitle } = req.params;

    const salaries = await APECService.getSalaryData(jobTitle);

    if (!salaries) {
      return res.status(404).json({
        success: false,
        message: 'Données salariales non trouvées'
      });
    }

    res.json({
      success: true,
      data: salaries
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/phase2/apec/trends/:sector
 * Récupère les tendances du marché APEC
 */
router.get('/apec/trends/:sector', async (req, res) => {
  try {
    const { sector } = req.params;

    const trends = await APECService.getMarketTrends(sector);

    if (!trends) {
      return res.status(404).json({
        success: false,
        message: 'Tendances non trouvées'
      });
    }

    res.json({
      success: true,
      data: trends
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =====================
// LINKEDIN ENDPOINTS
// =====================

/**
 * GET /api/phase2/linkedin/skills/:jobTitle
 * Récupère les compétences tendances pour un métier
 */
router.get('/linkedin/skills/:jobTitle', async (req, res) => {
  try {
    const { jobTitle } = req.params;
    const { sector } = req.query;

    const skills = await LinkedInService.getTrendingSkillsForJob(jobTitle, sector);

    if (!skills) {
      return res.status(404).json({
        success: false,
        message: 'Données non trouvées'
      });
    }

    res.json({
      success: true,
      data: skills
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/phase2/linkedin/emerging
 * Récupère les compétences émergentes
 */
router.get('/linkedin/emerging', async (req, res) => {
  try {
    const { sector } = req.query;

    const emerging = LinkedInService.getEmergingSkillsBySector(sector);

    res.json({
      success: true,
      data: emerging
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/phase2/linkedin/skill-score/:skillName
 * Score de tendance pour une compétence
 */
router.get('/linkedin/skill-score/:skillName', async (req, res) => {
  try {
    const { skillName } = req.params;

    const score = LinkedInService.getSkillTrendScore(skillName);
    const endorsements = await LinkedInService.getSkillEndorsements(skillName);

    res.json({
      success: true,
      data: {
        skill: skillName,
        trendScore: score,
        endorsements: endorsements
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =====================
// RNCP ENDPOINTS
// =====================

/**
 * GET /api/phase2/rncp/certifications/:jobTitle
 * Récupère les certifications RNCP pour un métier
 */
router.get('/rncp/certifications/:jobTitle', async (req, res) => {
  try {
    const { jobTitle } = req.params;

    const certifications = await RNCPService.getCertificationsForJob(jobTitle);

    if (!certifications) {
      return res.status(404).json({
        success: false,
        message: 'Certifications non trouvées'
      });
    }

    res.json({
      success: true,
      data: certifications
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/phase2/rncp/learning-paths/:jobTitle
 * Récupère les parcours de formation
 */
router.get('/rncp/learning-paths/:jobTitle', async (req, res) => {
  try {
    const { jobTitle } = req.params;
    const { targetLevel = 6 } = req.query;

    const paths = RNCPService.getLearningPaths(jobTitle, parseInt(targetLevel));

    res.json({
      success: true,
      data: paths
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/phase2/rncp/certification/:rncpId
 * Détails d'une certification spécifique
 */
router.get('/rncp/certification/:rncpId', async (req, res) => {
  try {
    const { rncpId } = req.params;

    const details = await RNCPService.getCertificationDetails(rncpId);
    const trainings = await RNCPService.getAccreditedTrainings(rncpId);

    res.json({
      success: true,
      data: {
        details: details,
        trainings: trainings
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =====================
// AUTO-ENRICHMENT ENDPOINTS
// =====================

/**
 * GET /api/phase2/enrichment/status
 * Statut de l'enrichissement en cours
 */
router.get('/enrichment/status', (req, res) => {
  const status = AutoEnrichmentScheduler.getStatus();

  res.json({
    success: true,
    data: status
  });
});

/**
 * POST /api/phase2/enrichment/start
 * Lance l'enrichissement automatique
 * Body: { limit, sector, force, daysOld, batchSize, batchDelay }
 */
router.post('/enrichment/start', async (req, res) => {
  try {
    const { limit = 50, sector, force = false, daysOld = 30 } = req.body;

    const stats = await AutoEnrichmentScheduler.start({
      limit,
      sector,
      force,
      daysOld
    });

    res.json({
      success: true,
      message: 'Enrichissement lancé',
      data: stats
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/phase2/enrichment/stop
 * Arrête l'enrichissement en cours
 */
router.post('/enrichment/stop', (req, res) => {
  AutoEnrichmentScheduler.stop();

  res.json({
    success: true,
    message: 'Arrêt demandé'
  });
});

/**
 * GET /api/phase2/enrichment/stale-data
 * Détecte les données obsolètes
 */
router.get('/enrichment/stale-data', async (req, res) => {
  try {
    const { daysThreshold = 30 } = req.query;

    const staleData = await AutoEnrichmentScheduler.detectStaleData(parseInt(daysThreshold));

    res.json({
      success: true,
      data: staleData
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/phase2/enrichment/report
 * Rapport d'enrichissement - statistiques globales
 */
router.get('/enrichment/report', async (req, res) => {
  try {
    const totalJobs = await Job.countDocuments();
    const enrichedJobs = await Job.countDocuments({
      enrichedAt: { $exists: true, $ne: null }
    });
    const lowQualityJobs = await Job.countDocuments({
      dataQuality: { $lt: 0.6 }
    });
    const avgQuality = await Job.aggregate([
      { $match: { dataQuality: { $exists: true } } },
      { $group: { _id: null, avgQuality: { $avg: '$dataQuality' } } }
    ]);

    const staleData = await AutoEnrichmentScheduler.detectStaleData(30);

    res.json({
      success: true,
      data: {
        totalJobs,
        enrichedJobs,
        enrichmentRate: `${Math.round((enrichedJobs / totalJobs) * 100)}%`,
        lowQualityJobs,
        averageQuality: avgQuality[0]?.avgQuality || 0,
        staleDataSummary: {
          total: staleData.totalStale,
          categories: staleData.byCategory
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
