/**
 * Script pour vérifier le statut de l'enrichissement
 *
 * Usage: node scripts/checkEnrichmentStatus.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Job = require('../src/models/Job');

async function checkStatus() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log('📊 STATUT D\'ENRICHISSEMENT\n');
    console.log('='.repeat(50));

    // Statistiques globales
    const total = await Job.countDocuments();
    const enriched = await Job.countDocuments({ enrichedAt: { $exists: true } });
    const notEnriched = total - enriched;

    console.log('\n📈 GLOBAL:');
    console.log(`  Total métiers      : ${total}`);
    console.log(`  ✅ Enrichis        : ${enriched} (${(enriched/total*100).toFixed(1)}%)`);
    console.log(`  ⏳ Restants        : ${notEnriched} (${(notEnriched/total*100).toFixed(1)}%)`);

    // Par source
    console.log('\n📚 PAR SOURCE:');

    const escoTotal = await Job.countDocuments({ source: 'ESCO' });
    const escoEnriched = await Job.countDocuments({ source: 'ESCO', enrichedAt: { $exists: true } });
    console.log(`  ESCO: ${escoEnriched}/${escoTotal} (${(escoEnriched/escoTotal*100).toFixed(1)}%)`);

    const onetTotal = await Job.countDocuments({ source: 'onet' });
    const onetEnriched = await Job.countDocuments({ source: 'onet', enrichedAt: { $exists: true } });
    console.log(`  O*NET: ${onetEnriched}/${onetTotal} (${(onetEnriched/onetTotal*100).toFixed(1)}%)`);

    // Par secteur
    console.log('\n🏢 PAR SECTEUR:');
    const sectors = await Job.aggregate([
      { $match: { sector: { $exists: true } } },
      { $group: { _id: '$sector', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    sectors.forEach(s => {
      console.log(`  ${s._id}: ${s.count} métiers`);
    });

    // Derniers métiers enrichis
    console.log('\n🕐 DERNIERS ENRICHISSEMENTS:');
    const recent = await Job.find({ enrichedAt: { $exists: true } })
      .sort({ enrichedAt: -1 })
      .limit(5)
      .select('title sector enrichedAt');

    recent.forEach(job => {
      const time = new Date(job.enrichedAt).toLocaleTimeString('fr-FR');
      console.log(`  [${time}] ${job.title} (${job.sector || 'N/A'})`);
    });

    console.log('\n' + '='.repeat(50));

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

checkStatus();
