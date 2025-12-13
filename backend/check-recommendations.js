const axios = require('axios');

async function checkRecommendations(conversationId) {
  try {
    const resp = await axios.get(`http://localhost:5000/api/conversations/${conversationId}`);
    const data = resp.data;
    const recommendations = data.jobRecommendations || [];

    console.log('\n📊 RÉSULTATS\n');
    console.log(`Nombre de recommandations: ${recommendations.length}`);

    if (recommendations.length > 0) {
      console.log('\nTOP 5:\n');
      recommendations.slice(0, 5).forEach((r, i) => {
        const title = r.jobId?.title || 'Unknown';
        const score = r.matchScore ? (r.matchScore * 100).toFixed(1) : 'N/A';
        console.log(`${i+1}. ${title}`);
        console.log(`   Score: ${score}%\n`);
      });

      const soigneur = recommendations.find(r =>
        r.jobId?.title?.toLowerCase().includes('soigneur')
      );

      console.log('---\n');
      if (soigneur) {
        const pos = recommendations.indexOf(soigneur) + 1;
        const score = (soigneur.matchScore * 100).toFixed(1);
        console.log(`✅ SOIGNEUR ANIMALIER TROUVÉ!`);
        console.log(`   Position: #${pos}`);
        console.log(`   Score: ${score}%`);
      } else {
        console.log(`❌ Pas de soigneur trouvé`);
      }
    } else {
      console.log('❌ Pas de recommandations');
    }

    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error.message);
    process.exit(1);
  }
}

const convId = process.argv[2];
if (!convId) {
  console.error('Usage: node check-recommendations.js <conversationId>');
  process.exit(1);
}

checkRecommendations(convId);
