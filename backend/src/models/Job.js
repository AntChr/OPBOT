const mongoose = require("mongoose");

const TRAIT_DIMENSIONS = [
  "analytical", "problem-solving", "creativity", "innovation",
  "detail-oriented", "independent", "teamwork", "leadership",
  "communication", "organizational", "empathy", "design", "service",
  "teaching", "collaborative"
];

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  skills: [String],
  traits: [String],
  education: String,
  salary: {
    junior: String,
    mid: String,
    senior: String
  },
  work_environment: String,
  career_path: [String],
  riasec: [String],   // basé sur le modèle RIASEC (Holland)
  tags: [String],
  traitVector: {
    type: Map,
    of: Number,
    default: () => {
      const vector = new Map();
      TRAIT_DIMENSIONS.forEach(trait => vector.set(trait, 0));
      return vector;
    },
    validate: {
      validator: function(vector) {
        return Array.from(vector.values()).every(val => val >= 0 && val <= 1);
      },
      message: 'Trait vector values must be between 0 and 1'
    }
  },
  source: {
    type: String,
    enum: ['manual', 'onet', 'rome', 'ESCO'],
    default: 'manual'
  },
  externalId: String,
  // Champs spécifiques ESCO
  escoUri: { type: String, unique: true, sparse: true },
  escoCode: String,
  iscoGroup: String,
  altLabels: [String],

  // Champs enrichis automatiquement
  sector: String,  // Secteur d'activité (Agriculture, Santé, Commerce, etc.)
  employability: {
    type: String,
    enum: ['Fort', 'Moyen', 'Faible'],
    default: 'Moyen'
  },
  romeCode: String,  // Code ROME (Répertoire Opérationnel des Métiers et de l'Emploi)

  // Nouveaux champs pour enrichissement futur
  domain: String,  // Domaine professionnel (IT, Santé, Finance, etc.)
  hiringRate: {
    type: Number,
    min: 0,
    max: 100,
    default: null  // Taux d'embauche en pourcentage
  },
  growthPotential: {
    type: String,
    enum: ['Excellent', 'Bon', 'Stable', 'Déclin', null],
    default: null  // Potentiel de croissance du métier
  },
  remoteWorkCompatibility: {
    type: String,
    enum: ['Full', 'Hybrid', 'OnSite', null],
    default: null  // Compatibilité télétravail
  },
  experienceRequired: {
    min: { type: Number, default: 0 },  // Années d'expérience minimum
    max: { type: Number, default: null }  // Années d'expérience maximum
  },
  certifications: [String],  // Certifications requises ou recommandées
  workload: {
    type: String,
    enum: ['Light', 'Moderate', 'Intense', null],
    default: null  // Charge de travail typique
  },
  stressLevel: {
    type: String,
    enum: ['Low', 'Moderate', 'High', null],
    default: null  // Niveau de stress
  },
  geographicFlexibility: {
    type: String,
    enum: ['High', 'Moderate', 'Low', null],
    default: null  // Mobilité géographique requise
  },

  // Métadonnées d'enrichissement
  importedAt: Date,
  enrichedAt: Date,  // Date du dernier enrichissement automatique
  enrichedSources: [String],  // Sources utilisées pour l'enrichissement (Wikipedia, Wikidata, etc.)
  dataQuality: {
    type: Number,
    min: 0,
    max: 1,
    default: null  // Score de qualité des données (0-1)
  },
  workEnvironment: String,  // Description de l'environnement de travail
  careerPath: [String]  // Évolutions de carrière possibles
}, { timestamps: true });

module.exports = mongoose.model("Job", jobSchema);
module.exports.TRAIT_DIMENSIONS = TRAIT_DIMENSIONS;
