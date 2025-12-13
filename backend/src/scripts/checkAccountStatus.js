/**
 * Diagnostic complet du compte et des permissions
 */

require('dotenv').config();

console.log('\n' + '='.repeat(70));
console.log('  🔍 DIAGNOSTIC COMPTE FRANCE TRAVAIL');
console.log('='.repeat(70) + '\n');

console.log('📋 Informations du compte:\n');
console.log(`   Client ID: ${process.env.FRANCE_TRAVAIL_CLIENT_ID}`);
console.log(`   Client Secret: ${process.env.FRANCE_TRAVAIL_CLIENT_SECRET?.substring(0, 20)}...`);
console.log('');

console.log('=' .repeat(70));
console.log('  ⚠️  ERREUR 403 FORBIDDEN - DIAGNOSTIC');
console.log('='.repeat(70) + '\n');

console.log('Les erreurs 403 Forbidden peuvent avoir plusieurs causes:\n');

console.log('1️⃣  APPLICATION NON APPROUVÉE\n');
console.log('   ❓ Vérifiez sur francetravail.io:');
console.log('      - Allez dans votre tableau de bord développeur');
console.log('      - Regardez le statut de votre application');
console.log('      - Statut attendu: "Approuvé" ou "Activé"');
console.log('      - Si "En attente": attendez la validation (peut prendre 24-48h)\n');

console.log('2️⃣  CONDITIONS D\'UTILISATION NON ACCEPTÉES\n');
console.log('   ❓ Pour chaque API (Métiers, Compétences, etc.):');
console.log('      - Y a-t-il une case à cocher "J\'accepte les CGU"?');
console.log('      - Y a-t-il un bouton "Activer" à cliquer?\n');

console.log('3️⃣  ENVIRONNEMENT SANDBOX vs PRODUCTION\n');
console.log('   ❓ Vérifiez:');
console.log('      - Êtes-vous en mode "Test/Sandbox" ou "Production"?');
console.log('      - Les credentials sont-ils pour le bon environnement?');
console.log('      - Faut-il générer de nouveaux credentials pour la production?\n');

console.log('4️⃣  IP WHITELISTING\n');
console.log('   ❓ Certaines APIs nécessitent:');
console.log('      - Ajout de votre adresse IP dans une liste autorisée');
console.log('      - Configuration réseau spécifique\n');

console.log('5️⃣  PÉRIODE D\'ACTIVATION\n');
console.log('   ❓ Après activation des APIs:');
console.log('      - Les permissions peuvent prendre jusqu\'à 24h pour se propager');
console.log('      - Quand avez-vous activé les APIs ROME?\n');

console.log('='.repeat(70));
console.log('  📞 ACTIONS RECOMMANDÉES');
console.log('='.repeat(70) + '\n');

console.log('🔧 Option 1: Vérifier votre espace développeur\n');
console.log('   1. Connectez-vous sur https://francetravail.io');
console.log('   2. Accédez à "Mes applications"');
console.log('   3. Cliquez sur "assistant-orientation"');
console.log('   4. Vérifiez CHAQUE API:');
console.log('      □ ROME 4.0 - Métiers: Statut actif? CGU acceptées?');
console.log('      □ ROME 4.0 - Compétences: Statut actif? CGU acceptées?');
console.log('      □ ROME 4.0 - Contextes: Statut actif? CGU acceptées?');
console.log('      □ ROME 4.0 - Fiches métiers: Statut actif? CGU acceptées?\n');

console.log('🔧 Option 2: Tester dans la console développeur\n');
console.log('   1. Sur francetravail.io, dans votre espace développeur');
console.log('   2. Cherchez un bouton "Tester l\'API" ou "Essayer"');
console.log('   3. Si ça fonctionne là → problème de credentials');
console.log('   4. Si ça ne fonctionne pas → problème de permissions\n');

console.log('🔧 Option 3: Contacter le support\n');
console.log('   Si rien ne fonctionne après vérification:');
console.log('   📧 Email: support@francetravail.io');
console.log('   📝 Mentionnez:');
console.log(`      - Votre Client ID: ${process.env.FRANCE_TRAVAIL_CLIENT_ID}`);
console.log('      - Les APIs que vous essayez d\'utiliser');
console.log('      - L\'erreur: 403 Forbidden sur tous les endpoints ROME\n');

console.log('🔧 Option 4: Alternative temporaire\n');
console.log('   En attendant la résolution:');
console.log('   - Utilisez les fichiers CSV ROME disponibles sur data.gouv.fr');
console.log('   - URL: https://www.data.gouv.fr/datasets/repertoire-operationnel-des-metiers-et-des-emplois-rome/');
console.log('   - Import direct dans MongoDB (on peut créer un script)\n');

console.log('='.repeat(70) + '\n');

console.log('💡 Que faire maintenant?\n');
console.log('   A. Vérifiez votre espace développeur francetravail.io');
console.log('   B. Testez directement depuis leur console si disponible');
console.log('   C. Contactez le support si le problème persiste');
console.log('   D. OU utilisez les CSV en attendant (solution immédiate)\n');
