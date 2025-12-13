const axios = require('axios');

async function testFinal() {
  try {
    console.log('\n🚀 TEST FINAL - PROFIL ANIMAL LOVER\n');

    // 1. Créer une conversation
    const userId = '671234567890abcdef123457';
    const startResp = await axios.post('http://localhost:5000/api/conversations/start', {
      userId: userId
    });

    const convId = startResp.data.conversationId;
    console.log(`Conversation: ${convId}\n`);

    // 2. Envoyer les messages
    const messages = [
      "Je suis passionné par les animaux depuis tout petit",
      "Surtout les soigner et les éduquer",
      "Les petits animaux domestiques c'est ma passion",
      "Je suis patient et attentif",
      "C'est vraiment ce que je veux faire",
      "Je rêve de faire une carrière avec les animaux"
    ];

    console.log('📝 Envoi des messages...\n');
    for (const msg of messages) {
      console.log(`Message: "${msg.substring(0, 50)}..."`);
      await axios.post(`http://localhost:5000/api/conversations/${convId}/messages`, {
        message: msg
      });
      await new Promise(r => setTimeout(r, 2000));
    }

    // 3. Vérifier les résultats
    console.log('\n\n📊 RÉSULTATS\n');
    const convResp = await axios.get(`http://localhost:5000/api/conversations/${convId}`);
    const data = convResp.data;

    const profile = data.buildingProfile;
    console.log('Profil détecté:');
    console.log('  Intérêts:', profile.interests.map(i => `${i.domain}(${i.level})`).join(', '));

    const recs = data.jobRecommendations || [];
    console.log(`\nRecommandations: ${recs.length}`);

    if (recs.length > 0) {
      console.log('\nTOP 5:');
      recs.slice(0, 5).forEach((r, i) => {
        const title = r.jobId?.title || 'Unknown';
        const score = (r.matchScore * 100).toFixed(1);
        console.log(`  ${i+1}. ${title} (${score}%)`);
      });

      const hasSoigneur = recs.some(r =>
        r.jobId?.title?.toLowerCase().includes('soigneur')
      );

      console.log('\n---');
      if (hasSoigneur) {
        console.log('✅ SOIGNEUR ANIMALIER TROUVÉ!');
      } else {
        console.log('❌ Pas de soigneur animalier');
        console.log('\nTous les métiers recommandés:');
        recs.forEach((r, i) => {
          console.log(`  ${i+1}. ${r.jobId?.title}`);
        });
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error.message);
    process.exit(1);
  }
}

testFinal();
