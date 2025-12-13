const axios = require('axios');

async function testImproved() {
  try {
    console.log('\n🚀 TEST AVEC AMÉLIORATION PROFILE\n');

    // 1. Créer une conversation
    const userId = new (require('mongoose')).Types.ObjectId().toString();
    const startResp = await axios.post('http://localhost:5000/api/conversations/start', {
      userId: userId
    });
    const convId = startResp.data.conversationId;
    console.log(`✓ Conversation créée: ${convId}\n`);

    // 2. Envoyer des messages sur les animaux
    const messages = [
      "Je suis vraiment passionné par les animaux",
      "J'adore les soigner et les éduquer",
      "C'est mon rêve de faire une carrière avec les animaux",
      "J'aime les petits animaux domestiques"
    ];

    console.log('📝 Envoi des messages...\n');
    for (const msg of messages) {
      console.log(`  Message: "${msg.substring(0, 40)}..."`);
      await axios.post(`http://localhost:5000/api/conversations/${convId}/messages`, { message: msg });
      await new Promise(r => setTimeout(r, 2000));
    }

    // 3. Récupérer les résultats
    console.log('\n⏳ Récupération des résultats...\n');
    const convResp = await axios.get(`http://localhost:5000/api/conversations/${convId}`);
    const data = convResp.data;

    // Afficher le profil
    const profile = data.buildingProfile;
    console.log('📊 Profil détecté:');
    if (profile.interests && profile.interests.length > 0) {
      console.log('   Intérêts:', profile.interests.map(i => `${i.domain}(${i.level})`).join(', '));
    }
    if (profile.detectedTraits) {
      const traits = Object.entries(profile.detectedTraits)
        .filter(([_, d]) => d.score > 0)
        .slice(0, 3)
        .map(([k, v]) => `${k}(${(v.score*100).toFixed(0)}%)`)
        .join(', ');
      if (traits) console.log('   Traits:', traits);
    }

    // Afficher les recommandations
    const recs = data.jobRecommendations || [];
    console.log(`\n💼 Recommandations: ${recs.length}\n`);

    if (recs.length > 0) {
      console.log('🏆 TOP 3:\n');
      recs.slice(0, 3).forEach((r, i) => {
        const title = r.jobId?.title || 'Unknown';
        const score = (r.matchScore * 100).toFixed(1);
        console.log(`  ${i+1}. ${title} (${score}%)`);
      });

      const soigneur = recs.find(r => r.jobId?.title?.toLowerCase().includes('soigneur'));
      console.log('\n---');
      if (soigneur) {
        const pos = recs.indexOf(soigneur) + 1;
        const score = (soigneur.matchScore * 100).toFixed(1);
        console.log(`✅ SOIGNEUR ANIMALIER TROUVÉ!`);
        console.log(`   Position: #${pos}`);
        console.log(`   Score: ${score}%`);
      } else {
        console.log(`❌ Pas de soigneur animalier dans les recommandations`);
        console.log('\n📋 Tous les jobs recommandés:');
        recs.forEach((r, i) => {
          console.log(`   ${i+1}. ${r.jobId?.title || 'Unknown'}`);
        });
      }
    } else {
      console.log('⚠️ Aucune recommandation générée');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    if (error.response?.data) {
      console.error('Réponse:', error.response.data);
    }
    process.exit(1);
  }
}

testImproved();
