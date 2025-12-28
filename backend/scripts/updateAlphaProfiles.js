/**
 * Script pour mettre à jour les profils alpha avec les informations complètes
 * À lancer UNE SEULE FOIS pour initialiser les données
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

const ALPHA_PROFILES = [
  {
    username: 'Mathilde',
    age: 32,
    location: 'Charente',
    currentSituation: 'employed',
    currentJob: 'Dermatologue',
    education: 'phd' // Médecine = doctorat
  },
  {
    username: 'Prihlo',
    age: 31,
    location: 'Île-de-France',
    currentSituation: 'employed',
    currentJob: 'Médecin infectiologue',
    education: 'phd' // Médecine = doctorat
  },
  {
    username: 'Aschmeday',
    age: 27,
    location: 'Creuse',
    currentSituation: 'unemployed',
    currentJob: null,
    education: 'other' // Aucune formation
  },
  {
    username: 'Nyluj',
    age: 32,
    location: 'Strasbourg',
    currentSituation: 'employed',
    currentJob: 'Chef de projet informatique',
    education: 'bac_plus_5' // École d'ingénieur = Bac+5
  },
  {
    username: 'Jenna Mercier',
    age: 34,
    location: 'Normandie',
    currentSituation: 'unemployed',
    currentJob: null,
    education: 'bac_plus_5' // Directrice artistique/designer = Bac+5
  },
  {
    username: 'Nina',
    age: 28,
    location: 'Proche frontière suisse',
    currentSituation: 'unemployed',
    currentJob: null,
    education: 'other' // Formation inconnue
  },
  {
    username: 'lephistos',
    age: 28,
    location: 'Proche frontière suisse',
    currentSituation: 'employed',
    currentJob: 'Société de transport',
    education: 'other' // Formation inconnue
  },
  {
    username: 'Alice',
    age: 32,
    location: 'Bretagne',
    currentSituation: 'unemployed',
    currentJob: null,
    education: 'bac_plus_5' // École d'art = Bac+5
  },
  {
    username: 'alexia_kesin',
    age: 28,
    location: 'Paris',
    currentSituation: 'employed',
    currentJob: 'Commercial chez Pennylane',
    education: 'bac_plus_5' // École de commerce = Bac+5
  },
  {
    username: 'Sissi',
    age: 64,
    location: 'Gagny',
    currentSituation: 'other', // Retraitée
    currentJob: 'Ancien prof de sport, proviseur, député, haut commissaire',
    education: 'bac_plus_5' // Prof de sport = Bac+5
  },
  {
    username: 'romaintest',
    age: 38,
    location: 'Massy-Palaiseau',
    currentSituation: 'employed',
    currentJob: 'Chef de projet informatique',
    education: 'bac_plus_5' // Art et informatique = Bac+5
  },
  {
    username: 'antoine.c',
    age: 32,
    location: 'Rosny-sous-Bois',
    currentSituation: 'employed',
    currentJob: 'Développeur fullstack',
    education: 'bac_plus_5' // École d'ingénieur EIGSI = Bac+5
  }
];

async function updateAlphaProfiles() {
  try {
    // Connexion MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connecté à MongoDB\n');

    let updated = 0;
    let notFound = 0;

    for (const profile of ALPHA_PROFILES) {
      const user = await User.findOne({ username: profile.username });

      if (!user) {
        console.log(`❌ User non trouvé: ${profile.username}`);
        notFound++;
        continue;
      }

      // Mise à jour
      user.age = profile.age;
      user.location = profile.location;
      user.currentSituation = profile.currentSituation;
      user.currentJob = profile.currentJob;
      user.education = profile.education;

      await user.save();

      console.log(`✅ ${profile.username.padEnd(20)} → âge: ${profile.age}, lieu: ${profile.location}, situation: ${profile.currentSituation}`);
      updated++;
    }

    console.log(`\n📊 Résumé:`);
    console.log(`   ✅ ${updated} profils mis à jour`);
    console.log(`   ❌ ${notFound} profils non trouvés`);

    await mongoose.disconnect();
    console.log('\n✅ Terminé !');

  } catch (error) {
    console.error('❌ Erreur:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Lancer le script
updateAlphaProfiles();
