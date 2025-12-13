# 🧠 Système d'Enrichissement Intelligent des Métiers

## 🎯 Vue d'Ensemble

Système intelligent utilisant l'IA (Claude LLM) et le web scraping multi-sources pour automatiquement enrichir, compléter et harmoniser votre base de données de métiers.

## ✨ Fonctionnalités

### 🤖 Analyse par IA
- **LLM**: Claude 3 Haiku pour analyse intelligente
- **Prompt structuré**: Génération de données cohérentes et de qualité
- **Multi-sources**: Combine Wikipedia, Wikidata, France Travail

### 📊 Enrichissement Automatique
- **Description**: Texte professionnel et détaillé (2-3 phrases)
- **Compétences**: 8-12 compétences clés par métier
- **TraitVector**: Les 15 dimensions de personnalité (0-1 score)
- **RIASEC**: Codes Holland (1-3 codes par métier)
- **Éducation**: Niveau d'études requis
- **Salaire**: Fourchettes junior/confirmé/senior
- **Environnement**: Description du contexte de travail
- **Carrière**: 3-5 évolutions possibles

### 🌐 Sources Web Multiples
- ✅ **Wikipedia FR**: Descriptions détaillées
- ✅ **Wikidata**: Données structurées
- ✅ **France Travail**: Fiches ROME officielles
- 🔜 **APEC**: Offres et profils
- 🔜 **LinkedIn**: Titres et compétences populaires
- 🔜 **RNCP**: Certifications professionnelles

### 🎚️ Qualité des Données
- **Score de qualité**: 0-100%
- **Suivi des sources**: Track des sources utilisées
- **Date d'enrichissement**: Horodatage automatique
- **Veille**: Re-enrichissement automatique si > 30 jours

## 🚀 Utilisation

### Commandes NPM

```bash
# Enrichir les métiers qui en ont besoin
npm run enrich:job

# Enrichir 10 métiers pour tester
npm run enrich:sample

# Forcer le re-enrichissement (même si récent)
npm run enrich:force
```

### Options CLI

```bash
# Enrichir un métier spécifique
node src/scripts/intelligentEnrichment.js --job=M1805

# Enrichir un secteur entier
node src/scripts/intelligentEnrichment.js --sector=M

# Limiter le nombre de métiers
node src/scripts/intelligentEnrichment.js --limit=50

# Forcer le re-enrichissement
node src/scripts/intelligentEnrichment.js --force
```

## 📁 Architecture

```
backend/
├── src/
│   ├── services/
│   │   ├── JobEnrichmentService.js      # 🧠 Service LLM + analyse
│   │   └── WebScraperService.js         # 🌐 Scraping multi-sources
│   ├── scripts/
│   │   ├── intelligentEnrichment.js     # 🚀 Script principal
│   │   ├── viewEnrichedJob.js           # 👁️  Visualiser un métier
│   │   └── testAnthropicAPI.js          # 🔧 Test API Anthropic
│   └── models/
│       └── Job.js                       # 📊 Modèle enrichi
```

## 🔧 Services

### JobEnrichmentService

Service principal d'analyse par IA.

**Méthodes:**
- `analyzeJobWithLLM(jobData, sources)` - Analyse complète avec Claude
- `buildAnalysisPrompt(jobData, sources)` - Construit le prompt IA
- `parseAIResponse(response)` - Parse la réponse JSON
- `mergeJobData(existingJob, newData)` - Fusionne données anciennes/nouvelles
- `needsEnrichment(job)` - Détermine si enrichissement nécessaire
- `calculateSimilarity(job1, job2)` - Détecte les doublons

**Exemple:**
```javascript
const enrichmentService = require('./services/JobEnrichmentService');
const sources = await scraperService.gatherAllSources(job);
const enrichedData = await enrichmentService.analyzeJobWithLLM(job, sources);
```

### WebScraperService

Service de collecte de données web multi-sources.

**Méthodes:**
- `gatherAllSources(jobInfo)` - Collecte toutes les sources
- `scrapeWikipedia(jobTitle)` - Wikipedia FR
- `scrapeWikidata(jobTitle)` - Wikidata entities
- `scrapeFranceTravail(romeCode)` - Fiche ROME (future)
- `scrapeAPEC(jobTitle)` - APEC data (future)
- `scrapeLinkedIn(jobTitle)` - LinkedIn data (future)

**Exemple:**
```javascript
const scraperService = require('./services/WebScraperService');
const sources = await scraperService.gatherAllSources({
  title: 'Développeur web',
  romeCode: 'M1805',
  sector: 'Informatique'
});
// Returns: [{ name: 'Wikipedia', content: '...', quality: 0.8 }, ...]
```

## 📊 Exemple de Résultat

**Avant enrichissement:**
```json
{
  "title": "Développeur informatique",
  "romeCode": "M1805",
  "skills": ["Programmation", "Tests"],
  "description": "Métier référencé dans le ROME 4.0"
}
```

**Après enrichissement:**
```json
{
  "title": "Développeur / Développeuse informatique",
  "romeCode": "M1805",
  "description": "Le développeur informatique conçoit, développe et met en œuvre des applications logicielles selon les besoins des utilisateurs...",
  "skills": [
    "Programmation",
    "Résolution de problèmes",
    "Logique",
    "Tests unitaires",
    "Analyse des besoins",
    "Git/Versioning",
    "Architecture logicielle",
    "Méthodologies agiles"
  ],
  "education": "Bac+3 à Bac+5 en informatique",
  "salary": {
    "junior": "30K-40K€",
    "mid": "40K-55K€",
    "senior": "55K-80K€"
  },
  "traitVector": {
    "problem-solving": 0.9,
    "analytical": 0.8,
    "creativity": 0.6,
    "teamwork": 0.6,
    "independent": 0.7,
    ...
  },
  "riasec": ["I", "R"],
  "careerPath": [
    "Chef de projet informatique",
    "Architecte logiciel",
    "Responsable R&D"
  ],
  "workEnvironment": "Bureau, en équipe, horaires réguliers, mode projet avec deadlines",
  "dataQuality": 0.8,
  "enrichedAt": "2025-11-02T10:52:03Z",
  "enrichedSources": ["Wikipedia", "France Travail"]
}
```

## 💰 Coûts API

**Claude 3 Haiku** (tarification actuelle):
- ~0.021€ par métier enrichi
- ~21€ pour 1,000 métiers
- ~33€ pour les 1,584 métiers ROME

**Note**: Utilisez `--limit` pour contrôler les coûts lors des tests.

## 🔄 Workflow Automatisé

```
1. Sélection des métiers
   └─> Filtre par besoin (< 30 jours, données manquantes, faible qualité)

2. Collecte des sources
   └─> Wikipedia → Wikidata → France Travail → [APEC, LinkedIn, RNCP]

3. Analyse LLM
   └─> Prompt structuré → Claude 3 Haiku → Réponse JSON

4. Fusion intelligente
   └─> Garde les meilleures données (ancien + nouveau)

5. Sauvegarde MongoDB
   └─> Met à jour + horodatage + score qualité
```

## 🎯 Critères d'Enrichissement

Un métier est marqué comme nécessitant enrichissement si:
- ❌ Pas enrichi depuis > 30 jours
- ❌ Description < 50 caractères
- ❌ Moins de 5 compétences
- ❌ Pas de fourchette salariale
- ❌ TraitVector vide ou moyenne < 0.1

## 📈 Évolutivité

### Ajouter une Nouvelle Dimension au TraitVector

1. Modifier `src/models/Job.js`:
```javascript
const TRAIT_DIMENSIONS = [
  'analytical',
  // ... existing dimensions
  'nouvelle-dimension'  // ← Ajoutez ici
];
```

2. Modifier le prompt dans `JobEnrichmentService.js`:
```javascript
"traitVector": {
  "analytical": 0.0-1.0,
  // ... existing traits
  "nouvelle-dimension": 0.0-1.0  // ← Ajoutez ici
}
```

3. Re-enrichir:
```bash
npm run enrich:force
```

### Ajouter une Nouvelle Source Web

1. Implémenter dans `WebScraperService.js`:
```javascript
async scrapeNouvelleSource(jobTitle) {
  // Logique de scraping
  return {
    name: 'NouvelleName',
    content: 'Données extraites...',
    url: 'https://...',
    quality: 0.8
  };
}
```

2. Ajouter à `gatherAllSources()`:
```javascript
const nouvelleSource = await this.scrapeNouvelleSource(jobInfo.title);
if (nouvelleSource) sources.push(nouvelleSource);
```

## 🔍 Monitoring

### Visualiser un Métier Enrichi

```bash
# Créer un viewer personnalisé
node src/scripts/viewEnrichedJob.js
```

### Statistiques de Qualité

```javascript
// Dans MongoDB
db.jobs.aggregate([
  { $match: { source: 'rome' } },
  { $group: {
    _id: null,
    avgQuality: { $avg: '$dataQuality' },
    enrichedCount: { $sum: { $cond: ['$enrichedAt', 1, 0] } }
  }}
]);
```

## 🛠️ Dépannage

### Erreur 404 Model
**Problème**: `model: claude-3-sonnet-20240229 not found`
**Solution**: Votre clé API n'a accès qu'à Haiku. Le code utilise automatiquement Haiku.

### Pas de Sources Trouvées
**Problème**: `0 source(s) trouvée(s)`
**Solution**: Vérifiez la connectivité réseau et les URL Wikipedia.

### Qualité Faible (< 50%)
**Problème**: Score de qualité bas
**Solution**: Ajoutez plus de sources ou améliorez le prompt.

## 🚀 Prochaines Étapes

### Phase 1: Sources Complètes ✅
- [x] Wikipedia FR
- [x] Wikidata
- [x] France Travail metadata
- [ ] APEC scraping
- [ ] LinkedIn API
- [ ] RNCP certifications

### Phase 2: Veille Automatique
- [ ] Cron job pour re-enrichissement mensuel
- [ ] Détection de nouveaux métiers émergents
- [ ] Alertes sur changements majeurs

### Phase 3: Intelligence Avancée
- [ ] Clustering de métiers similaires
- [ ] Recommandations de reconversion
- [ ] Prédiction de tendances emploi

## 📚 Ressources

- **Claude API**: https://docs.anthropic.com/
- **Wikipedia API**: https://www.mediawiki.org/wiki/API
- **Wikidata**: https://www.wikidata.org/wiki/Wikidata:Data_access
- **France Travail**: https://francetravail.io/data/api

---

**Créé le**: 2 novembre 2025
**Dernière mise à jour**: Système opérationnel avec Wikipedia + Wikidata
**Statut**: ✅ Production Ready pour enrichissement initial
