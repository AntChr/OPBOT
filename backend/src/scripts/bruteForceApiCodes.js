/**
 * Recherche par force brute des codes d'API ROME corrects
 * Basé sur la structure: https://api.francetravail.io/partenaire/[code]/[version]/[resource]
 */

require('dotenv').config();
const axios = require('axios');

async function bruteForceApiCodes() {
  console.log('\n' + '='.repeat(70));
  console.log('  🔍 RECHERCHE DES CODES D\'API ROME PAR FORCE BRUTE');
  console.log('='.repeat(70) + '\n');

  const clientId = process.env.FRANCE_TRAVAIL_CLIENT_ID;
  const clientSecret = process.env.FRANCE_TRAVAIL_CLIENT_SECRET;

  // Codes d'API possibles basés sur les noms des APIs
  const apiCodes = [
    // Variantes pour "Métiers"
    'rome-metiers', 'rome-4-0-metiers', 'metiers', 'rome4-metiers',
    'romev1-metiers', 'rome', 'romev4',

    // Variantes pour "Compétences"
    'rome-competences', 'rome-4-0-competences', 'competences',

    // Variantes pour "Contextes"
    'rome-contextes', 'rome-4-0-contextes', 'contextes',

    // Variantes pour "Fiches métiers"
    'rome-fiches-metiers', 'rome-4-0-fiches-metiers', 'fiches-metiers',
    'fichesmetiers', 'nomenclature-rome', 'nomenclature',

    // Format court
    'rome4', 'romev1', 'rome-v1'
  ];

  // Versions possibles
  const versions = ['v1', 'v4', ''];

  // Ressources possibles
  const resources = [
    'metier', 'metiers',
    'appellation', 'appellations',
    'competence', 'competences',
    'contexte', 'contextes',
    'fiche', 'fiches',
    'ficheMetier', 'fichesMetiers'
  ];

  // Scopes valides
  const scopes = [
    { name: 'nomenclatureRome', scope: 'nomenclatureRome' },
    { name: 'métiers', scope: 'api_rome-metiersv1' },
    { name: 'compétences', scope: 'api_rome-competencesv1' }
  ];

  const authURL = 'https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire';

  let foundEndpoints = [];

  for (const scopeConfig of scopes) {
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`  🔑 Scope: ${scopeConfig.name} (${scopeConfig.scope})`);
    console.log('─'.repeat(70) + '\n');

    // Obtenir un token
    let token;
    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      params.append('scope', scopeConfig.scope);

      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

      const response = await axios.post(authURL, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`
        }
      });

      token = response.data.access_token;
      console.log(`✅ Token obtenu\n`);
    } catch (error) {
      console.log('❌ Échec d\'obtention du token\n');
      continue;
    }

    // Tester toutes les combinaisons
    let tested = 0;
    let found = 0;

    for (const apiCode of apiCodes) {
      for (const version of versions) {
        for (const resource of resources) {
          const versionPart = version ? `/${version}` : '';
          const url = `https://api.francetravail.io/partenaire/${apiCode}${versionPart}/${resource}`;

          tested++;

          try {
            const response = await axios.get(url, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
              },
              timeout: 2000,
              maxRedirects: 0
            });

            found++;
            const endpoint = {
              scope: scopeConfig.name,
              url: url,
              status: response.status,
              dataType: Array.isArray(response.data) ? 'Array' : typeof response.data,
              count: Array.isArray(response.data) ? response.data.length : null,
              sample: null
            };

            if (Array.isArray(response.data) && response.data.length > 0) {
              endpoint.sample = JSON.stringify(response.data[0]).substring(0, 150);
            }

            foundEndpoints.push(endpoint);

            console.log(`   ✅ TROUVÉ! ${url}`);
            console.log(`      Status: ${response.status}`);
            console.log(`      Type: ${endpoint.dataType}${endpoint.count ? ` (${endpoint.count} éléments)` : ''}`);
            if (endpoint.sample) {
              console.log(`      Exemple: ${endpoint.sample}...`);
            }
            console.log('');

          } catch (error) {
            // Ignorer les erreurs silencieusement
          }

          // Petite pause pour ne pas surcharger l'API
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    }

    console.log(`   📊 Testé ${tested} combinaisons, trouvé ${found} endpoint(s)\n`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('  📋 RÉSUMÉ DES ENDPOINTS TROUVÉS');
  console.log('='.repeat(70) + '\n');

  if (foundEndpoints.length === 0) {
    console.log('❌ Aucun endpoint fonctionnel trouvé\n');
    console.log('💡 Suggestions:\n');
    console.log('   1. Vérifiez que vos APIs sont bien activées sur francetravail.io');
    console.log('   2. Consultez la documentation dans votre espace développeur');
    console.log('   3. Contactez le support: support@francetravail.io\n');
  } else {
    console.log(`✅ ${foundEndpoints.length} endpoint(s) fonctionnel(s):\n`);

    foundEndpoints.forEach((endpoint, index) => {
      console.log(`${index + 1}. ${endpoint.url}`);
      console.log(`   Scope: ${endpoint.scope}`);
      console.log(`   Type: ${endpoint.dataType}${endpoint.count ? ` (${endpoint.count} résultats)` : ''}`);
      if (endpoint.sample) {
        console.log(`   Exemple: ${endpoint.sample}...`);
      }
      console.log('');
    });

    console.log('💾 Configuration recommandée pour FranceTravailService.js:\n');
    console.log('```javascript');
    console.log(`this.baseURL = '${foundEndpoints[0].url.split('/').slice(0, -1).join('/')}';`);
    console.log(`this.scope = '${foundEndpoints[0].scope === 'métiers' ? 'api_rome-metiersv1' :
                                   foundEndpoints[0].scope === 'compétences' ? 'api_rome-competencesv1' :
                                   'nomenclatureRome'}';`);
    console.log('```\n');
  }

  console.log('='.repeat(70) + '\n');
}

bruteForceApiCodes()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Erreur:', error.message);
    process.exit(1);
  });
