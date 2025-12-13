/**
 * View enriched job details
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Job = require('../models/Job');

async function viewJob() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const job = await Job.findOne({ romeCode: 'M1805' });

    if (!job) {
      console.log('❌ Job M1805 not found');
      return;
    }

    console.log('='.repeat(70));
    console.log(`  ${job.title} (${job.romeCode})`);
    console.log('='.repeat(70));
    console.log(`\n📝 Description:\n${job.description}\n`);

    console.log(`💼 Sector: ${job.sector}`);
    console.log(`📚 Education: ${job.education || 'N/A'}`);
    console.log(`💰 Salary Range: ${job.salaryRange?.min || 'N/A'} - ${job.salaryRange?.max || 'N/A'}`);

    console.log(`\n🎯 RIASEC Codes: ${job.riasecCodes?.join(', ') || 'N/A'}\n`);

    console.log(`📊 Skills (${job.skills?.length || 0}):`);
    job.skills?.forEach((skill, idx) => {
      console.log(`  ${idx + 1}. ${skill}`);
    });

    console.log(`\n🧬 Trait Vector:`);
    const traits = Object.fromEntries(job.traitVector || []);
    Object.entries(traits)
      .sort(([, a], [, b]) => b - a)
      .forEach(([trait, value]) => {
        const bar = '█'.repeat(Math.round(value * 20));
        console.log(`  ${trait.padEnd(20)}: ${bar} ${(value * 100).toFixed(0)}%`);
      });

    console.log(`\n📈 Career Path:`);
    job.careerPath?.forEach((path, idx) => {
      console.log(`  ${idx + 1}. ${path}`);
    });

    console.log(`\n🌍 Work Environment:`);
    console.log(`  ${job.workEnvironment || 'N/A'}`);

    console.log(`\n🏷️  Metadata:`);
    console.log(`  Source: ${job.source}`);
    console.log(`  Quality: ${Math.round((job.dataQuality || 0) * 100)}%`);
    console.log(`  Enriched At: ${job.enrichedAt || 'Never'}`);
    console.log(`  Enriched Sources: ${job.enrichedSources?.join(', ') || 'None'}`);

    console.log('\n' + '='.repeat(70) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await mongoose.connection.close();
  }
}

viewJob()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
