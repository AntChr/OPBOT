# 🚀 Phase 2 - Quick Start Guide

**Pour commencer avec Phase 2 en 5 minutes!**

---

## 1️⃣ Vérifier Prerequisites

```bash
# Backend MongoDB et API Key
cd backend
cat .env
# Doit contenir:
# - MONGO_URI=mongodb+srv://...
# - ANTHROPIC_API_KEY=sk-ant-...
# - PORT=5000
```

## 2️⃣ Lancer le Backend

```bash
cd backend
npm install  # Si pas déjà fait
npm run dev  # Démarre le serveur sur :5000
```

**Output attendu:**
```
✅ MongoDB connected
🚀 Server running on http://localhost:5000
```

## 3️⃣ Tester Phase 2 Services

### Option A: Tests Rapides (2 minutes)

```bash
# Dans un nouveau terminal
cd backend

# Tester tous les services
npm run phase2:test

# Ou tester un secteur spécifique
npm run phase2:test:sector
```

**Cela va tester:**
- ✅ APEC Service (offres, profils, salaires)
- ✅ LinkedIn Service (skills tendances)
- ✅ RNCP Service (certifications)
- ✅ Enrichissement complet
- ✅ Auto-enrichment scheduler

### Option B: Enrichir des Métiers (5-10 minutes)

```bash
# Enrichir 10 métiers de test
npm run phase2:enrich:small

# Ou enrichir un secteur complet
npm run phase2:enrich:sector  # Secteur M (Informatique) avec 100 métiers

# Ou lancer enrichissement complet
npm run phase2:enrich  # 50 métiers par défaut
```

## 4️⃣ Consulter les Résultats via API

```bash
# Terminal 3 - Tester les endpoints

# APEC: Offres d'emploi
curl "http://localhost:5000/api/phase2/apec/offers/Développeur%20web"

# LinkedIn: Compétences tendances
curl "http://localhost:5000/api/phase2/linkedin/skills/Développeur%20web"

# RNCP: Certifications
curl "http://localhost:5000/api/phase2/rncp/certifications/Développeur%20web"

# Rapport enrichissement
curl "http://localhost:5000/api/phase2/enrichment/report"

# Statut enrichissement en cours
curl "http://localhost:5000/api/phase2/enrichment/status"
```

## 5️⃣ Commandes Usuelles

### Test des Services

```bash
# Test complet de tous les services
npm run phase2:test

# Test avec logs détaillés
npm run phase2:test -- --force

# Test un métier spécifique (M1805 = Développeur web)
npm run phase2:test:single
```

### Enrichissement

```bash
# Enrichissement standard (50 métiers)
npm run phase2:enrich

# Enrichir petit batch (10 métiers)
npm run phase2:enrich:small

# Enrichir un secteur (Informatique, 100 métiers)
npm run phase2:enrich:sector

# Forcer re-enrichissement même si récent
npm run phase2:enrich:force
```

### Monitoring

```bash
# Voir le statut en temps réel
curl http://localhost:5000/api/phase2/enrichment/status

# Rapport global d'enrichissement
curl http://localhost:5000/api/phase2/enrichment/report

# Détecter données obsolètes
curl http://localhost:5000/api/phase2/enrichment/stale-data
```

---

## 📊 Exemples de Réponses API

### APEC Offres

```json
{
  "success": true,
  "data": {
    "name": "APEC",
    "offerCount": 145,
    "demandLevel": "Élevée",
    "salaryData": {
      "junior": "30k-40k",
      "mid": "42k-52k",
      "senior": "60k-80k"
    },
    "quality": 0.92
  }
}
```

### LinkedIn Skills

```json
{
  "success": true,
  "data": {
    "jobTitle": "Développeur web",
    "skills": ["JavaScript", "React", "Node.js", "CSS", "HTML"],
    "emergingSkills": ["TypeScript", "GraphQL", "WebAssembly"],
    "essentialSkills": ["Problem Solving", "Code Review", "Testing"],
    "demandScore": 0.95
  }
}
```

### RNCP Certifications

```json
{
  "success": true,
  "data": {
    "jobTitle": "Développeur web",
    "totalCount": 2,
    "certifications": [
      {
        "rncpId": "RNCP35899",
        "title": "Développeur web et web mobile",
        "level": 5,
        "duration": "6-12 mois"
      }
    ]
  }
}
```

### Rapport Enrichissement

```json
{
  "success": true,
  "data": {
    "totalJobs": 1584,
    "enrichedJobs": 1200,
    "enrichmentRate": "75%",
    "averageQuality": 0.82,
    "staleDataSummary": {
      "total": 384,
      "categories": {
        "neverEnriched": 100,
        "lowQuality": 150,
        "missingSkills": 134
      }
    }
  }
}
```

---

## 🔧 Configuration Personnalisée

### Changer la taille des batches

```bash
# Enrichir avec batches de 20 au lieu de 10
node src/scripts/runAutoEnrichment.js --batch-size=20

# Délai plus court entre batches (30 secondes)
node src/scripts/runAutoEnrichment.js --batch-delay=30
```

### Enrichir un secteur spécifique

```bash
# Codes ROME majeurs:
# M = Informatique
# N = Électricité, électronique
# L = Nettoyage, sécurité, etc.

npm run phase2:enrich -- --sector=L --limit=50
```

### Tester le mode dry-run

```bash
# Voir ce qui serait enrichi sans sauvegarder
npm run phase2:test -- --test --force
```

---

## ⚠️ Troubleshooting

### Erreur: MongoDB not connected

```bash
# Vérifier la variable d'env
echo $MONGO_URI

# Tester la connexion
node -e "require('mongoose').connect(process.env.MONGO_URI).then(() => console.log('✅ Connected'))"
```

### Erreur: Claude API Error

```bash
# Vérifier l'API Key
echo $ANTHROPIC_API_KEY

# Tester l'accès à Claude
node src/scripts/testAnthropicAPI.js
```

### Requête API timeout

```bash
# Vérifier que le serveur tourne
curl http://localhost:5000/api/phase2/enrichment/status

# Si timeout, relancer le serveur
npm run dev
```

### Rate limit atteint

Si vous voyez "Rate limit" dans les logs:
- Cela signifie que l'API Claude a atteint son limit
- Attendre quelques minutes
- Les batches suivants attendront automatiquement (60s)

---

## 📈 Progression Attendue

### Minute 1-2: Tests rapides
```
✅ APEC Service: 145 offres trouvées, salaires extraits
✅ LinkedIn Service: 15 skills identifiées, score 0.95
✅ RNCP Service: 2 certifications trouvées
✅ Enrichissement: 1 métier enrichi en 3s
✅ Scheduler: 100 métiers prêts à enrichissement
```

### Minute 3-5: Premier enrichissement
```
🚀 Enrichissement lancé
📦 Batch 1: 10 métiers en cours...
✅ Métier 1 enrichi (92% qualité)
✅ Métier 2 enrichi (85% qualité)
...
```

### Minute 10: Rapport
```
📊 Enrichissement complété
✅ 50 métiers enrichis avec succès
❌ 2 erreurs (rate limit, data issues)
💰 Coût estimé: €0.40
⏱️ Durée: 9 minutes 43 secondes
```

---

## 🎯 Prochaines Étapes Après Phase 2

Une fois Phase 2 testé et validé:

1. **Tester le Quiz avec données enrichies**
   - Lancer le frontend
   - Passer le quiz RIASEC
   - Recevoir recommandations basées sur données enrichies
   - Vérifier que skills et salaires apparaissent

2. **Conversation Refinement**
   - User peut dire "plus de salaire"
   - Système re-rank les recommandations
   - Ajouter contraintes (télétravail, localisation)

3. **Career Paths**
   - "Comment devenir Data Scientist?"
   - Afficher parcours étape par étape
   - Formations recommandées
   - Timing réaliste

---

## 📚 Documentation Complète

Pour plus de détails:
- **PHASE2_IMPLEMENTATION.md** - Spécifications techniques
- **PHASE2_SUMMARY.md** - Résumé d'implémentation
- **README.md** - Guide général du projet
- **backend/README.md** - Documentation backend

---

## ✅ Checklist de Démarrage

- [ ] MongoDB connecté (`npm run dev` affiche "✅ MongoDB connected")
- [ ] API Key Claude configurée (teste avec `npm run phase2:test`)
- [ ] Backend tourne sur `http://localhost:5000`
- [ ] Premier test réussi (`npm run phase2:test:small`)
- [ ] API endpoints répondent (`curl http://localhost:5000/api/phase2/enrichment/report`)
- [ ] Au moins 10 métiers enrichis (`npm run phase2:enrich:small`)
- [ ] Rapport d'enrichissement généré (`/api/phase2/enrichment/report`)

---

## 🎉 Vous êtes Prêt!

Félicitations! Phase 2 est prêt. Vous pouvez maintenant:
- ✅ Enrichir la base de métiers
- ✅ Utiliser les APIs pour récupérer données enrichies
- ✅ Tester le système complet (quiz → recommandations)
- ✅ Intégrer au frontend pour meilleure UX

**Bon courage! 🚀**

---

**Last Updated:** 9 novembre 2025
**Status:** ✅ Ready for Testing
