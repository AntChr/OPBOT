/**
 * Génère et importe les métiers ROME principaux
 * Basé sur la structure ROME 4.0 connue
 *
 * Ce script crée les métiers ROME les plus courants avec leurs données enrichies
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Job = require('../models/Job');
const romeMapper = require('../services/RomeToJobMapper');

// Métiers ROME principaux par domaine
const ROME_JOBS_DATA = [
  // Domaine M - Support à l'entreprise (IT, Compt...)
  {
    code: 'M1805',
    libelle: 'Études et développement informatique',
    definition: 'Conçoit, développe et met au point un projet d\'application informatique, de la phase d\'étude à son intégration, pour un client ou une entreprise selon des besoins fonctionnels et un cahier des charges.',
    appellations: [
      { libelle: 'Développeur / Développeuse web' },
      { libelle: 'Développeur / Développeuse informatique' },
      { libelle: 'Développeur / Développeuse full-stack' },
      { libelle: 'Ingénieur / Ingénieure logiciel' }
    ],
    competences: {
      savoirFaire: [
        { libelle: 'Développer des applications web', description: 'Conception et réalisation d\'applications web' },
        { libelle: 'Utiliser des langages de programmation', description: 'Maîtrise de JavaScript, Python, Java, etc.' },
        { libelle: 'Concevoir des bases de données', description: 'Modélisation et gestion de bases de données' },
        { libelle: 'Réaliser des tests unitaires', description: 'Validation du code développé' }
      ],
      savoirs: [
        { libelle: 'Langages informatiques' },
        { libelle: 'Frameworks web' },
        { libelle: 'Bases de données' },
        { libelle: 'Méthodologies agiles' }
      ]
    },
    contextes: [
      { libelle: 'Travail en équipe' },
      { libelle: 'Horaires réguliers' },
      { libelle: 'Télétravail possible' }
    ]
  },
  {
    code: 'M1402',
    libelle: 'Conseil en organisation et management d\'entreprise',
    definition: 'Analyse les orientations stratégiques et préconise des axes d\'évolution en termes d\'organisation, de management, de gestion des ressources...',
    appellations: [
      { libelle: 'Consultant / Consultante en organisation' },
      { libelle: 'Consultant / Consultante en management' },
      { libelle: 'Consultant / Consultante RH' }
    ],
    competences: {
      savoirFaire: [
        { libelle: 'Réaliser un diagnostic d\'organisation', description: 'Analyser le fonctionnement de l\'entreprise' },
        { libelle: 'Conseiller une entreprise', description: 'Proposer des recommandations stratégiques' },
        { libelle: 'Animer des réunions', description: 'Faciliter les ateliers et workshops' }
      ],
      savoirs: [
        { libelle: 'Management' },
        { libelle: 'Gestion de projet' },
        { libelle: 'Conduite du changement' }
      ]
    },
    contextes: []
  },

  // Domaine J - Santé
  {
    code: 'J1506',
    libelle: 'Médecine généraliste et spécialisée',
    definition: 'Réalise le diagnostic médical et prescrit le traitement médical en consultation, visite au domicile du patient ou en téléconsultation.',
    appellations: [
      { libelle: 'Médecin généraliste' },
      { libelle: 'Médecin de famille' },
      { libelle: 'Docteur / Docteure en médecine' }
    ],
    competences: {
      savoirFaire: [
        { libelle: 'Réaliser un diagnostic médical', description: 'Examiner et diagnostiquer les patients' },
        { libelle: 'Prescrire un traitement', description: 'Définir le traitement adapté' },
        { libelle: 'Assurer le suivi médical', description: 'Suivre l\'évolution de l\'état de santé' }
      ],
      savoirs: [
        { libelle: 'Anatomie' },
        { libelle: 'Pathologies' },
        { libelle: 'Pharmacologie' }
      ]
    },
    contextes: [
      { libelle: 'Astreintes' },
      { libelle: 'Horaires irréguliers' }
    ]
  },
  {
    code: 'J1501',
    libelle: 'Soins infirmiers généralistes',
    definition: 'Réalise des soins infirmiers de nature préventive, curative ou palliative pour améliorer, maintenir et restaurer la santé.',
    appellations: [
      { libelle: 'Infirmier / Infirmière' },
      { libelle: 'Infirmier diplômé d\'État / IDE' }
    ],
    competences: {
      savoirFaire: [
        { libelle: 'Réaliser des soins infirmiers', description: 'Prodiguer les soins aux patients' },
        { libelle: 'Administrer des médicaments', description: 'Distribution et suivi des traitements' },
        { libelle: 'Surveiller l\'état de santé', description: 'Monitoring des patients' }
      ],
      savoirs: [
        { libelle: 'Soins infirmiers' },
        { libelle: 'Hygiène hospitalière' }
      ]
    },
    contextes: []
  },

  // Domaine D - Commerce
  {
    code: 'D1401',
    libelle: 'Assistanat commercial',
    definition: 'Assure le suivi commercial et administratif de la relation client et vente (devis, commandes, facturation, etc.).',
    appellations: [
      { libelle: 'Commercial / Commerciale' },
      { libelle: 'Attaché / Attachée commercial' },
      { libelle: 'Chargé / Chargée de clientèle' }
    ],
    competences: {
      savoirFaire: [
        { libelle: 'Prospecter de nouveaux clients', description: 'Développement commercial' },
        { libelle: 'Négocier un contrat', description: 'Négociation commerciale' },
        { libelle: 'Assurer le suivi client', description: 'Relation client' }
      ],
      savoirs: [
        { libelle: 'Techniques de vente' },
        { libelle: 'Négociation commerciale' }
      ]
    },
    contextes: []
  },

  // Domaine K - Services à la personne
  {
    code: 'K1303',
    libelle: 'Assistance auprès d\'adultes',
    definition: 'Accompagne dans les gestes de la vie quotidienne des personnes adultes fragilisées.',
    appellations: [
      { libelle: 'Aide-soignant / Aide-soignante' },
      { libelle: 'Auxiliaire de vie sociale' },
      { libelle: 'Assistant / Assistante de vie' }
    ],
    competences: {
      savoirFaire: [
        { libelle: 'Accompagner dans les gestes de la vie quotidienne', description: 'Assistance personnelle' },
        { libelle: 'Réaliser des soins d\'hygiène', description: 'Soins de confort' },
        { libelle: 'Surveiller l\'état de santé', description: 'Observation et alerte' }
      ],
      savoirs: [
        { libelle: 'Gestes de premier secours' },
        { libelle: 'Règles d\'hygiène' }
      ]
    },
    contextes: []
  },

  // Domaine E - Communication
  {
    code: 'E1103',
    libelle: 'Communication',
    definition: 'Conçoit et met en œuvre des actions de communication et de diffusion de l\'information et réalise des outils/supports de communication.',
    appellations: [
      { libelle: 'Chargé / Chargée de communication' },
      { libelle: 'Responsable communication' },
      { libelle: 'Community manager' }
    ],
    competences: {
      savoirFaire: [
        { libelle: 'Élaborer une stratégie de communication', description: 'Définir les actions de communication' },
        { libelle: 'Créer des supports de communication', description: 'Conception de contenus' },
        { libelle: 'Animer les réseaux sociaux', description: 'Community management' }
      ],
      savoirs: [
        { libelle: 'Communication digitale' },
        { libelle: 'Stratégie de marque' }
      ]
    },
    contextes: []
  },

  // Domaine F - BTP
  {
    code: 'F1703',
    libelle: 'Maçonnerie',
    definition: 'Réalise des ouvrages de maçonnerie (parpaings, briques, pierres) pour la construction ou la rénovation de bâtiments.',
    appellations: [
      { libelle: 'Maçon / Maçonne' },
      { libelle: 'Maçon / Maçonne du bâtiment' }
    ],
    competences: {
      savoirFaire: [
        { libelle: 'Monter des murs', description: 'Construction en maçonnerie' },
        { libelle: 'Couler du béton', description: 'Travaux de bétonnage' },
        { libelle: 'Lire un plan', description: 'Lecture de plans techniques' }
      ],
      savoirs: [
        { libelle: 'Techniques de maçonnerie' },
        { libelle: 'Normes de construction' }
      ]
    },
    contextes: [
      { libelle: 'Travail en extérieur' },
      { libelle: 'Port de charges' }
    ]
  },

  // Domaine H - Industrie
  {
    code: 'H2701',
    libelle: 'Pilotage de centrale à béton prêt à l\'emploi, ciment, enrobés et granulats',
    definition: 'Conduit et surveille une installation industrielle de production de béton, ciment ou enrobés.',
    appellations: [
      { libelle: 'Technicien / Technicienne de maintenance industrielle' },
      { libelle: 'Agent / Agente de maintenance' }
    ],
    competences: {
      savoirFaire: [
        { libelle: 'Réaliser une maintenance préventive', description: 'Entretien des équipements' },
        { libelle: 'Diagnostiquer une panne', description: 'Identification des dysfonctionnements' },
        { libelle: 'Réparer des équipements', description: 'Interventions techniques' }
      ],
      savoirs: [
        { libelle: 'Mécanique industrielle' },
        { libelle: 'Électrotechnique' }
      ]
    },
    contextes: []
  },

  // Domaine G - Hôtellerie, restauration
  {
    code: 'G1602',
    libelle: 'Personnel de cuisine',
    definition: 'Prépare et cuisine des mets selon un plan de production culinaire, les règles d\'hygiène et de sécurité alimentaires.',
    appellations: [
      { libelle: 'Cuisinier / Cuisinière' },
      { libelle: 'Chef cuisinier / cuisinière' },
      { libelle: 'Commis / Commise de cuisine' }
    ],
    competences: {
      savoirFaire: [
        { libelle: 'Préparer des plats', description: 'Préparation culinaire' },
        { libelle: 'Dresser des assiettes', description: 'Présentation des plats' },
        { libelle: 'Gérer les stocks', description: 'Gestion des approvisionnements' }
      ],
      savoirs: [
        { libelle: 'Techniques culinaires' },
        { libelle: 'Hygiène alimentaire' }
      ]
    },
    contextes: [
      { libelle: 'Station debout prolongée' },
      { libelle: 'Horaires décalés' }
    ]
  },

  // Domaine N - Transport et logistique
  {
    code: 'N1103',
    libelle: 'Magasinage et préparation de commandes',
    definition: 'Réalise les opérations de réception, de stockage et de préparation de commandes de marchandises.',
    appellations: [
      { libelle: 'Préparateur / Préparatrice de commandes' },
      { libelle: 'Magasinier / Magasinière' },
      { libelle: 'Agent / Agente logistique' }
    ],
    competences: {
      savoirFaire: [
        { libelle: 'Préparer des commandes', description: 'Picking et conditionnement' },
        { libelle: 'Gérer un stock', description: 'Gestion des stocks' },
        { libelle: 'Utiliser un chariot élévateur', description: 'Conduite d\'engins' }
      ],
      savoirs: [
        { libelle: 'Logistique' },
        { libelle: 'Gestion des stocks' }
      ]
    },
    contextes: []
  }
];

class RomeJobsGenerator {
  constructor() {
    this.stats = {
      imported: 0,
      updated: 0,
      errors: 0
    };
  }

  async importJob(romeData) {
    try {
      const jobData = romeMapper.mapRomeToJob(romeData);

      if (!jobData) {
        this.stats.errors++;
        return;
      }

      const existingJob = await Job.findOne({ romeCode: jobData.romeCode });

      if (existingJob) {
        await Job.findByIdAndUpdate(existingJob._id, {
          ...jobData,
          enrichedAt: new Date()
        });
        this.stats.updated++;
        console.log(`  ↻ ${jobData.title} (${jobData.romeCode})`);
      } else {
        await Job.create(jobData);
        this.stats.imported++;
        console.log(`  ✓ ${jobData.title} (${jobData.romeCode})`);
      }
    } catch (error) {
      this.stats.errors++;
      console.error(`  ✗ Erreur: ${error.message}`);
    }
  }

  async run() {
    console.log('\n' + '='.repeat(60));
    console.log('  📥 GÉNÉRATION DES MÉTIERS ROME PRINCIPAUX');
    console.log('='.repeat(60) + '\n');

    try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log('✅ Connecté à MongoDB\n');

      console.log(`🚀 Import de ${ROME_JOBS_DATA.length} métiers ROME...\n`);

      for (const metier of ROME_JOBS_DATA) {
        await this.importJob(metier);
      }

      console.log('\n' + '='.repeat(60));
      console.log('  📊 STATISTIQUES');
      console.log('='.repeat(60));
      console.log(`  Nouveaux métiers   : ${this.stats.imported}`);
      console.log(`  Métiers mis à jour : ${this.stats.updated}`);
      console.log(`  Erreurs            : ${this.stats.errors}`);
      console.log('='.repeat(60) + '\n');

      console.log('📋 Métiers importés:\n');
      const jobs = await Job.find({ source: 'rome' }).sort({ romeCode: 1 });
      const byDomain = {};

      jobs.forEach(job => {
        const domain = job.romeCode.charAt(0);
        if (!byDomain[domain]) byDomain[domain] = [];
        byDomain[domain].push(job);
      });

      Object.keys(byDomain).sort().forEach(domain => {
        const domainName = {
          'D': 'Commerce',
          'E': 'Communication',
          'F': 'BTP',
          'G': 'Hôtellerie',
          'H': 'Industrie',
          'J': 'Santé',
          'K': 'Services',
          'M': 'Support entreprise',
          'N': 'Logistique'
        }[domain] || domain;

        console.log(`\n  ${domain} - ${domainName} (${byDomain[domain].length} métiers)`);
        byDomain[domain].forEach(job => {
          console.log(`    • ${job.title} (${job.romeCode})`);
          console.log(`      RIASEC: ${job.riasec.join(', ')} | Secteur: ${job.sector}`);
        });
      });

      console.log('\n');

    } catch (error) {
      console.error('\n❌ Erreur:', error.message);
      throw error;
    } finally {
      await mongoose.connection.close();
      console.log('✅ Connexion fermée\n');
    }
  }
}

if (require.main === module) {
  const generator = new RomeJobsGenerator();
  generator.run()
    .then(() => {
      console.log('✅ Génération terminée!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Génération échouée:', error);
      process.exit(1);
    });
}

module.exports = RomeJobsGenerator;
