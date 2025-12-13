require('dotenv').config();
const Job = require('../src/models/Job');
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);

  const jobs = await Job.find({ source: 'onet' }).limit(10);

  console.log(`\n=== Checking ${jobs.length} O*NET jobs ===\n`);

  let countWithNonZeroVector = 0;
  let countAllZero = 0;

  for (const job of jobs) {
    const hasNonZeroValue = Array.from(job.traitVector.values()).some(v => v > 0);

    if (hasNonZeroValue) {
      countWithNonZeroVector++;
      console.log(`✅ ${job.title}`);
      const nonZeroTraits = Array.from(job.traitVector.entries())
        .filter(([k, v]) => v > 0)
        .map(([k, v]) => `${k}:${v}`);
      console.log(`   Traits: ${nonZeroTraits.join(', ')}\n`);
    } else {
      countAllZero++;
      console.log(`❌ ${job.title} - ALL ZERO`);
      console.log(`   Skills: ${job.skills.length}, Tags: ${job.tags.length}\n`);
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Jobs with non-zero traits: ${countWithNonZeroVector}`);
  console.log(`Jobs with all-zero traits: ${countAllZero}`);

  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
