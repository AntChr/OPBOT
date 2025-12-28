/**
 * Script pour créer des plans d'action mockés pour les tests
 * À exécuter avec: node backend/scripts/createMockActionPlans.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const ActionPlan = require('../src/models/ActionPlan');
const User = require('../src/models/User');

dotenv.config();

// Plans d'action mockés pour les utilisateurs alpha
const MOCK_ACTION_PLANS = [
  {
    username: 'Mathilde',
    jobTitle: 'Dermatologue',
    marketAnalysis: {
      recruiting: true,
      jobCount: 45,
      region: 'Charente',
      radius: 50,
      avgSalary: '65 000€ - 85 000€',
      trend: 'medium',
      lastUpdated: new Date()
    },
    trainingPath: {
      name: 'DES (Diplôme d\'Études Spécialisées) en Dermatologie',
      provider: 'Université de Médecine',
      duration: '4 ans',
      cost: 0,
      cpfEligible: false,
      format: 'onsite',
      url: 'https://www.france-universite.fr/',
      rating: 9,
      source: 'france_competences'
    },
    jobOffers: [
      {
        title: 'Dermatologue H/F',
        company: 'Cabinet Médical Saint-Michel',
        location: 'Angoulême',
        distance: 15,
        contract: 'CDI',
        salary: '70 000€ - 80 000€',
        url: 'https://www.pole-emploi.fr',
        postedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 jours
        source: 'pole_emploi'
      },
      {
        title: 'Dermatologue - Clinique Privée',
        company: 'Clinique de la Rochefoucauld',
        location: 'La Rochefoucauld',
        distance: 25,
        contract: 'CDI',
        salary: '75 000€ - 90 000€',
        url: 'https://www.pole-emploi.fr',
        postedDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), // 12 jours
        source: 'pole_emploi'
      },
      {
        title: 'Dermatologue H/F - Temps Partiel',
        company: 'Centre Hospitalier de Cognac',
        location: 'Cognac',
        distance: 35,
        contract: 'CDD',
        salary: '50 000€ - 60 000€',
        url: 'https://www.pole-emploi.fr',
        postedDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 jours
        source: 'pole_emploi'
      }
    ],
    reliabilityScore: 85
  },
  {
    username: 'Prihlo',
    jobTitle: 'Médecin infectiologue',
    marketAnalysis: {
      recruiting: true,
      jobCount: 28,
      region: 'Île-de-France',
      radius: 50,
      avgSalary: '55 000€ - 75 000€',
      trend: 'high',
      lastUpdated: new Date()
    },
    trainingPath: {
      name: 'DES (Diplôme d\'Études Spécialisées) en Maladies Infectieuses',
      provider: 'AP-HP - Université Paris Cité',
      duration: '4 ans',
      cost: 0,
      cpfEligible: false,
      format: 'onsite',
      url: 'https://u-paris.fr/',
      rating: 10,
      source: 'france_competences'
    },
    jobOffers: [
      {
        title: 'Infectiologue H/F',
        company: 'Hôpital Bichat',
        location: 'Paris 18e',
        distance: 8,
        contract: 'CDI',
        salary: '60 000€ - 75 000€',
        url: 'https://www.aphp.fr',
        postedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 jours
        source: 'pole_emploi'
      },
      {
        title: 'Médecin Infectiologue',
        company: 'Institut Pasteur',
        location: 'Paris 15e',
        distance: 12,
        contract: 'CDI',
        salary: '65 000€ - 80 000€',
        url: 'https://www.pasteur.fr',
        postedDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 jours
        source: 'indeed'
      },
      {
        title: 'Infectiologue - Service Urgences',
        company: 'Hôpital Saint-Louis',
        location: 'Paris 10e',
        distance: 6,
        contract: 'CDD',
        salary: '55 000€ - 70 000€',
        url: 'https://www.aphp.fr',
        postedDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 jours
        source: 'pole_emploi'
      }
    ],
    reliabilityScore: 92
  },
  {
    username: 'Clarisse',
    jobTitle: 'Développeur Full Stack',
    marketAnalysis: {
      recruiting: true,
      jobCount: 156,
      region: 'Île-de-France',
      radius: 50,
      avgSalary: '40 000€ - 55 000€',
      trend: 'high',
      lastUpdated: new Date()
    },
    trainingPath: {
      name: 'Formation Développeur Web Full Stack',
      provider: 'OpenClassrooms',
      duration: '12 mois',
      cost: 6990,
      cpfEligible: true,
      format: 'online',
      url: 'https://openclassrooms.com/fr/paths/717-developpeur-web',
      rating: 8,
      source: 'scraping'
    },
    jobOffers: [
      {
        title: 'Développeur Full Stack JavaScript H/F',
        company: 'TechCorp',
        location: 'Paris',
        distance: 10,
        contract: 'CDI',
        salary: '42 000€ - 50 000€',
        url: 'https://www.welcometothejungle.com',
        postedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        source: 'indeed'
      },
      {
        title: 'Développeur Full Stack React/Node.js',
        company: 'Digital Agency',
        location: 'Boulogne-Billancourt',
        distance: 18,
        contract: 'CDI',
        salary: '45 000€ - 55 000€',
        url: 'https://www.linkedin.com',
        postedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        source: 'pole_emploi'
      },
      {
        title: 'Full Stack Developer (Remote)',
        company: 'StartupLab',
        location: 'Paris (Télétravail)',
        distance: 0,
        contract: 'CDI',
        salary: '40 000€ - 48 000€',
        url: 'https://www.welcometothejungle.com',
        postedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        source: 'indeed'
      },
      {
        title: 'Développeur Web Full Stack Junior',
        company: 'WebSolutions',
        location: 'Levallois-Perret',
        distance: 12,
        contract: 'CDD',
        salary: '38 000€ - 45 000€',
        url: 'https://www.pole-emploi.fr',
        postedDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        source: 'pole_emploi'
      }
    ],
    reliabilityScore: 78
  }
];

async function createMockActionPlans() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connecté à MongoDB');

    // Supprimer les anciens plans mockés
    await ActionPlan.deleteMany({});
    console.log('🗑️  Anciens plans supprimés');

    let created = 0;
    let skipped = 0;

    for (const mockPlan of MOCK_ACTION_PLANS) {
      // Trouver l'utilisateur par username
      const user = await User.findOne({ username: mockPlan.username });

      if (!user) {
        console.log(`⚠️  Utilisateur "${mockPlan.username}" non trouvé - plan ignoré`);
        skipped++;
        continue;
      }

      // Créer le plan d'action
      const actionPlan = new ActionPlan({
        userId: user._id,
        jobTitle: mockPlan.jobTitle,
        marketAnalysis: mockPlan.marketAnalysis,
        trainingPath: mockPlan.trainingPath,
        jobOffers: mockPlan.jobOffers,
        reliabilityScore: mockPlan.reliabilityScore,
        status: 'active',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 jours
      });

      await actionPlan.save();
      console.log(`✅ Plan d'action créé pour ${user.username} (${mockPlan.jobTitle})`);
      created++;
    }

    console.log('\n📊 RÉSUMÉ:');
    console.log(`   ✅ ${created} plan(s) d'action créé(s)`);
    console.log(`   ⚠️  ${skipped} plan(s) ignoré(s)`);

    // Fermer la connexion
    await mongoose.connection.close();
    console.log('\n🔌 Déconnecté de MongoDB');

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

// Exécuter le script
createMockActionPlans();
