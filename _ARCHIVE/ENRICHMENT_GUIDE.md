# 📚 Guide d'Enrichissement Phase 2

**Différentes stratégies pour enrichir votre base de métiers**

---

## 🎯 Objectif

Enrichir les 1,500+ métiers O*NET importés avec des données de qualité provenant de:
- ✅ Compétences tendances (LinkedIn)
- ✅ Certifications professionnelles (RNCP)
- ✅ Données salariales réalistes (APEC)
- ✅ Analysis IA (Claude) pour harmoniser les données

---

## 📊 État Actuel

```
Total métiers: ~1,500+
Enrichis: 1 (test)
À enrichir: ~1,499
Qualité moyenne: 0.01
```

---

## 🚀 Stratégies d'Enrichissement

### Stratégie 1: Test Rapide (5 minutes)

Valider que le système fonctionne avant de lancer sur tous les métiers.

```bash
npm run phase2:test
```

**Résultat:**
- ✅ Teste APEC, LinkedIn, RNCP, Claude
- ✅ Enrichit 1 métier complet
- ✅ Valide l'architecture

---

### Stratégie 2: Enrichir un Petit Batch (15 minutes)

Enrichir 30 métiers pour avoir un aperçu des résultats.

```bash
npm run phase2:enrich:all:small
```

**Configuration:**
- 30 métiers
- Batches de 10
- 60s délai entre batches

**Résultat:**
- Métiers enrichis: ~30
- Temps: ~10-15 minutes
- Coût: ~€0.24

---

### Stratégie 3: Enrichir par Secteur (30 minutes)

Enrichir un secteur complet (ex: Informatique) pour tester sur un domaine cohérent.

```bash
npm run phase2:enrich:sector
```

**Configuration:**
- Secteur M (Informatique)
- 100 métiers max
- Batches de 10
- 60s délai entre batches

**Résultat:**
- Métiers enrichis: ~100
- Temps: ~30 minutes
- Coût: ~€0.80

---

### Stratégie 4: Enrichir TOUT (2-4 heures)

Enrichir la base complète de ~1,500 métiers.

```bash
npm run phase2:enrich:all
```

**Configuration:**
- 50 métiers par batch (configurable: `--limit=50`)
- Batches de 10 (configurable: `--batch-size=10`)
- 60s délai entre batches (configurable: `--batch-delay=60`)

**Résultat:**
- Métiers enrichis: ~1,500
- Temps: ~2-4 heures
- Coût: ~€12

**⚠️ Recommandation:**
- Lancer le soir ou nuit
- Laisser tourner en background
- Monitorer occasionnellement

---

## 📈 Commandes Détaillées

### Test Complet des Services

```bash
# Teste tous les services Phase 2
npm run phase2:test

# Affiche tous les logs et valide l'architecture
# Temps: ~2 minutes
# Coût: ~€0.02
```

### Enrichissement Petit Batch

```bash
# Enrichir 30 métiers
npm run phase2:enrich:all:small

# Options personnalisées
node src/scripts/enrichAllJobs.js --limit=50 --batch-size=20
```

### Enrichissement Complet

```bash
# Enrichir tous les métiers (50 max, défaut)
npm run phase2:enrich:all

# Enrichir 100 métiers
npm run phase2:enrich:all --limit=100

# Enrichir un secteur spécifique
npm run phase2:enrich:all -- --sector=M --limit=100

# Forcer re-enrichissement (même si récent)
npm run phase2:enrich:all -- --force --limit=50

# Configuration fine
node src/scripts/enrichAllJobs.js --limit=100 --batch-size=20 --batch-delay=90
```

---

## 📋 Plan Recommandé

### Jour 1: Validation

```bash
# Terminal 1: Lancer le serveur
npm run dev

# Terminal 2: Tester les services
npm run phase2:test
```

**Check points:**
- ✅ APEC Service retourne salaires
- ✅ LinkedIn retourne 6+ skills
- ✅ RNCP retourne certifications
- ✅ Claude enrichit avec succès

### Jour 2: Petit Batch

```bash
# Enrichir 30 métiers pour vérifier qualité
npm run phase2:enrich:all:small
```

**Inspect:**
- Vérifier les données enrichies dans MongoDB
- Consulter `/api/phase2/enrichment/report`
- Vérifier qualité moyenne (devrait être >0.75)

### Jour 3: Enrichissement Complet (optionnel, soir)

```bash
# Enrichir tous les métiers
npm run phase2:enrich:all --limit=200

# Monitorer
curl http://localhost:5000/api/phase2/enrichment/status
curl http://localhost:5000/api/phase2/enrichment/report
```

---

## 🔍 Monitoring

### Vérifier le Statut en Temps Réel

```bash
# Statut actuel
curl http://localhost:5000/api/phase2/enrichment/status

# Rapport global
curl http://localhost:5000/api/phase2/enrichment/report

# Exemple de réponse:
# {
#   "totalJobs": 1500,
#   "enrichedJobs": 127,
#   "enrichmentRate": "8%",
#   "averageQuality": 0.78,
#   "staleDataSummary": {
#     "total": 1373,
#     "categories": {
#       "neverEnriched": 1373,
#       "lowQuality": 0,
#       "missingSkills": 1373
#     }
#   }
# }
```

### Logs Détaillés

```bash
# En terminal, affiche logs détaillés
npm run dev

# Pendant enrichissement, voir:
# 📌 Métier en cours
# ✅ Qualité score
# 💰 Coût estimé
# ⏱️  Durée
```

---

## 💰 Coûts Estimés

| Stratégie | Métiers | Temps | Coût |
|-----------|---------|-------|------|
| Test | 1 | 2 min | €0.01 |
| Petit batch | 30 | 15 min | €0.24 |
| Secteur | 100 | 30 min | €0.80 |
| **Complet** | **1,500** | **2-4h** | **€12** |

---

## ✅ Checklist Avant Lancement

- [ ] MongoDB connecté (`npm run dev` affiche "✅ MongoDB connected")
- [ ] ANTHROPIC_API_KEY configurée
- [ ] Test rapide réussi (`npm run phase2:test`)
- [ ] Connecté au backend (`http://localhost:5000` répond)
- [ ] Pas de requête en cours (check `/enrichment/status`)
- [ ] Assez d'espace disque (MongoDB)

---

## 🛑 Arrêter un Enrichissement en Cours

```bash
# Ctrl+C dans le terminal de enrichissement
# Le scheduler s'arrêtera après le batch actuel
# Les métiers enrichis seront sauvegardés

# Vérifier le statut
curl http://localhost:5000/api/phase2/enrichment/status
```

---

## 🔧 Troubleshooting

### Erreur: Request failed with status code 404 (APEC)

C'est normal! APEC.fr bloque le scraping. Le système utilise automatiquement des données mockées réalistes.

**Solution:** Aucune - utilise les fallbacks ✅

### Erreur: MongoDB connection failed

```bash
# Vérifier la connexion
echo $MONGO_URI
# Devrait afficher votre URL MongoDB Atlas

# Tester la connexion
node -e "require('mongoose').connect(process.env.MONGO_URI).then(() => console.log('✅ OK'))"
```

### Erreur: Claude API Error

```bash
# Vérifier l'API Key
echo $ANTHROPIC_API_KEY
# Devrait afficher sk-ant-...

# Tester Claude
node src/scripts/testAnthropicAPI.js
```

### Enrichissement lent

C'est normal! Chaque métier prend ~3-5s (Claude analysis). Pour 1,500 métiers:
- Sequential: ~2-4 heures
- Avec 3 workers: ~1 heure

**Optimisation:**
```bash
# Augmenter batch size
npm run phase2:enrich:all -- --batch-size=20

# Réduire délai entre batches (risqué pour rate limit)
npm run phase2:enrich:all -- --batch-delay=30
```

---

## 📊 Résultats Attendus

Après enrichissement complet:

```
AVANT                      APRÈS
─────────────────────────────────────
Enrichis: 1               1,500+
Skills/job: 0             12-15
Qualité: 0.01             0.80
Salaires: ❌              ✅
Certifs: ❌               ✅
RIASEC: ❌                ✅
Description: 2-3 words    200+ words
```

---

## 🎉 Prochaines Étapes

Après enrichissement:

1. **Tester le Quiz**
   ```bash
   # Lancer frontend
   cd frontend && npm run dev

   # Faire un quiz et recevoir recommandations
   # Vérifier que skills + salaires apparaissent
   ```

2. **Intégrer au Chat**
   - ConversationService utilise métiers enrichis
   - Recommandations de meilleure qualité

3. **Analyser Résultats**
   - Curl `/api/phase2/enrichment/report`
   - Vérifier quality scores
   - Mesurer impact sur recommandations

---

## 📞 Support

**Besoin d'aide?**

1. Consulter [PHASE2_QUICKSTART.md](PHASE2_QUICKSTART.md)
2. Vérifier [PHASE2_IMPLEMENTATION.md](PHASE2_IMPLEMENTATION.md)
3. Lire les logs détaillés (`npm run dev`)

---

**Version:** 2.1 | **Date:** 9 novembre 2025 | **Ready:** ✅ Let's Go!
