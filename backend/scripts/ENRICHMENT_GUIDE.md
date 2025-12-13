# Guide d'enrichissement automatique des métiers

## 🧠 Vue d'ensemble

L'algorithme d'enrichissement automatique analyse chaque métier et complète les informations manquantes :

- ✅ **Secteur d'activité** (Agriculture, Santé, Commerce, etc.)
- ✅ **Niveau d'études requis** (CAP, Bac+2, Bac+5, etc.)
- ✅ **Salaire moyen** (Junior, Confirmé, Senior)
- ✅ **Compétences clés**
- ✅ **Environnement de travail** (Bureau, Extérieur, Atelier, etc.)
- ✅ **Taux d'employabilité** (Fort, Moyen, Faible)
- ✅ **Perspectives d'évolution**
- ✅ **Code ROME** (pour correspondance avec Pôle Emploi)

## 📋 Utilisation du script

### Commande de base

```bash
cd backend
node scripts/enrichJobs.js
```

Cela enrichira **tous** les métiers non enrichis dans la base de données.

### Options disponibles

```bash
# Enrichir seulement 10 métiers (pour tester)
node scripts/enrichJobs.js --limit 10

# Enrichir uniquement les métiers ESCO
node scripts/enrichJobs.js --source ESCO

# Enrichir uniquement les métiers O*NET
node scripts/enrichJobs.js --source onet

# Ré-enrichir même les métiers déjà enrichis
node scripts/enrichJobs.js --force

# Combiner plusieurs options
node scripts/enrichJobs.js --limit 50 --source ESCO --delay 1000

# Réduire le délai entre chaque métier (par défaut 2000ms)
node scripts/enrichJobs.js --delay 500
```

### Paramètres

| Paramètre | Description | Exemple |
|-----------|-------------|---------|
| `--limit N` | Enrichir seulement N métiers | `--limit 100` |
| `--source X` | Filtrer par source (ESCO, onet, rome) | `--source ESCO` |
| `--force` | Ré-enrichir les métiers déjà enrichis | `--force` |
| `--delay MS` | Délai entre chaque enrichissement (ms) | `--delay 1000` |

## 🎯 Stratégie d'enrichissement

### Version actuelle : Heuristique

La version actuelle utilise des **heuristiques basées sur des mots-clés** pour déterminer :

#### 1. Secteur d'activité

Le script détecte 14 secteurs principaux :

- Agriculture
- Artisanat
- Arts et spectacles
- Banque et assurance
- Commerce et distribution
- Communication et information
- Construction et BTP
- Éducation et formation
- Hôtellerie et restauration
- Industrie
- Informatique et télécoms
- Santé et social
- Services aux entreprises
- Transport et logistique

**Exemples :**
- "architecte paysagiste" → détecte `paysag` → **Agriculture**
- "développeur logiciel" → détecte `développeur`, `software` → **Informatique et télécoms**
- "infirmier" → détecte `infirm` → **Santé et social**

#### 2. Niveau d'études

Basé sur les mots-clés du titre :

| Mots-clés | Niveau d'études |
|-----------|-----------------|
| ingénieur, chercheur, docteur | Bac+5 ou plus |
| technicien, gestionnaire | Bac+2/Bac+3 |
| assistant, vendeur, commercial | Bac/Bac+2 |
| ouvrier, artisan, conducteur | CAP/BEP/Bac |

#### 3. Fourchettes salariales

Adaptées selon le type de métier :

| Type de métier | Junior | Confirmé | Senior |
|----------------|--------|----------|--------|
| Ingénieur/Développeur | 35-42k€ | 45-60k€ | 60-85k€ |
| Direction/Management | 35-45k€ | 50-70k€ | 70-120k€ |
| Médecin | 40-60k€ | 60-90k€ | 90-150k€ |
| Artistique/Créatif | 20-28k€ | 28-40k€ | 40-60k€ |
| Vente/Commerce | 20-25k€ | 25-35k€ | 35-50k€ |
| Défaut | 22-28k€ | 28-38k€ | 38-55k€ |

#### 4. Environnement de travail

| Mots-clés | Environnement |
|-----------|---------------|
| jardin, extérieur, chantier | Extérieur |
| atelier, usine | Atelier/Usine |
| magasin, boutique | Magasin |
| laboratoire | Laboratoire |
| hôpital, clinique | Milieu médical |
| (défaut) | Bureau |

#### 5. Compétences clés

Le script détecte et ajoute les compétences pertinentes :

- Gestion de projet
- Communication
- Analyse de données
- Programmation
- Design
- Vente
- Management
- Technique

## 🚀 Améliorations futures

### Version 2.0 : Intégration d'APIs externes

#### APIs à intégrer :

1. **France Travail API** (ex-Pôle Emploi)
   - Récupérer les codes ROME
   - Statistiques d'employabilité réelles
   - Tendances du marché

2. **API INSEE**
   - Données statistiques sur les salaires
   - Projections d'emploi

3. **Web Scraping ciblé**
   - L'Étudiant
   - Studyrama
   - CIDJ

### Version 3.0 : IA générative

Intégrer un LLM (GPT-4, Claude, Mistral) pour :

1. **Analyse sémantique avancée**
   - Comprendre le contexte du métier
   - Déduire les compétences implicites

2. **Génération de contenu**
   - Descriptions enrichies
   - Parcours de formation recommandés
   - Conseils pour accéder au métier

3. **Mise à jour dynamique**
   - Recherche web en temps réel
   - Synthèse des informations trouvées
   - Structuration automatique

#### Exemple d'implémentation future :

```javascript
// Pseudo-code pour version IA
async function enrichJobWithAI(job) {
  // 1. Recherche web
  const searchResults = await webSearch(`${job.title} salaire france 2024`);

  // 2. Analyse par LLM
  const prompt = `
  Métier: ${job.title}
  Description: ${job.description}

  Recherches web:
  ${searchResults}

  Analyse et structure ces données au format JSON...
  `;

  const analysis = await callLLM(prompt);

  // 3. Mise à jour du job
  return analysis;
}
```

## 📊 Champs enrichis dans la base de données

Après enrichissement, chaque métier contient :

```javascript
{
  title: "Architecte paysagiste",
  description: "...",

  // Champs enrichis automatiquement
  education: "Bac+5 (École d'architecture paysagère)",
  salary: {
    junior: "28000-35000",
    mid: "35000-50000",
    senior: "50000-70000"
  },
  sector: "Agriculture",
  employability: "Moyen",
  work_environment: "Extérieur/Bureau",
  skills: [
    "Conception paysagère",
    "Dessin technique",
    "Connaissance des végétaux",
    "Gestion de projet"
  ],
  career_path: [
    "Chef de projet paysage",
    "Directeur d'agence"
  ],
  romeCode: "A1203",  // Code ROME

  // Métadonnées
  enrichedAt: Date   // Date du dernier enrichissement
}
```

## 🔧 Maintenance

### Vérifier les métiers enrichis

```bash
# Compter les métiers enrichis
node -e "
require('dotenv').config();
const mongoose = require('mongoose');
const Job = require('./src/models/Job');

async function count() {
  await mongoose.connect(process.env.MONGO_URI);
  const total = await Job.countDocuments();
  const enriched = await Job.countDocuments({ enrichedAt: { \$exists: true } });
  console.log('Total:', total);
  console.log('Enrichis:', enriched);
  console.log('Pourcentage:', (enriched/total*100).toFixed(1) + '%');
  await mongoose.connection.close();
}

count();
"
```

### Ré-enrichir tous les métiers

Utile si vous améliorez l'algorithme :

```bash
node scripts/enrichJobs.js --force
```

### Enrichir par batch

Pour éviter de surcharger les APIs externes (futur) :

```bash
# Batch 1 : premiers 500 métiers
node scripts/enrichJobs.js --limit 500

# Batch 2 : métiers ESCO uniquement
node scripts/enrichJobs.js --source ESCO

# Batch 3 : métiers O*NET uniquement
node scripts/enrichJobs.js --source onet
```

## ⚡ Performance

- **Délai par défaut** : 2000ms (2 secondes) entre chaque métier
- **Temps estimé** : ~2h pour enrichir 3000 métiers
- **Recommandation** : Lancer en arrière-plan ou par batch

### Exemple de lancement en arrière-plan (Linux/Mac)

```bash
nohup node scripts/enrichJobs.js > enrichment.log 2>&1 &
```

### Exemple Windows (PowerShell)

```powershell
Start-Process node -ArgumentList "scripts/enrichJobs.js" -NoNewWindow -RedirectStandardOutput "enrichment.log"
```

## 🎯 Cas d'usage

### 1. Enrichir uniquement les nouveaux métiers ESCO

```bash
node scripts/enrichJobs.js --source ESCO
```

### 2. Tester l'enrichissement sur 10 métiers

```bash
node scripts/enrichJobs.js --limit 10
```

### 3. Enrichir rapidement (sans délai)

```bash
node scripts/enrichJobs.js --delay 0
```

### 4. Ré-enrichir les métiers avec de nouvelles données

```bash
node scripts/enrichJobs.js --force
```

## 📚 Intégration dans l'application

Une fois les métiers enrichis, le chatbot peut utiliser ces informations pour :

1. **Filtrer par secteur**
   - "Je veux travailler dans l'agriculture" → filtre sector = 'Agriculture'

2. **Filtrer par niveau d'études**
   - "J'ai un Bac+2" → filtre education = 'Bac+2/Bac+3'

3. **Filtrer par salaire**
   - "Je veux gagner au moins 40k€" → filtre salary.mid >= '40000'

4. **Afficher des infos riches**
   - Montrer le salaire attendu
   - Expliquer le parcours de formation
   - Décrire l'environnement de travail

## 🔮 Roadmap

- [ ] **Phase 1** : Heuristiques basiques ✅ (actuelle)
- [ ] **Phase 2** : Intégration API France Travail
- [ ] **Phase 3** : Web scraping ciblé
- [ ] **Phase 4** : LLM pour analyse sémantique
- [ ] **Phase 5** : Mise à jour automatique périodique
- [ ] **Phase 6** : Détection de métiers émergents

---

**Note** : L'algorithme d'enrichissement est conçu pour être progressivement amélioré. Commencez par les heuristiques, puis intégrez des sources de données externes au fur et à mesure.
