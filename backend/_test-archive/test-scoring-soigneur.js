const mongoose = require('mongoose');
require('dotenv').config();
const Job = require('./src/models/Job');
const ClaudeService = require('./src/services/ClaudeService');

async function testScoring() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true, useUnifiedTopology: true});

    const claudeService = new ClaudeService();

    // Profil d'amoureux des animaux
    const profile = {
      interests: [
        { domain: 'animals', level: 5 }
      ],
      detectedTraits: {
        'empathy': { score: 0.85 },
        'service': { score: 0.80 }
      }
    };

    // Chercher soigneur animalier et d'autres jobs
    const jobs = await Job.find({
      title: { $regex: 'soigneur|veterinary|animal|worker', $options: 'i' }
    }).limit(20);

    console.log('\n=== SCORING TEST AVEC "soigneur" KEYWORD ===\n');
    console.log('Profil: animals (niv 5)\n');

    const scores = [];
    jobs.forEach(job => {
      const score = claudeService.scoreJobRelevance(job, profile);
      scores.push({ title: job.title, score });
    });

    // Trier par score
    scores.sort((a, b) => b.score - a.score);

    console.log('Jobs (triés par score):\n');
    scores.forEach((item, i) => {
      const pct = (item.score * 100).toFixed(1);
      console.log(`${i+1}. ${item.title.padEnd(50)} ${pct}%`);
    });

    const soigneur = scores.find(s => s.title.toLowerCase().includes('soigneur'));
    console.log('\n---');
    if (soigneur) {
      console.log(`✅ "Soigneur" TROUVÉ avec score: ${(soigneur.score*100).toFixed(1)}%`);
    } else {
      console.log('❌ Pas de soigneur trouvé');
    }

    process.exit(0);
  } catch(error) {
    console.error('Erreur:', error.message);
    process.exit(1);
  }
}

testScoring();
