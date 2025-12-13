const axios = require('axios');
require('dotenv').config();

async function testOnetAPI() {
  try {
    const baseUrl = 'https://services.onetcenter.org/ws';
    const auth = Buffer.from(`${process.env.ONET_USERNAME}:${process.env.ONET_PASSWORD}`).toString('base64');

    console.log('🔍 Test 1: /mnm/careers/ (My Next Move careers)');
    const response1 = await axios.get(`${baseUrl}/mnm/careers/`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'User-Agent': 'career-orientation-app',
      }
    });
    console.log(`Nombre de métiers retournés: ${response1.data.career?.length || 0}`);
    console.log('Structure:', Object.keys(response1.data));

    console.log('\n🔍 Test 2: /online/occupations/ (Liste complète)');
    try {
      const response2 = await axios.get(`${baseUrl}/online/occupations/`, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'User-Agent': 'career-orientation-app',
        }
      });
      console.log('Réponse:', JSON.stringify(response2.data, null, 2).substring(0, 500));
    } catch (error) {
      console.log('Erreur:', error.response?.status, error.response?.data);
    }

  } catch (error) {
    console.error('Erreur:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testOnetAPI();
