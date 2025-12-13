/**
 * Script pour trouver les scopes valides pour votre application
 */

require('dotenv').config();
const axios = require('axios');

async function findValidScope() {
  console.log('\n' + '='.repeat(70));
  console.log('  🔍 RECHERCHE DES SCOPES VALIDES');
  console.log('='.repeat(70) + '\n');

  const clientId = process.env.FRANCE_TRAVAIL_CLIENT_ID;
  const clientSecret = process.env.FRANCE_TRAVAIL_CLIENT_SECRET;

  // Liste des scopes possibles pour les différentes API France Travail
  const possibleScopes = [
    // ROME API
    'api_romev1',
    'api_rome-metiersv1',
    'api_rome-competencesv1',
    'api_rome-contextesv1',
    'nomenclatureRome',

    // Offres d'emploi
    'api_offresdemploiv2',
    'o2dsoffre',

    // Autres APIs courantes
    'api_infotravailv1',
    'api_explorateurmetiersv1',
    'application_PAR_assistant-orientation_b6e431828a5cf5adbce95e3061e4ee80a16fb14d8e18c2f8b86e7fe4bc1ed2a3',

    // Scope vide (certaines APIs n'en nécessitent pas)
    '',

    // Combinaisons
    'api_romev1 nomenclatureRome',
  ];

  const authURL = 'https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire';

  console.log('🔑 Test de différents scopes...\n');

  let successCount = 0;

  for (const scope of possibleScopes) {
    const scopeDisplay = scope === '' ? '(vide)' : scope;
    process.stdout.write(`   Testing: ${scopeDisplay.padEnd(80)} `);

    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      if (scope !== '') {
        params.append('scope', scope);
      }

      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

      const response = await axios.post(authURL, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`
        }
      });

      console.log('✅ VALIDE');
      successCount++;

      console.log(`\n   🎉 SCOPE VALIDE TROUVÉ: "${scope}"\n`);
      console.log(`   Token: ${response.data.access_token.substring(0, 30)}...`);
      console.log(`   Expire dans: ${response.data.expires_in}s`);
      console.log(`   Type: ${response.data.token_type}\n`);

      // Tester les différentes APIs avec ce token
      console.log('   🧪 Test des endpoints API...\n');

      const endpoints = [
        {
          name: 'Appellations (métiers)',
          url: 'https://api.francetravail.io/partenaire/rome/v1/appellation'
        },
        {
          name: 'Métiers',
          url: 'https://api.francetravail.io/partenaire/rome/v1/metier'
        },
        {
          name: 'Compétences',
          url: 'https://api.francetravail.io/partenaire/rome/v1/competence'
        }
      ];

      for (const endpoint of endpoints) {
        try {
          const apiResponse = await axios.get(endpoint.url, {
            headers: {
              'Authorization': `Bearer ${response.data.access_token}`,
              'Accept': 'application/json'
            },
            timeout: 5000
          });

          console.log(`      ✅ ${endpoint.name}: ${apiResponse.data.length || 'OK'} résultats`);
        } catch (apiError) {
          const status = apiError.response?.status || 'TIMEOUT';
          const statusText = apiError.response?.statusText || apiError.message;
          console.log(`      ❌ ${endpoint.name}: ${status} - ${statusText}`);
        }
      }

      console.log('\n   ' + '─'.repeat(66) + '\n');

    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.error === 'invalid_scope') {
        console.log('❌ Invalide');
      } else if (error.response) {
        console.log(`⚠️  ${error.response.status} - ${error.response.data?.error || 'Erreur'}`);
      } else {
        console.log(`⚠️  ${error.message}`);
      }
    }

    // Petite pause pour ne pas surcharger l'API
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('='.repeat(70));
  if (successCount > 0) {
    console.log(`  ✅ ${successCount} SCOPE(S) VALIDE(S) TROUVÉ(S)!`);
  } else {
    console.log('  ❌ AUCUN SCOPE VALIDE TROUVÉ');
  }
  console.log('='.repeat(70) + '\n');

  if (successCount === 0) {
    console.log('❌ Votre application n\'a pas accès à l\'API ROME\n');
    console.log('📋 Actions à faire:\n');
    console.log('   1. Connectez-vous sur: https://francetravail.io/inscription');
    console.log('   2. Accédez à votre tableau de bord développeur');
    console.log('   3. Vérifiez les APIs autorisées pour votre application');
    console.log('   4. Demandez l\'accès à l\'API "ROME 4.0" si ce n\'est pas fait');
    console.log('   5. Attendez l\'approbation (peut prendre quelques heures/jours)\n');
    console.log('💡 Vous pouvez aussi essayer de créer une NOUVELLE application');
    console.log('   spécifiquement pour l\'API ROME 4.0\n');
  }
}

findValidScope()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Erreur:', error.message);
    process.exit(1);
  });
