const mongoose = require('mongoose');
require('dotenv').config();
const Job = require('./src/models/Job');
const ClaudeService = require('./src/services/ClaudeService');

async function test() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true, useUnifiedTopology: true});

    const claudeService = new ClaudeService();

    const profile = {
      interests: [ { domain: 'animals', level: 5 } ],
      detectedTraits: {
        'empathy': { score: 0.85 },
        'service': { score: 0.80 }
      }
    };

    // Tous les jobs avec soigneur
    const jobs = await Job.find({
      title: { $regex: 'soigneur', $options: 'i' }
    });

    console.log('\nJobs trouvés avec soigneur:', jobs.length);
    const scoredJobs = jobs.map(j => ({
      title: j.title,
      score: claudeService.scoreJobRelevance(j, profile)
    })).sort((a, b) => b.score - a.score);

    scoredJobs.forEach((item, i) => {
      const pct = (item.score * 100).toFixed(0);
      console.log(`${i+1}. ${item.title} : ${pct}%`);
    });

    process.exit(0);
  } catch(err) {
    console.error(err.message);
    process.exit(1);
  }
}

test();
