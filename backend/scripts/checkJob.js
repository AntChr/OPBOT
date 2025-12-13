require('dotenv').config();
const Job = require('../src/models/Job');
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/career-orientation');

  const job = await Job.findOne({ title: /education specialist/i });

  if (!job) {
    console.log('No job found');
    process.exit(0);
  }

  console.log('\n=== JOB CHECK ===');
  console.log('Title:', job.title);
  console.log('Source:', job.source);
  console.log('traitVector type:', job.traitVector instanceof Map ? 'Map' : typeof job.traitVector);

  if (job.traitVector instanceof Map) {
    console.log('traitVector size:', job.traitVector.size);
    console.log('traitVector non-zero values:');
    for (const [key, value] of job.traitVector.entries()) {
      if (value > 0) {
        console.log(`  ${key}: ${value}`);
      }
    }
    const allZero = Array.from(job.traitVector.values()).every(v => v === 0);
    console.log('All values are zero?', allZero);
  } else {
    console.log('traitVector:', job.traitVector);
  }

  console.log('\nSkills:', job.skills.slice(0, 3));
  console.log('Tags:', job.tags);

  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
