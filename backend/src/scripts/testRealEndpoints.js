/**
 * Test des vrais endpoints de l'API France Travail
 */

require('dotenv').config();
const axios = require('axios');

async function testRealEndpoints() {
  console.log('\n' + '='.repeat(70));
  console.log('  🧪 TEST DES ENDPOINTS RÉELS FRANCE TRAVAIL');
  console.log('='.repeat(70) + '\n');

  const clientId = process.env.FRANCE_TRAVAIL_CLIENT_ID;
  const clientSecret = process.env.FRANCE_TRAVAIL_CLIENT_SECRET;

  // Scopes valides trouvés
  const scopes = [
    'nomenclatureRome',
    'api_rome-metiersv1',
    'api_rome-competencesv1'
  ];

  // Différentes URLs de base possibles
  const baseURLs = [
    'https://api.francetravail.io/partenaire/rome/v1',
    'https://api.francetravail.io/partenaire/rome-metiers/v1',
    'https://api.francetravail.io/partenaire/rome-competences/v1',
    'https://api.francetravail.io/partenaire/rome-fiches-metiers/v1',
    'https://api.francetravail.io/partenaire/infotravail/v1',
    'https://api.francetravail.io/partenaire/rome4',
  ];

  // Endpoints possibles
  const endpoints = [
    '/metier',
    '/metiers',
    '/appellation',
    '/appellations',
    '/competence',
    '/competences',
    '/contexte',
    '/contextes',
    '/fiches',
    '/fiches-metiers',
    ''
  ];

  const authURL = 'https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire';

  for (const scope of scopes) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`  🔑 TEST AVEC SCOPE: "${scope}"`);
    console.log('='.repeat(70) + '\n');

    // Obtenir un token
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
      continue;
    }

    // Tester toutes les combinaisons d'URL + endpoint
    console.log('🔍 Test des endpoints...\n');

    let successCount = 0;

    for (const baseURL of baseURLs) {
      for (const endpoint of endpoints) {
        const fullURL = `${baseURL}${endpoint}`;

        try {
          const response = await axios.get(fullURL, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            },
            timeout: 3000
          });

          console.log(`   ✅ SUCCÈS! ${fullURL}`);
          console.log(`      Status: ${response.status}`);

          if (Array.isArray(response.data)) {
            console.log(`      Résultats: ${response.data.length} éléments`);
            if (response.data.length > 0) {
              console.log(`      Premier élément:`, JSON.stringify(response.data[0]).substring(0, 200) + '...');
            }
          } else if (typeof response.data === 'object') {
            console.log(`      Type: Object`);
            console.log(`      Clés:`, Object.keys(response.data).slice(0, 10).join(', '));
          }
          console.log('');

          successCount++;

          // Si on trouve un endpoint qui fonctionne, on peut arrêter
          if (successCount >= 3) {
            console.log('   🎉 Assez d\'endpoints trouvés, passage au scope suivant\n');
            break;
          }

        } catch (error) {
          // Ignorer les erreurs silencieusement pour réduire le bruit
          // On affiche seulement les succès
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (successCount >= 3) break;
    }

    if (successCount === 0) {
      console.log('   ⚠️  Aucun endpoint fonctionnel trouvé avec ce scope\n');
    } else {
      console.log(`   ✅ ${successCount} endpoint(s) fonctionnel(s) trouvé(s)\n`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('  ✅ TESTS TERMINÉS');
  console.log('='.repeat(70) + '\n');
}

testRealEndpoints()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Erreur:', error.message);
    process.exit(1);
  });
