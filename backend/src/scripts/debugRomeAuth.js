/**
 * Script de débogage pour l'authentification France Travail
 * Aide à identifier les problèmes de configuration
 */

require('dotenv').config();
const axios = require('axios');

async function debugAuth() {
  console.log('\n' + '='.repeat(70));
  console.log('  🔍 DÉBOGAGE AUTHENTIFICATION FRANCE TRAVAIL');
  console.log('='.repeat(70) + '\n');

  // Vérification des variables d'environnement
  console.log('1️⃣  Vérification des variables d\'environnement...\n');

  const clientId = process.env.FRANCE_TRAVAIL_CLIENT_ID;
  const clientSecret = process.env.FRANCE_TRAVAIL_CLIENT_SECRET;

  if (!clientId || clientId === 'your_client_id_here') {
    console.log('   ❌ CLIENT_ID non configuré ou valeur par défaut');
    console.log('   → Vérifiez FRANCE_TRAVAIL_CLIENT_ID dans .env\n');
    return;
  } else {
    console.log(`   ✅ CLIENT_ID trouvé: ${clientId.substring(0, 10)}...`);
  }

  if (!clientSecret || clientSecret === 'your_client_secret_here') {
    console.log('   ❌ CLIENT_SECRET non configuré ou valeur par défaut');
    console.log('   → Vérifiez FRANCE_TRAVAIL_CLIENT_SECRET dans .env\n');
    return;
  } else {
    console.log(`   ✅ CLIENT_SECRET trouvé: ${clientSecret.substring(0, 10)}...\n`);
  }

  // Test avec différentes configurations
  const configs = [
    {
      name: 'Config 1: Basic Auth + realm',
      authURL: 'https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire',
      method: 'basic',
      scope: 'api_romev1 nomenclatureRome'
    },
    {
      name: 'Config 2: Client credentials dans body + realm',
      authURL: 'https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire',
      method: 'body',
      scope: 'api_romev1 nomenclatureRome'
    },
    {
      name: 'Config 3: Basic Auth sans realm',
      authURL: 'https://entreprise.francetravail.fr/connexion/oauth2/access_token',
      method: 'basic',
      scope: 'api_romev1 nomenclatureRome'
    },
    {
      name: 'Config 4: Scope simple',
      authURL: 'https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire',
      method: 'basic',
      scope: 'api_romev1'
    }
  ];

  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    console.log(`${i + 2}️⃣  Test ${config.name}...\n`);

    try {
      let response;

      if (config.method === 'basic') {
        // Méthode Basic Auth
        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('scope', config.scope);

        const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

        response = await axios.post(config.authURL, params, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${credentials}`
          }
        });
      } else {
        // Méthode avec credentials dans le body
        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', clientId);
        params.append('client_secret', clientSecret);
        params.append('scope', config.scope);

        response = await axios.post(config.authURL, params, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
      }

      console.log('   ✅ SUCCÈS!');
      console.log(`   Token reçu: ${response.data.access_token.substring(0, 20)}...`);
      console.log(`   Expire dans: ${response.data.expires_in} secondes`);
      console.log(`   Type: ${response.data.token_type}\n`);

      console.log('   🎉 Cette configuration fonctionne!\n');
      console.log('   📝 URL utilisée:');
      console.log(`      ${config.authURL}\n`);
      console.log('   📝 Méthode:');
      console.log(`      ${config.method === 'basic' ? 'Basic Authentication' : 'Client credentials in body'}\n`);
      console.log('   📝 Scope:');
      console.log(`      ${config.scope}\n`);

      // Test d'un appel API avec ce token
      console.log('   🔄 Test d\'un appel API avec ce token...\n');
      try {
        const apiResponse = await axios.get(
          'https://api.francetravail.io/partenaire/rome/v1/appellation',
          {
            headers: {
              'Authorization': `Bearer ${response.data.access_token}`,
              'Accept': 'application/json'
            }
          }
        );

        console.log(`   ✅ Appel API réussi! ${apiResponse.data.length} métiers récupérés\n`);
        console.log('   📋 Exemples:');
        apiResponse.data.slice(0, 3).forEach((job, idx) => {
          console.log(`      ${idx + 1}. ${job.libelle} (${job.code})`);
        });
      } catch (apiError) {
        console.log('   ⚠️  Token valide mais échec de l\'appel API');
        console.log(`   Erreur: ${apiError.response?.status} - ${apiError.response?.statusText}`);
        if (apiError.response?.data) {
          console.log(`   Détails: ${JSON.stringify(apiError.response.data)}`);
        }
      }

      console.log('\n' + '='.repeat(70));
      console.log('  ✅ CONFIGURATION VALIDE TROUVÉE!');
      console.log('='.repeat(70) + '\n');
      return;

    } catch (error) {
      console.log('   ❌ Échec');
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Erreur: ${JSON.stringify(error.response.data)}`);
      } else {
        console.log(`   Erreur: ${error.message}`);
      }
      console.log('');
    }
  }

  console.log('='.repeat(70));
  console.log('  ❌ AUCUNE CONFIGURATION N\'A FONCTIONNÉ');
  console.log('='.repeat(70) + '\n');

  console.log('💡 Solutions possibles:\n');
  console.log('   1. Vérifiez que vos credentials sont corrects sur francetravail.io');
  console.log('   2. Vérifiez que votre application a bien l\'accès à l\'API ROME 4.0');
  console.log('   3. Vérifiez que le scope "api_romev1" est autorisé pour votre application');
  console.log('   4. Contactez le support: support@francetravail.io\n');

  console.log('📚 Ressources:\n');
  console.log('   - Documentation: https://francetravail.io/data/documentation');
  console.log('   - Portail développeur: https://francetravail.io/inscription');
  console.log('   - API Gouv: https://api.gouv.fr/les-api/api-rome\n');
}

debugAuth()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Erreur critique:', error.message);
    process.exit(1);
  });
