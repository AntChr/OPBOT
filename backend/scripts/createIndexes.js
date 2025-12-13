/**
 * Script pour créer des index MongoDB optimisés
 *
 * Les index accélèrent considérablement les requêtes de recherche
 * Usage: node scripts/createIndexes.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Job = require('../src/models/Job');
const Conversation = require('../src/models/Conversation');
const User = require('../src/models/User');

async function createIndexes() {
  try {
    console.log('📊 CRÉATION DES INDEX MONGODB');
    console.log('='.repeat(50));

    await mongoose.connect(process.env.MONGO_URI);
    console.log('\n✅ Connecté à MongoDB\n');

    // ========================================
    // INDEX POUR JOB (Collection des métiers)
    // ========================================

    console.log('📚 Création des index pour Job...\n');

    // 1. Index sur le secteur (pour filtrage rapide)
    await Job.collection.createIndex({ sector: 1 });
    console.log('  ✅ Index créé: sector');

    // 2. Index sur la source (ESCO vs O*NET)
    await Job.collection.createIndex({ source: 1 });
    console.log('  ✅ Index créé: source');

    // 3. Index sur enrichedAt (pour trouver métiers enrichis)
    await Job.collection.createIndex({ enrichedAt: 1 });
    console.log('  ✅ Index créé: enrichedAt');

    // 4. Index sur l'environnement de travail
    await Job.collection.createIndex({ work_environment: 1 });
    console.log('  ✅ Index créé: work_environment');

    // 5. Index sur le niveau d'études
    await Job.collection.createIndex({ education: 1 });
    console.log('  ✅ Index créé: education');

    // 6. Index sur employabilité
    await Job.collection.createIndex({ employability: 1 });
    console.log('  ✅ Index créé: employability');

    // 7. Index texte pour recherche sur titre et description
    await Job.collection.createIndex(
      { title: 'text', description: 'text', altLabels: 'text' },
      { weights: { title: 3, altLabels: 2, description: 1 } }
    );
    console.log('  ✅ Index texte créé: title, description, altLabels');

    // 8. Index composite pour filtres combinés fréquents
    await Job.collection.createIndex({ source: 1, sector: 1, enrichedAt: 1 });
    console.log('  ✅ Index composite créé: source + sector + enrichedAt');

    // 9. Index sur ESCO URI (unique, déjà défini dans le modèle mais on s'assure)
    await Job.collection.createIndex({ escoUri: 1 }, { unique: true, sparse: true });
    console.log('  ✅ Index unique créé: escoUri');

    // ========================================
    // INDEX POUR CONVERSATION
    // ========================================

    console.log('\n💬 Création des index pour Conversation...\n');

    // 1. Index sur userId (pour trouver conversations d'un utilisateur)
    await Conversation.collection.createIndex({ userId: 1 });
    console.log('  ✅ Index créé: userId');

    // 2. Index sur status (pour conversations actives)
    await Conversation.collection.createIndex({ status: 1 });
    console.log('  ✅ Index créé: status');

    // 3. Index composite userId + status (requête fréquente)
    await Conversation.collection.createIndex({ userId: 1, status: 1 });
    console.log('  ✅ Index composite créé: userId + status');

    // 4. Index sur sessionId (unique, déjà défini dans le modèle)
    try {
      await Conversation.collection.createIndex({ sessionId: 1 }, { unique: true });
      console.log('  ✅ Index unique créé: sessionId');
    } catch (e) {
      console.log('  ℹ️  Index sessionId existe déjà (OK)');
    }

    // 5. Index sur dates pour tri et filtrage
    await Conversation.collection.createIndex({ startedAt: -1 });
    console.log('  ✅ Index créé: startedAt (descendant)');

    await Conversation.collection.createIndex({ completedAt: -1 });
    console.log('  ✅ Index créé: completedAt (descendant)');

    // ========================================
    // INDEX POUR USER
    // ========================================

    console.log('\n👤 Création des index pour User...\n');

    // 1. Index sur email (unique, déjà défini dans le modèle)
    await User.collection.createIndex({ email: 1 }, { unique: true });
    console.log('  ✅ Index unique créé: email');

    // 2. Index sur createdAt
    await User.collection.createIndex({ createdAt: -1 });
    console.log('  ✅ Index créé: createdAt (descendant)');

    // ========================================
    // STATISTIQUES DES INDEX
    // ========================================

    console.log('\n📊 STATISTIQUES DES INDEX\n');

    const jobIndexes = await Job.collection.indexes();
    console.log(`  Job: ${jobIndexes.length} index créés`);
    jobIndexes.forEach(idx => {
      const keys = Object.keys(idx.key).join(', ');
      console.log(`    - ${idx.name}: ${keys}`);
    });

    const conversationIndexes = await Conversation.collection.indexes();
    console.log(`\n  Conversation: ${conversationIndexes.length} index créés`);
    conversationIndexes.forEach(idx => {
      const keys = Object.keys(idx.key).join(', ');
      console.log(`    - ${idx.name}: ${keys}`);
    });

    const userIndexes = await User.collection.indexes();
    console.log(`\n  User: ${userIndexes.length} index créés`);
    userIndexes.forEach(idx => {
      const keys = Object.keys(idx.key).join(', ');
      console.log(`    - ${idx.name}: ${keys}`);
    });

    // ========================================
    // STATISTIQUES DE COLLECTION
    // ========================================

    console.log('\n📈 STATISTIQUES DE COLLECTION\n');

    const jobStats = await Job.collection.stats();
    console.log(`  Job:`);
    console.log(`    Documents: ${jobStats.count}`);
    console.log(`    Taille: ${(jobStats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`    Index: ${(jobStats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);

    const convStats = await Conversation.collection.stats();
    console.log(`\n  Conversation:`);
    console.log(`    Documents: ${convStats.count}`);
    console.log(`    Taille: ${(convStats.size / 1024 / 1024).toFixed(2)} MB`);

    console.log('\n' + '='.repeat(50));
    console.log('✅ Tous les index ont été créés avec succès !');
    console.log('\n💡 Les requêtes devraient maintenant être 5-10x plus rapides.');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Déconnexion de MongoDB');
  }
}

// Exécuter le script
createIndexes();
