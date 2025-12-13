require('dotenv').config();
const Job = require('../src/models/Job');
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);

  const jobs = await Job.find({
    title: /landscape architect|landscaping|floral designer/i
  });

  console.log(`\n🔍 Analyzing ${jobs.length} landscape/floral jobs\n`);

  for (const job of jobs) {
    console.log(`\n📋 ${job.title}`);
    console.log('Traits:');
    const traits = Array.from(job.traitVector.entries())
      .filter(([k, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);

    traits.forEach(([trait, value]) => {
      console.log(`  ${trait}: ${value}`);
    });

    // Calculer le match avec le vecteur utilisateur cible
    const userVector = {
      'creativity': 0.56,
      'design': 0.56,
      'independent': 0.56,
      'detail-oriented': 0.56,
      'service': 0.56
    };

    let dotProduct = 0;
    let magA = 0;
    let magB = 0;

    for (const [trait, jobValue] of job.traitVector.entries()) {
      const userValue = userVector[trait] || 0;
      dotProduct += jobValue * userValue;
      magA += userValue * userValue;
      magB += jobValue * jobValue;
    }

    const similarity = dotProduct / (Math.sqrt(magA) * Math.sqrt(magB));
    const matchPct = Math.round(similarity * 100);

    console.log(`\n  Match avec user (0.56 sur creativity, design, independent, detail-oriented, service): ${matchPct}%`);
  }

  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
