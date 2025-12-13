/**
 * Test avec les bons endpoints trouvés dans la documentation
 */

require('dotenv').config();
const axios = require('axios');

async function testCorrectEndpoint() {
  console.log('\n' + '='.repeat(70));
  console.log('  🎯 TEST AVEC LES VRAIS ENDPOINTS');
  console.log('='.repeat(70) + '\n');

  const clientId = process.env.FRANCE_TRAVAIL_CLIENT_ID;
  const clientSecret = process.env.FRANCE_TRAVAIL_CLIENT_SECRET;

  // Endpoints trouvés dans la documentation
  const apiConfigs = [
    {
      name: 'ROME Métiers',
      scope: 'api_rome-metiersv1',
      baseURL: 'https://api.francetravail.io/partenaire/rome-metiers/v1',
      endpoints: [
        '/metiers/appellation',
        '/metiers',
        '/metier/{code}',
        '/appellations',
        '/appellation/{code}'
      ]
    },
    {
      name: 'ROME Compétences',
      scope: 'api_rome-competencesv1',
      baseURL: 'https://api.francetravail.io/partenaire/rome-competences/v1',
      endpoints: [
        '/competences',
        '/competence/{code}',
        '/savoirs',
        '/savoir-faire'
      ]
    },
    {
      name: 'ROME Contextes',
      scope: 'api_rome-contextesv1',
      baseURL: 'https://api.francetravail.io/partenaire/rome-contextes/v1',
      endpoints: [
        '/contextes',
        '/contexte/{code}'
      ]
    },
    {
      name: 'ROME Fiches Métiers',
      scope: 'nomenclatureRome',
      baseURL: 'https://api.francetravail.io/partenaire/rome-fiches-metiers/v1',
      endpoints: [
        '/fiches',
        '/fiche/{code}',
        '/metiers'
      ]
    }
  ];

  const authURL = 'https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire';

  for (const config of apiConfigs) {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`  🔑 ${config.name}`);
    console.log(`  Scope: ${config.scope}`);
    console.log('═'.repeat(70) + '\n');

    // Obtenir un token
    let token;
    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      params.append('scope', config.scope);

      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

      const response = await axios.post(authURL, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`
        }
      });

      token = response.data.access_token;
      console.log(`✅ Token obtenu: ${token.substring(0, 20)}...\n`);
    } catch (error) {
      console.log(`❌ Échec d'obtention du token`);
      console.log(`   Erreur: ${error.response?.data || error.message}\n`);
      continue;
    }

    // Tester chaque endpoint
    console.log('📡 Test des endpoints:\n');

    for (const endpoint of config.endpoints) {
      // Remplacer {code} par un exemple si nécessaire
      let testEndpoint = endpoint;
      if (endpoint.includes('{code}')) {
        testEndpoint = endpoint.replace('{code}', 'M1805'); // Code pour Développeur web
      }

      const fullURL = `${config.baseURL}${testEndpoint}`;

      try {
        const response = await axios.get(fullURL, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          },
          timeout: 5000
        });

        console.log(`   ✅ ${endpoint}`);
        console.log(`      URL: ${fullURL}`);
        console.log(`      Status: ${response.status}`);

        if (Array.isArray(response.data)) {
          console.log(`      Type: Array (${response.data.length} éléments)`);
          if (response.data.length > 0) {
            console.log(`      Premier élément:`);
            console.log(`      ${JSON.stringify(response.data[0], null, 2).split('\n').slice(0, 10).join('\n      ')}`);
          }
        } else if (typeof response.data === 'object') {
          console.log(`      Type: Object`);
          console.log(`      Clés: ${Object.keys(response.data).join(', ')}`);
          console.log(`      Données:`);
          console.log(`      ${JSON.stringify(response.data, null, 2).split('\n').slice(0, 15).join('\n      ')}`);
        }
        console.log('');

      } catch (error) {
        const status = error.response?.status;
        const statusText = error.response?.statusText;
        const errorData = error.response?.data;

        if (status === 404) {
          console.log(`   ⚠️  ${endpoint} - 404 Not Found (endpoint n'existe peut-être pas)`);
        } else if (status === 401) {
          console.log(`   ❌ ${endpoint} - 401 Unauthorized (scope insuffisant)`);
        } else if (status) {
          console.log(`   ❌ ${endpoint} - ${status} ${statusText}`);
          if (errorData) {
            console.log(`      Erreur: ${JSON.stringify(errorData)}`);
          }
        } else {
          console.log(`   ❌ ${endpoint} - ${error.message}`);
        }
        console.log('');
      }

      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('  ✅ TESTS TERMINÉS');
  console.log('='.repeat(70) + '\n');
}

testCorrectEndpoint()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Erreur:', error.message);
    process.exit(1);
  });
