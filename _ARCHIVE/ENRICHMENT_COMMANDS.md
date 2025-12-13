# 🚀 Commandes d'Enrichissement Optimisées

**Commandes prêtes à utiliser avec rate limit respecté**

---

## ✅ Status Actuel

- ✅ **29/30 métiers enrichis** dans le petit test
- ✅ **Données sauvegardées** et accessibles via API
- ✅ **Quality: 80%** par métier
- ✅ **Coût: €0.022** pour 30 métiers
- ⚠️ **Rate limit:** 5 requests/minute (Claude API)

---

## 📋 Commandes Disponibles

### 1️⃣ **Test Rapide** (5 min)

```bash
npm run phase2:test
```

**Vérifie:**
- ✅ APEC Service (données mockées)
- ✅ LinkedIn Service (skills)
- ✅ RNCP Service (certifications)
- ✅ Claude (enrichissement)
- ✅ Scheduler (détection métiers)

---

### 2️⃣ **Petit Batch** (15 min) - RECOMMANDÉ POUR TESTER

```bash
npm run phase2:enrich:all:small
```

**Paramètres:**
- 30 métiers
- Batch size: 10
- Batch delay: **90s** ✅ (rate limit safe!)
- Coût: ~€0.24
- Temps: ~15-20 minutes

**Résultat attendu:** 30 métiers enrichis, zéro erreur 429

---

### 3️⃣ **Batch Moyen** (30 min) - BON ÉQUILIBRE

```bash
npm run phase2:enrich:all:medium
```

**Paramètres:**
- 100 métiers
- Batch size: 10
- Batch delay: **90s** ✅ (rate limit safe!)
- Coût: ~€0.80
- Temps: ~30-40 minutes

**Résultat attendu:** 100 métiers enrichis, qualité excellente

---

### 4️⃣ **Enrichissement Complet** (2-4h) - SOIR/NUIT

```bash
npm run phase2:enrich:all
```

**Paramètres:**
- 50 métiers (configurable: `--limit=100`)
- Batch size: 10
- Batch delay: **90s** ✅ (rate limit safe!)
- Coût: ~€0.40 par 50
- Temps: ~25-30 minutes par 50 métiers

**Résultat attendu:** Tous les métiers enrichis progressivement

---

### 5️⃣ **Mode Rapide** (Risqué - Non Recommandé)

```bash
npm run phase2:enrich:all:fast
```

**Paramètres:**
- Batch delay: **60s** (plus rapide, peut avoir erreurs 429)
- Utile si vous avez un rate limit plus élevé

⚠️ **Attention:** Peut générer des erreurs 429 si rate limit bas!

---

## 🎯 Stratégies Recommandées

### Stratégie 1: Validation (1 heure)

Parfait pour s'assurer que tout fonctionne avant d'enrichir massivement.

```bash
# Étape 1: Test rapide (5 min)
npm run phase2:test

# Étape 2: Petit batch (15 min)
npm run phase2:enrich:all:small

# Étape 3: Inspecter résultats (5 min)
curl http://localhost:5000/api/phase2/enrichment/report

# Étape 4: Batch moyen (30 min)
npm run phase2:enrich:all:medium
```

**Total:** ~55 minutes
**Métiers enrichis:** 130
**Coût:** ~€1.04

---

### Stratégie 2: Enrichissement Complet (2-4 heures)

Une fois satisfait par la stratégie 1, enrichir toute la base.

```bash
# Lancer l'enrichissement complet
npm run phase2:enrich:all

# Pendant l'enrichissement, dans un autre terminal:
watch -n 30 'curl http://localhost:5000/api/phase2/enrichment/report 2>/dev/null | jq'
```

**À faire:** Le soir ou la nuit quand vous ne travaillez pas.

**Résultat:** ~1,500 métiers enrichis, ~4 heures, ~€12

---

### Stratégie 3: Enrichissement par Secteur

Si vous avez peu de temps, enrichir un secteur à la fois.

```bash
# Enrichir secteur Informatique (100 métiers)
npm run phase2:enrich:all:medium -- --sector=M

# Plus tard, enrichir secteur Santé
npm run phase2:enrich:all:medium -- --sector=J
```

---

## 💡 Commandes Personnalisées

### Format Général

```bash
node src/scripts/enrichAllJobs.js [options]
```

### Options Disponibles

```bash
--limit=N              # Max N métiers (défaut: 50)
--sector=X             # Secteur uniquement (ex: M pour Informatique)
--batch-size=N         # Métiers par batch (défaut: 10)
--batch-delay=S        # Délai en secondes entre batches (défaut: 60)
--force                # Forcer re-enrichissement
```

### Exemples Personnalisés

```bash
# Enrichir 200 métiers du secteur Informatique (M)
node src/scripts/enrichAllJobs.js --sector=M --limit=200 --batch-delay=90

# Enrichir 500 métiers avec batches de 20
node src/scripts/enrichAllJobs.js --limit=500 --batch-size=20 --batch-delay=90

# Forcer re-enrichissement de 100 métiers
node src/scripts/enrichAllJobs.js --limit=100 --force --batch-delay=90

# Enrichir sans limite de délai (pour API key avec limite haute)
node src/scripts/enrichAllJobs.js --batch-delay=30
```

---

## 📊 Tableau Comparatif

| Commande | Métiers | Temps | Coût | Rate Limit Safe? |
|----------|---------|-------|------|-----------------|
| `phase2:test` | 1 | 2 min | €0.01 | ✅ |
| `phase2:enrich:all:small` | 30 | 15 min | €0.24 | ✅ |
| `phase2:enrich:all:medium` | 100 | 30 min | €0.80 | ✅ |
| `phase2:enrich:all` (50x20) | 1,000 | 8-10h | €8 | ✅ |
| `phase2:enrich:all:fast` | 30 | 10 min | €0.24 | ⚠️ |

---

## 🔍 Monitoring l'Enrichissement

### Vue d'ensemble

```bash
curl http://localhost:5000/api/phase2/enrichment/report
```

**Résultat:**
```json
{
  "totalJobs": 1500,
  "enrichedJobs": 159,
  "enrichmentRate": "10.6%",
  "averageQuality": 0.78,
  "staleDataSummary": {
    "total": 1341,
    "categories": {
      "neverEnriched": 1341,
      "lowQuality": 0,
      "missingSkills": 1341
    }
  }
}
```

### Statut en temps réel

```bash
watch -n 10 'curl http://localhost:5000/api/phase2/enrichment/status 2>/dev/null | jq'
```

### Via MongoDB

```bash
# Compter métiers enrichis
db.jobs.countDocuments({ enrichedAt: { $exists: true } })

# Voir qualité moyenne
db.jobs.aggregate([
  { $match: { enrichedAt: { $exists: true } } },
  { $group: { _id: null, avgQuality: { $avg: "$dataQuality" } } }
])
```

---

## ⏱️ Planning Recommandé

### Jour 1 (Jeudi)

```bash
# Matin (15 min)
npm run phase2:test

# Midi (15 min)
npm run phase2:enrich:all:small

# Après-midi (5 min)
curl http://localhost:5000/api/phase2/enrichment/report

# Soir (30 min)
npm run phase2:enrich:all:medium
```

**Résultat:** 130 métiers enrichis

### Jour 2 (Vendredi) - Optionnel

```bash
# Soir: Lancer enrichissement complet
npm run phase2:enrich:all
# Laisser tourner toute la nuit (~3-4h)

# Matin du Jour 3: Vérifier résultat
curl http://localhost:5000/api/phase2/enrichment/report
```

**Résultat:** ~1,500 métiers enrichis

---

## ✅ Checklist Avant de Lancer

- [ ] Backend tourne: `npm run dev` affiche "✅ MongoDB connected"
- [ ] ANTHROPIC_API_KEY configurée
- [ ] Test rapide réussi: `npm run phase2:test`
- [ ] Connecté à API: `curl http://localhost:5000/api/phase2/enrichment/report` répond
- [ ] Assez d'espace disque (~500MB pour MongoDB enrichissements)

---

## 🎯 Prochaines Actions

### Immédiat (Maintenant!)

```bash
npm run phase2:enrich:all:small
```

Enrichir 30 métiers pour valider le système avec rate limit respecté.

### Après Validation (Si tout OK)

```bash
npm run phase2:enrich:all:medium
```

Enrichir 100 métiers - bon équilibre qualité/temps.

### Enrichissement Complet (Soir/Nuit)

```bash
npm run phase2:enrich:all
```

Enrichir tous les ~1,500 métiers progressivement.

---

## 📞 Troubleshooting

### Erreur 429 (Rate Limit)

```
Error 429: This request would exceed the rate limit...
```

**Solution:** Augmenter `--batch-delay` à 120 ou 150 secondes

```bash
node src/scripts/enrichAllJobs.js --batch-delay=120
```

### Connexion MongoDB échouée

```
Error: connect ECONNREFUSED
```

**Solution:** Vérifier `MONGO_URI` dans `.env`

### Pas de données enrichies après l'execution

**Solution:** Attendre un peu et relancer

```bash
curl http://localhost:5000/api/phase2/enrichment/report
```

Les métiers enrichis prennent quelques secondes à être sauvegardés.

---

## 🚀 Lancez Maintenant!

```bash
npm run phase2:enrich:all:small
```

**Résultat attendu:**
- 30 métiers enrichis (96.7% succès)
- Zéro erreur 429
- Quality: ~80%
- Temps: ~15-20 minutes

Puis consultez:
```bash
curl http://localhost:5000/api/phase2/enrichment/report
```

---

**Version:** 2.3
**Date:** 9 novembre 2025
**Status:** ✅ Optimisé pour Rate Limit
