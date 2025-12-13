const axios = require('axios');

axios.get('http://localhost:5000/api/conversations/6922d8c6cf33f401a3c0ce95')
  .then(r => {
    const profile = r.data.buildingProfile;
    console.log('\n=== PROFIL ===\n');
    console.log('Intérêts:');
    if (profile.interests) {
      profile.interests.forEach(i => console.log(`  - ${i.domain} (niv ${i.level})`));
    }
    console.log('\nTraits (score > 0):');
    let count = 0;
    for (const [k, v] of Object.entries(profile.detectedTraits)) {
      if (v.score > 0) {
        console.log(`  - ${k}: ${(v.score*100).toFixed(0)}%`);
        count++;
      }
    }
    if (count === 0) console.log('  (aucun)');

    console.log('\n=== RECOMMANDATIONS ===\n');
    const recs = r.data.jobRecommendations || [];
    console.log(`Nombre: ${recs.length}`);
    if (recs.length > 0) {
      console.log('\nTop 5:');
      recs.slice(0, 5).forEach((r, i) => {
        console.log(`  ${i+1}. ${r.jobId?.title} (${(r.matchScore*100).toFixed(1)}%)`);
      });
    }
  })
  .catch(e => console.error('Erreur:', e.message));
