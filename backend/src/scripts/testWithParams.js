/**
 * Test avec paramètres query
 */

require('dotenv').config();
const axios = require('axios');

async function testWithParams() {
  console.log('\n' + '='.repeat(70));
  console.log('  🎯 TEST AVEC PARAMÈTRES DE REQUÊTE');
  console.log('='.repeat(70) + '\n');

  const clientId = process.env.FRANCE_TRAVAIL_CLIENT_ID;
  const clientSecret = process.env.FRANCE_TRAVAIL_CLIENT_SECRET;
  const authURL = 'https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire';

  // Configuration de l'API Métiers
  const scope = 'api_rome-metiersv1';

  console.log('🔑 Obtention du token...\n');

  let token;
  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('scope', scope);

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
    console.log('❌ Échec d\'obtention du token\n');
    return;
  }

  // Tests avec différentes configurations
  const tests = [
    {
      name: 'Sans paramètres',
      url: 'https://api.francetravail.io/partenaire/rome-metiers/v1/metiers/appellation'
    },
    {
      name: 'Avec champs vide',
      url: 'https://api.francetravail.io/partenaire/rome-metiers/v1/metiers/appellation?champs='
    },
    {
      name: 'Avec limit',
      url: 'https://api.francetravail.io/partenaire/rome-metiers/v1/metiers/appellation?limit=10'
    },
    {
      name: 'Juste /metiers',
      url: 'https://api.francetravail.io/partenaire/rome-metiers/v1/metiers'
    },
    {
      name: 'Métier spécifique M1805',
      url: 'https://api.francetravail.io/partenaire/rome-metiers/v1/metiers/M1805'
    },
    {
      name: 'Appellations avec code',
      url: 'https://api.francetravail.io/partenaire/rome-metiers/v1/metiers/M1805/appellations'
    }
  ];

  console.log('📡 Test des endpoints avec différents paramètres:\n');
  console.log('─'.repeat(70) + '\n');

  for (const test of tests) {
    console.log(`🧪 ${test.name}`);
    console.log(`   URL: ${test.url}\n`);

    try {
      const response = await axios.get(test.url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        timeout: 5000
      });

      console.log(`   ✅ SUCCÈS! Status: ${response.status}\n`);

      if (Array.isArray(response.data)) {
        console.log(`   📊 Type: Array`);
        console.log(`   📈 Nombre d'éléments: ${response.data.length}\n`);

        if (response.data.length > 0) {
          console.log(`   📋 Premier élément:\n`);
          const first = response.data[0];
          const preview = JSON.stringify(first, null, 2);
          const lines = preview.split('\n').slice(0, 20);
          lines.forEach(line => console.log(`      ${line}`));
          if (preview.split('\n').length > 20) {
            console.log(`      ... (${preview.split('\n').length - 20} lignes supplémentaires)`);
          }
          console.log('');
        }
      } else if (typeof response.data === 'object') {
        console.log(`   📊 Type: Object\n`);
        console.log(`   🔑 Clés disponibles: ${Object.keys(response.data).join(', ')}\n`);
        console.log(`   📋 Données:\n`);
        const preview = JSON.stringify(response.data, null, 2);
        const lines = preview.split('\n').slice(0, 30);
        lines.forEach(line => console.log(`      ${line}`));
        if (preview.split('\n').length > 30) {
          console.log(`      ... (${preview.split('\n').length - 30} lignes supplémentaires)`);
        }
        console.log('');
      }

      console.log('   ' + '═'.repeat(66) + '\n');

      // Si on trouve un endpoint qui marche, on arrête
      console.log('   🎉 ENDPOINT FONCTIONNEL TROUVÉ!\n');
      console.log('   💾 Configuration à utiliser:');
      console.log(`      Base URL: https://api.francetravail.io/partenaire/rome-metiers/v1`);
      console.log(`      Scope: api_rome-metiersv1`);
      console.log(`      Endpoint: ${test.url.replace('https://api.francetravail.io/partenaire/rome-metiers/v1', '')}\n`);

      break; // Arrêter après le premier succès

    } catch (error) {
      const status = error.response?.status;
      const statusText = error.response?.statusText;
      const errorData = error.response?.data;

      if (status === 403) {
        console.log(`   ❌ 403 Forbidden`);
        if (errorData) {
          console.log(`   Détails: ${JSON.stringify(errorData)}`);
        }
      } else if (status === 404) {
        console.log(`   ⚠️  404 Not Found - Endpoint n'existe pas`);
      } else if (status === 401) {
        console.log(`   ❌ 401 Unauthorized - Problème d'authentification`);
      } else if (status) {
        console.log(`   ❌ ${status} ${statusText}`);
        if (errorData) {
          console.log(`   Détails: ${JSON.stringify(errorData)}`);
        }
      } else {
        console.log(`   ❌ ${error.message}`);
      }
      console.log('');
    }

    await new Promise(resolve => setTimeout(resolve, 1000)); // Respecter le rate limit
  }

  console.log('='.repeat(70) + '\n');
}

testWithParams()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Erreur:', error.message);
    process.exit(1);
  });
