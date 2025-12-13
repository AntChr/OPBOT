require('dotenv').config();
const Job = require('../src/models/Job');
const mongoose = require('mongoose');
const { TRAIT_DIMENSIONS } = require('../src/models/Job');

// Mapping de mots-clés vers des traits
const KEYWORD_TO_TRAITS = {
  // Analytical
  'analy': ['analytical'],
  'research': ['analytical', 'problem-solving'],
  'data': ['analytical', 'detail-oriented'],
  'scientist': ['analytical', 'problem-solving'],
  'engineer': ['analytical', 'problem-solving', 'detail-oriented'],
  'account': ['analytical', 'detail-oriented', 'organizational'],
  'audit': ['analytical', 'detail-oriented'],
  'actuar': ['analytical', 'detail-oriented'],
  'financial': ['analytical', 'detail-oriented'],

  // Creativity
  'design': ['creativity', 'design', 'innovation'],
  'art': ['creativity', 'design'],
  'creative': ['creativity', 'innovation'],
  'music': ['creativity'],
  'writer': ['creativity', 'communication'],
  'actor': ['creativity', 'communication'],
  'perform': ['creativity', 'communication'],
  'entertainment': ['creativity', 'communication'],

  // Teaching & Education
  'teacher': ['teaching', 'communication', 'empathy'],
  'instructor': ['teaching', 'communication'],
  'educat': ['teaching', 'empathy', 'communication'],
  'professor': ['teaching', 'analytical', 'communication'],
  'train': ['teaching', 'communication'],

  // Healthcare & Service
  'nurs': ['empathy', 'service', 'detail-oriented'],
  'care': ['empathy', 'service'],
  'therap': ['empathy', 'service', 'communication'],
  'doctor': ['analytical', 'problem-solving', 'empathy'],
  'medic': ['analytical', 'empathy', 'detail-oriented'],
  'health': ['empathy', 'service'],
  'acupunctur': ['empathy', 'service', 'detail-oriented'],
  'physician': ['analytical', 'problem-solving', 'empathy'],

  // Business & Management
  'manag': ['leadership', 'organizational', 'communication'],
  'executive': ['leadership', 'analytical', 'organizational'],
  'director': ['leadership', 'organizational', 'communication'],
  'supervis': ['leadership', 'organizational', 'communication'],
  'business': ['analytical', 'communication', 'organizational'],

  // Technical
  'software': ['analytical', 'problem-solving', 'detail-oriented'],
  'computer': ['analytical', 'problem-solving', 'detail-oriented'],
  'program': ['analytical', 'problem-solving', 'detail-oriented'],
  'technical': ['analytical', 'problem-solving', 'detail-oriented'],
  'mechanic': ['problem-solving', 'detail-oriented', 'independent'],

  // Social & Communication
  'social': ['empathy', 'communication', 'service'],
  'counsel': ['empathy', 'communication', 'service'],
  'advisor': ['communication', 'empathy', 'analytical'],
  'sales': ['communication', 'service'],
  'customer': ['communication', 'service', 'empathy'],

  // Craft & Physical
  'construct': ['independent', 'detail-oriented', 'problem-solving'],
  'craft': ['creativity', 'detail-oriented', 'independent'],
  'repair': ['problem-solving', 'detail-oriented', 'independent'],
  'install': ['detail-oriented', 'problem-solving'],

  // Organization & Administration
  'administ': ['organizational', 'detail-oriented', 'communication'],
  'clerk': ['detail-oriented', 'organizational'],
  'coordinator': ['organizational', 'communication', 'collaborative'],
  'plann': ['analytical', 'organizational', 'detail-oriented'],

  // Leadership & Team
  'leader': ['leadership', 'communication', 'organizational'],
  'team': ['teamwork', 'collaborative', 'communication'],
  'collabor': ['collaborative', 'teamwork', 'communication'],

  // Agriculture & Horticulture
  'agricult': ['independent', 'detail-oriented', 'problem-solving'],
  'farm': ['independent', 'detail-oriented'],
  'horti': ['creativity', 'independent', 'detail-oriented', 'service'],
  'landscap': ['creativity', 'independent', 'detail-oriented', 'design'],
  'garden': ['creativity', 'independent', 'detail-oriented', 'service'],
  'plant': ['detail-oriented', 'independent', 'service'],
  'flor': ['creativity', 'service', 'communication'],
};

function generateTraitVectorFromText(text) {
  const vector = new Map();
  TRAIT_DIMENSIONS.forEach(trait => vector.set(trait, 0));

  const lowerText = text.toLowerCase();
  const traitScores = new Map();

  // Initialize all traits to 0
  TRAIT_DIMENSIONS.forEach(trait => traitScores.set(trait, 0));

  // Count keyword matches
  for (const [keyword, traits] of Object.entries(KEYWORD_TO_TRAITS)) {
    if (lowerText.includes(keyword)) {
      traits.forEach(trait => {
        const currentScore = traitScores.get(trait) || 0;
        traitScores.set(trait, currentScore + 0.3); // Increment by 0.3 per match
      });
    }
  }

  // Normalize and cap at 1.0
  for (const [trait, score] of traitScores.entries()) {
    vector.set(trait, Math.min(1.0, score));
  }

  return vector;
}

async function updateTraitVectors() {
  await mongoose.connect(process.env.MONGO_URI);

  const jobs = await Job.find();
  console.log(`\n🔄 Updating trait vectors for ${jobs.length} jobs...\n`);

  let updated = 0;
  let alreadyGood = 0;

  for (const job of jobs) {
    // Always regenerate traitVector (force update)
    const text = `${job.title} ${job.description}`;
    job.traitVector = generateTraitVectorFromText(text);

    await job.save();
    updated++;

    if (updated % 100 === 0) {
      console.log(`✅ Updated ${updated} jobs...`);
    }
  }

  console.log(`\n=== DONE ===`);
  console.log(`✅ Updated: ${updated}`);
  console.log(`⏭️  Already good: ${alreadyGood}`);
  console.log(`📊 Total: ${jobs.length}`);

  process.exit(0);
}

updateTraitVectors().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
