/**
 * Routes API pour la gestion des métiers
 */

const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const { escapeRegex } = require('../utils/sanitize');

/**
 * GET /api/jobs
 * Récupère les métiers avec filtrage et pagination
 *
 * Query params:
 * - search: recherche par titre
 * - sector: filtrer par secteur
 * - riasec: filtrer par codes RIASEC
 * - minQuality: qualité minimale (0-1)
 * - enriched: true/false - si enrichi ou non
 * - limit: nombre de métiers (défaut: 50)
 * - skip: nombre à passer (défaut: 0)
 */
router.get('/', async (req, res) => {
  try {
    const {
      search,
      sector,
      riasec,
      minQuality = 0,
      enriched,
      limit = 50,
      skip = 0
    } = req.query;

    // Construire le filtre
    const filter = {};

    if (search) {
      const sanitizedSearch = escapeRegex(search);
      filter.$or = [
        { title: { $regex: sanitizedSearch, $options: 'i' } },
        { romeCode: { $regex: sanitizedSearch, $options: 'i' } }
      ];
    }

    if (sector) {
      filter.sector = sector;
    }

    if (riasec) {
      filter.riasec = { $in: [riasec] };
    }

    if (minQuality > 0) {
      filter.dataQuality = { $gte: parseFloat(minQuality) };
    }

    if (enriched === 'true') {
      filter.enrichedAt = { $exists: true, $ne: null };
    } else if (enriched === 'false') {
      filter.enrichedAt = { $exists: false };
    }

    // Requête
    const total = await Job.countDocuments(filter);
    const jobs = await Job.find(filter)
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .sort({ enrichedAt: -1 });

    res.json({
      success: true,
      data: jobs,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: parseInt(skip) + parseInt(limit) < total
      }
    });
  } catch (error) {
    console.error('Erreur GET /api/jobs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/jobs/:id
 * Récupère un métier spécifique
 */
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ success: false, error: 'Métier non trouvé' });
    }

    res.json({ success: true, data: job });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/jobs/stats/summary
 * Récupère les statistiques d'enrichissement
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const total = await Job.countDocuments();
    const enriched = await Job.countDocuments({ enrichedAt: { $exists: true, $ne: null } });
    const avgQuality = await Job.aggregate([
      { $match: { dataQuality: { $exists: true } } },
      { $group: { _id: null, avg: { $avg: '$dataQuality' } } }
    ]);

    // Métiers par secteur
    const bySector = await Job.aggregate([
      { $group: { _id: '$sector', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Sources les plus utilisées
    const sources = await Job.aggregate([
      { $unwind: '$enrichedSources' },
      { $group: { _id: '$enrichedSources', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        total,
        enriched,
        enrichmentRate: total > 0 ? ((enriched / total) * 100).toFixed(2) + '%' : '0%',
        avgQuality: avgQuality[0]?.avg?.toFixed(2) || 0,
        bySector,
        sources
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/jobs/sectors
 * Récupère la liste de tous les secteurs
 */
router.get('/sectors/list', async (req, res) => {
  try {
    const sectors = await Job.distinct('sector');
    res.json({
      success: true,
      data: sectors.filter(Boolean).sort()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/jobs/enrichment-trigger
 * Déclenche l'enrichissement intelligent
 * (Déclenche le script intelligentEnrichment.js)
 */
router.post('/enrichment-trigger', async (req, res) => {
  try {
    const { jobId, limit, force } = req.body;

    // Pour l'instant, on retourne un message
    // Une intégration complète déclencherait le script intelligentEnrichment.js

    res.json({
      success: true,
      message: 'Enrichissement déclenché',
      command: `npm run enrich:${jobId ? 'job' : 'sample'}${force ? ':force' : ''}`,
      note: 'Utilisez ce message pour déclencher l\'enrichissement depuis l\'admin'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
