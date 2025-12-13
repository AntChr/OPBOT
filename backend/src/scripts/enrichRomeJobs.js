/**
 * Enrichit les métiers ROME existants avec des compétences intelligentes
 * basées sur l'analyse du titre et du secteur
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Job = require('../models/Job');
const { TRAIT_DIMENSIONS } = require('../models/Job');

// Dictionnaire de mots-clés → compétences
const KEYWORDS_TO_SKILLS = {
  // Technique et développement
  'développeur': ['Programmation', 'Résolution de problèmes', 'Logique', 'Tests unitaires'],
  'informatique': ['Informatique', 'Outils numériques', 'Dépannage'],
  'programmeur': ['Programmation', 'Algorithmique', 'Debugging'],
  'technicien': ['Maintenance', 'Diagnostic', 'Réparation', 'Outils techniques'],
  'ingénieur': ['Conception', 'Analyse technique', 'Innovation', 'Gestion de projet'],

  // Management et organisation
  'manager': ['Management d\'équipe', 'Organisation', 'Planification', 'Leadership'],
  'responsable': ['Gestion', 'Coordination', 'Pilotage', 'Supervision'],
  'chef': ['Encadrement', 'Organisation', 'Délégation', 'Décision'],
  'directeur': ['Direction', 'Stratégie', 'Management', 'Vision'],
  'coordinateur': ['Coordination', 'Organisation', 'Gestion de projet'],

  // Commercial et vente
  'commercial': ['Vente', 'Négociation', 'Prospection', 'Relation client'],
  'vendeur': ['Vente', 'Conseil', 'Présentation produits', 'Argumentation'],
  'conseiller': ['Conseil', 'Écoute', 'Analyse des besoins', 'Recommandation'],

  // Santé et soins
  'médecin': ['Diagnostic médical', 'Prescription', 'Examen clinique', 'Suivi patient'],
  'infirmier': ['Soins infirmiers', 'Administration médicaments', 'Surveillance', 'Hygiène'],
  'aide-soignant': ['Soins d\'hygiène', 'Accompagnement', 'Confort', 'Observation'],

  // Communication
  'communication': ['Communication', 'Rédaction', 'Réseaux sociaux', 'Relations publiques'],
  'journaliste': ['Rédaction', 'Investigation', 'Interview', 'Édition'],
  'community manager': ['Réseaux sociaux', 'Content creation', 'Engagement communauté'],

  // Artisanat et construction
  'maçon': ['Maçonnerie', 'Lecture de plans', 'Bétonnage', 'Montage'],
  'électricien': ['Électricité', 'Installation électrique', 'Câblage', 'Normes électriques'],
  'plombier': ['Plomberie', 'Installation sanitaire', 'Soudure', 'Diagnostic pannes'],
  'menuisier': ['Menuiserie', 'Travail du bois', 'Mesure', 'Assemblage'],

  // Hôtellerie et restauration
  'cuisinier': ['Cuisine', 'Préparation culinaire', 'Hygiène alimentaire', 'Créativité culinaire'],
  'serveur': ['Service en salle', 'Accueil client', 'Prise de commande', 'Service'],
  'réceptionniste': ['Accueil', 'Standard téléphonique', 'Réservation', 'Information client'],

  // Logistique
  'préparateur': ['Préparation commandes', 'Gestion stock', 'Manutention', 'Organisation'],
  'magasinier': ['Gestion stock', 'Inventaire', 'Réception', 'Expédition'],
  'livreur': ['Livraison', 'Conduite', 'Relation client', 'Organisation tournée'],

  // Agriculture
  'agriculteur': ['Culture', 'Élevage', 'Conduite engins', 'Connaissance terrain'],
  'jardinier': ['Entretien espaces verts', 'Taille', 'Plantation', 'Arrosage']
};

// Mots-clés → TraitVector
const KEYWORDS_TO_TRAITS = {
  'développeur': { analytical: 0.9, 'problem-solving': 0.9, creativity: 0.7, 'detail-oriented': 0.8, independent: 0.7 },
  'informatique': { analytical: 0.8, 'problem-solving': 0.8, 'detail-oriented': 0.7, independent: 0.6 },
  'manager': { leadership: 0.9, organizational: 0.9, communication: 0.8, teamwork: 0.7, 'problem-solving': 0.7 },
  'commercial': { communication: 0.9, independent: 0.7, 'problem-solving': 0.6, creativity: 0.5 },
  'médecin': { analytical: 0.9, 'problem-solving': 0.9, empathy: 0.8, 'detail-oriented': 0.9, communication: 0.7 },
  'infirmier': { empathy: 0.9, service: 0.9, organizational: 0.7, communication: 0.7, 'detail-oriented': 0.8 },
  'cuisinier': { creativity: 0.8, 'detail-oriented': 0.7, organizational: 0.6, independent: 0.6 },
  'technicien': { 'problem-solving': 0.8, analytical: 0.7, 'detail-oriented': 0.8, independent: 0.6 },
  'vendeur': { communication: 0.8, service: 0.8, empathy: 0.6, creativity: 0.5 },
  'aide-soignant': { empathy: 0.9, service: 0.9, communication: 0.6, organizational: 0.5 }
};

class RomeEnricher {
  constructor() {
    this.stats = {
      updated: 0,
      errors: 0
    };
  }

  /**
   * Extrait les compétences depuis le titre du métier
   */
  extractSkillsFromTitle(title) {
    const titleLower = title.toLowerCase();
    const skills = new Set();

    for (const [keyword, skillList] of Object.entries(KEYWORDS_TO_SKILLS)) {
      if (titleLower.includes(keyword)) {
        skillList.forEach(skill => skills.add(skill));
      }
    }

    // Compétences génériques si aucune trouvée
    if (skills.size === 0) {
      return ['Compétences professionnelles', 'Travail en équipe', 'Communication'];
    }

    return Array.from(skills);
  }

  /**
   * Calcule le traitVector depuis le titre
   */
  calculateTraitVector(title) {
    const titleLower = title.toLowerCase();
    const traitVector = new Map();

    // Initialiser à 0
    TRAIT_DIMENSIONS.forEach(trait => traitVector.set(trait, 0));

    let matchCount = 0;

    // Appliquer les traits pour chaque mot-clé trouvé
    for (const [keyword, traits] of Object.entries(KEYWORDS_TO_TRAITS)) {
      if (titleLower.includes(keyword)) {
        matchCount++;
        for (const [trait, value] of Object.entries(traits)) {
          const current = traitVector.get(trait) || 0;
          traitVector.set(trait, Math.min(1, current + value));
        }
      }
    }

    // Si aucun match, valeurs par défaut basées sur le secteur
    if (matchCount === 0) {
      traitVector.set('communication', 0.5);
      traitVector.set('teamwork', 0.5);
      traitVector.set('organizational', 0.4);
    } else {
      // Normaliser
      TRAIT_DIMENSIONS.forEach(trait => {
        const val = traitVector.get(trait);
        traitVector.set(trait, Math.min(1, val / Math.max(1, matchCount * 0.5)));
      });
    }

    return traitVector;
  }

  /**
   * Enrichit un métier
   */
  async enrichJob(job) {
    try {
      // Si déjà des compétences, on ne touche pas
      if (job.skills && job.skills.length > 5) {
        return;
      }

      const newSkills = this.extractSkillsFromTitle(job.title);
      const newTraitVector = this.calculateTraitVector(job.title);

      await Job.findByIdAndUpdate(job._id, {
        skills: newSkills,
        traitVector: newTraitVector,
        enrichedAt: new Date()
      });

      this.stats.updated++;
      process.stdout.write('✓');

      if (this.stats.updated % 50 === 0) {
        console.log(` ${this.stats.updated}`);
      }
    } catch (error) {
      this.stats.errors++;
      process.stdout.write('✗');
    }
  }

  async run() {
    console.log('\n' + '='.repeat(60));
    console.log('  🔧 ENRICHISSEMENT DES MÉTIERS ROME');
    console.log('='.repeat(60) + '\n');

    try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log('✅ Connecté à MongoDB\n');

      const jobs = await Job.find({ source: 'rome' });
      console.log(`📊 ${jobs.length} métiers ROME à enrichir\n`);

      console.log('🚀 Enrichissement en cours...\n');

      for (const job of jobs) {
        await this.enrichJob(job);
      }

      console.log('\n');

      console.log('\n' + '='.repeat(60));
      console.log('  📊 STATISTIQUES');
      console.log('='.repeat(60));
      console.log(`  Métiers enrichis : ${this.stats.updated}`);
      console.log(`  Erreurs          : ${this.stats.errors}`);
      console.log('='.repeat(60) + '\n');

      // Exemples
      console.log('📋 Exemples de métiers enrichis:\n');
      const samples = await Job.find({ source: 'rome' }).limit(5);

      samples.forEach(job => {
        console.log('━'.repeat(60));
        console.log(`${job.title} (${job.romeCode})`);
        console.log(`Compétences: ${job.skills.slice(0, 3).join(', ')}...`);
        const topTraits = Array.from(job.traitVector.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3);
        console.log('Top traits:');
        topTraits.forEach(([trait, val]) => {
          console.log(`  - ${trait}: ${Math.round(val * 100)}%`);
        });
      });

      console.log('');

    } catch (error) {
      console.error('\n❌ Erreur:', error.message);
      throw error;
    } finally {
      await mongoose.connection.close();
      console.log('\n✅ Connexion fermée\n');
    }
  }
}

if (require.main === module) {
  const enricher = new RomeEnricher();
  enricher.run()
    .then(() => {
      console.log('✅ Enrichissement terminé!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Enrichissement échoué:', error);
      process.exit(1);
    });
}

module.exports = RomeEnricher;
