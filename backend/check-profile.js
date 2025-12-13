const axios = require('axios');

async function checkProfile(conversationId) {
  try {
    const resp = await axios.get(`http://localhost:5000/api/conversations/${conversationId}`);
    const data = resp.data;

    console.log('\n📋 PROFIL DÉTECTÉ\n');
    console.log('Intérêts:');
    const profile = data.buildingProfile || {};
    if (profile.interests && profile.interests.length > 0) {
      profile.interests.forEach(i => {
        console.log(`  - ${i.domain} (niveau ${i.level})`);
      });
    } else {
      console.log('  (aucun)');
    }

    console.log('\nTraits:');
    let hasTraits = false;
    if (profile.detectedTraits) {
      for (const [trait, data] of Object.entries(profile.detectedTraits)) {
        if (data.score > 0) {
          hasTraits = true;
          console.log(`  - ${trait}: ${(data.score * 100).toFixed(0)}%`);
        }
      }
    }
    if (!hasTraits) {
      console.log('  (aucun)');
    }

    console.log('\nValeurs:');
    if (profile.values && profile.values.length > 0) {
      profile.values.forEach(v => {
        console.log(`  - ${v.value} (importance ${v.importance})`);
      });
    } else {
      console.log('  (aucune)');
    }

    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error.message);
    process.exit(1);
  }
}

const convId = process.argv[2];
if (!convId) {
  console.error('Usage: node check-profile.js <conversationId>');
  process.exit(1);
}

checkProfile(convId);
