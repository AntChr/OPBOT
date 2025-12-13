const axios = require('axios');

async function testFlowerProfile() {
  try {
    console.log('🌸 === TEST PROFIL FLEURS ===\n');

    // 1. Démarrer conversation
    console.log('1️⃣ Démarrage conversation...');
    const startRes = await axios.post('http://localhost:5000/api/conversations/start', {
      userId: 'test_user_' + Date.now()
    });
    const conversationId = startRes.data.conversationId;
    console.log('✅ Conversation ID:', conversationId);
    console.log('Message initial:', startRes.data.message.substring(0, 100) + '...\n');

    // 2. Message sur les fleurs
    console.log('2️⃣ Envoi message sur les fleurs...');
    const msg1 = await axios.post(`http://localhost:5000/api/conversations/${conversationId}/messages`, {
      message: "J'adore les fleurs! Je passe tout mon temps dans mon jardin à cultiver des roses, des tulipes et des orchidées. J'aime planter, arroser et voir mes plantes grandir."
    });
    console.log('✅ Réponse:', msg1.data.response.substring(0, 150) + '...');
    console.log('Analyse:', msg1.data.analysis);

    // 3. Continuer la conversation
    console.log('\n3️⃣ Message de suivi...');
    const msg2 = await axios.post(`http://localhost:5000/api/conversations/${conversationId}/messages`, {
      message: "J'aimerais vraiment travailler avec les végétaux. Je trouve la nature apaisante et j'aime créer de beaux espaces verts."
    });
    console.log('✅ Réponse:', msg2.data.response.substring(0, 150) + '...');

    // Attendre les recommandations
    if (msg2.data.jobRecommendations) {
      console.log('\n🎯 === RECOMMANDATIONS ===');
      for (const rec of msg2.data.jobRecommendations.slice(0, 5)) {
        const job = await axios.get(`http://localhost:5000/api/test/jobs`);
        console.log(`- ${rec.jobId} (${(rec.matchScore * 100).toFixed(0)}%)`);
      }
    }

    console.log('\n✅ Test terminé!');
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

testFlowerProfile();
