const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

const API_URL = 'http://localhost:5000/api/conversations';

async function testAnimalLover() {
  try {
    // 1. Démarrer une conversation
    console.log('\n🚀 DÉMARRAGE CONVERSATION\n');
    const userId = new mongoose.Types.ObjectId().toString();
    const startResp = await axios.post(`${API_URL}/start`, {
      userId: userId
    });

    const conversationId = startResp.data.conversationId;
    console.log(`✓ Conversation créée: ${conversationId}`);
    console.log(`\nMessage initial:\n"${startResp.data.message}"\n`);

    // 2. Messages du scénario animal lover
    const messages = [
      "Je suis vraiment passionné par les animaux, c'est ma plus grande passion",
      "Je veux absolument travailler avec les animaux au quotidien",
      "Surtout les soins, nourrir, éduquer les petits animaux domestiques",
      "Je suis très patient et attentif aux détails",
      "J'aime les routines régulières et prévisibles",
      "C'est mon rêve depuis l'enfance de travailler avec les animaux",
      "Je veux vraiment faire une carrière dans ce domaine",
      "Ça va être mon métier je suis sûr"
    ];

    console.log('💬 ENVOI DES MESSAGES\n');
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      console.log(`[${i+1}/8] "${msg.substring(0, 60)}..."`);

      await axios.post(`${API_URL}/${conversationId}/messages`, {
        message: msg
      });

      // Attendre un peu entre les messages
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // 3. Récupérer les recommandations
    console.log('\n\n📊 RÉCUPÉRATION DES RECOMMANDATIONS\n');
    const convResp = await axios.get(`${API_URL}/${conversationId}`);
    const recommendations = convResp.data.jobRecommendations || [];

    console.log(`Nombre total de recommandations: ${recommendations.length}\n`);

    if (recommendations.length > 0) {
      console.log('TOP 5 RECOMMANDATIONS:\n');
      recommendations.slice(0, 5).forEach((r, i) => {
        const title = r.jobId?.title || 'Unknown';
        const score = r.matchScore ? (r.matchScore * 100).toFixed(1) : 'N/A';
        console.log(`${i+1}. ${title}`);
        console.log(`   Score: ${score}%\n`);
      });

      // Chercher soigneur animalier
      const soigneur = recommendations.find(r =>
        r.jobId?.title?.toLowerCase().includes('soigneur')
      );

      console.log('---\n');
      if (soigneur) {
        console.log('✅ SOIGNEUR ANIMALIER TROUVÉ!');
        console.log(`   Position: ${recommendations.indexOf(soigneur) + 1}`);
        console.log(`   Score: ${(soigneur.matchScore * 100).toFixed(1)}%`);
      } else {
        console.log('❌ SOIGNEUR ANIMALIER NON TROUVÉ');
        console.log('\nTous les métiers recommandés:');
        recommendations.forEach((r, i) => {
          console.log(`${i+1}. ${r.jobId?.title || 'Unknown'}`);
        });
      }
    } else {
      console.log('❌ Pas de recommandations');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.response?.data) {
      console.error('Détails:', error.response.data);
    }
    process.exit(1);
  }
}

testAnimalLover();
