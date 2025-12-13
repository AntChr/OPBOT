require('dotenv').config();
const Job = require('../src/models/Job');
const mongoose = require('mongoose');

async function find() {
  await mongoose.connect(process.env.MONGO_URI);

  const jobs = await Job.find({
    $or: [
      { title: /flor|garden|landscap|horti|plant|flower|nurser/i },
      { description: /flor|garden|landscap|horti|plant|flower|nurser/i }
    ]
  }).limit(30);

  console.log(`\n🌸 Jobs liés aux fleurs/jardins: ${jobs.length}\n`);

  jobs.forEach(j => {
    console.log(`- ${j.title}`);
    // Vérifier le traitVector
    const traits = Array.from(j.traitVector.entries())
      .filter(([k, v]) => v > 0)
      .map(([k, v]) => `${k}:${v}`)
      .join(', ');
    if (traits) {
      console.log(`  Traits: ${traits}`);
    }
  });

  process.exit(0);
}

find().catch(err => {
  console.error(err);
  process.exit(1);
});
