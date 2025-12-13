/**
 * Script pour promouvoir le premier utilisateur en admin
 *
 * Usage:
 *   node scripts/promote-first-admin.js votre.email@example.com
 *
 * ⚠️ À exécuter UNE SEULE FOIS après avoir créé votre compte
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Charger les variables d'environnement
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Import du modèle User
const User = require('../src/models/User');

async function promoteFirstAdmin() {
  try {
    // Récupérer l'email depuis les arguments
    const email = process.argv[2];

    if (!email) {
      console.error('❌ Erreur: Vous devez fournir un email');
      console.log('\nUsage:');
      console.log('  node scripts/promote-first-admin.js votre.email@example.com');
      process.exit(1);
    }

    // Connexion à MongoDB
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connecté à MongoDB\n');

    // Trouver l'utilisateur par email
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.error(`❌ Aucun utilisateur trouvé avec l'email: ${email}`);
      console.log('\n💡 Assurez-vous:');
      console.log('   1. D\'avoir créé un compte sur l\'application');
      console.log('   2. D\'utiliser le bon email');
      await mongoose.connection.close();
      process.exit(1);
    }

    // Vérifier si déjà admin
    if (user.role === 'admin') {
      console.log(`ℹ️  L'utilisateur ${email} est déjà admin`);
      console.log('\n👤 Informations:');
      console.log(`   Nom: ${user.firstName} ${user.lastName}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Role: ${user.role}`);
      await mongoose.connection.close();
      process.exit(0);
    }

    // Promouvoir en admin
    user.role = 'admin';
    await user.save();

    console.log('🎉 Utilisateur promu en admin avec succès!\n');
    console.log('👤 Informations:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Nom: ${user.firstName} ${user.lastName}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Role: ${user.role}`);
    console.log('\n✅ Vous pouvez maintenant accéder au panneau admin!');

    await mongoose.connection.close();
    console.log('\n🔌 Déconnexion de MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Exécuter le script
promoteFirstAdmin();
