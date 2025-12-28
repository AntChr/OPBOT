# 🤖 n8n Workflow - Action Plan Generator

## 📋 Vue d'ensemble

Ce workflow n8n génère automatiquement des plans d'action personnalisés pour les utilisateurs en combinant plusieurs sources de données.

## 🏗️ Architecture du Workflow

```
Webhook Trigger
    ↓
Prepare Data (Function)
    ↓
    ├─→ Pôle Emploi API (offres emploi)
    └─→ France Compétences Mock (formations)
    ↓
Merge Data
    ↓
Consolidate Data (Function)
    ↓
Claude AI Validation (OPTIONNEL - désactivé par défaut)
    ↓
MongoDB Save
    ↓
Callback Backend
    ↓
Webhook Response
```

## 🚀 Installation

### 1. Importer le workflow dans n8n

1. Connectez-vous à votre compte n8n
2. Allez dans **Workflows** → **Add Workflow**
3. Cliquez sur les 3 points (⋮) → **Import from File**
4. Sélectionnez `action-plan-workflow-mvp.json`

### 2. Configurer les credentials

#### MongoDB Connection
1. Allez dans **Credentials** → **Add Credential**
2. Sélectionnez **MongoDB**
3. Configurez :
   - **Host**: Votre URL MongoDB (ex: `cluster0.xxxxx.mongodb.net`)
   - **Database**: `career-orientation`
   - **User**: Votre utilisateur MongoDB
   - **Password**: Votre mot de passe MongoDB
   - **Use SSL**: ✅ (si MongoDB Atlas)

#### Pôle Emploi API (à faire plus tard)
1. Inscrivez-vous sur https://pole-emploi.io/
2. Créez une application
3. Obtenez vos credentials (Client ID + Secret)
4. Dans n8n, créez un credential "HTTP Header Auth" avec :
   - **Name**: `Authorization`
   - **Value**: `Bearer YOUR_ACCESS_TOKEN`

### 3. Configurer les variables d'environnement

Dans n8n, allez dans **Settings** → **Environment Variables** et ajoutez :

```
BACKEND_URL=http://localhost:5000
MONGODB_URI=mongodb+srv://...
```

### 4. Activer le webhook

1. Ouvrez le workflow
2. Cliquez sur le node **Webhook Trigger**
3. Notez l'URL du webhook (ex: `https://your-n8n.app.n8n.cloud/webhook/action-plan-generate`)
4. **Activez le workflow** (toggle en haut à droite)

## 🔧 Configuration Backend

Ajoutez l'URL du webhook n8n dans votre `.env` :

```env
N8N_WEBHOOK_URL=https://your-n8n.app.n8n.cloud/webhook/action-plan-generate
```

## 📝 Utilisation

### Déclencher le workflow depuis le backend

```javascript
const axios = require('axios');

const result = await axios.post(process.env.N8N_WEBHOOK_URL, {
  userId: '12345',
  jobTitle: 'Développeur Full Stack',
  userProfile: {
    location: 'Paris',
    region: 'Île-de-France',
    age: 28,
    education: 'bac+3'
  }
});
```

### Payload attendu

```json
{
  "userId": "string (ObjectId)",
  "jobTitle": "string",
  "userProfile": {
    "location": "string (ville)",
    "region": "string (région)",
    "age": "number",
    "education": "string (bac, bac+2, bac+3, etc.)"
  }
}
```

### Réponse du workflow

```json
{
  "success": true,
  "message": "Action plan generated",
  "actionPlanId": "mongodb_id"
}
```

## 🧪 Test du Workflow

### Test manuel dans n8n

1. Ouvrez le workflow
2. Cliquez sur **Execute Workflow**
3. Le webhook trigger ne fonctionnera pas en test manuel

### Test avec cURL

```bash
curl -X POST https://your-n8n.app.n8n.cloud/webhook/action-plan-generate \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "jobTitle": "Développeur Full Stack",
    "userProfile": {
      "location": "Paris",
      "region": "Île-de-France",
      "age": 28,
      "education": "bac+3"
    }
  }'
```

### Test depuis votre backend

Utilisez la route `/api/action-plan/generate` une fois configurée.

## 🔄 Nodes Détaillés

### 1. Webhook Trigger
- **Type**: Webhook
- **Path**: `action-plan-generate`
- **Method**: POST
- Reçoit les données de l'utilisateur depuis le backend

### 2. Prepare Data
- **Type**: Function
- Extrait et prépare les données
- **TODO**: Mapper `jobTitle` → `romeCode` (actuellement hardcodé `M1805`)
- **TODO**: Convertir `location` → `inseeCode` (actuellement hardcodé `75056`)

### 3. Pôle Emploi API
- **Type**: HTTP Request
- **URL**: `https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search`
- **Authentication**: Bearer token (à configurer)
- **Params**:
  - `codeROME`: Code métier
  - `commune`: Code INSEE
  - `distance`: 50 km
  - `range`: 0-9 (max 10 offres)
- **Continue on Fail**: ✅ (si API down, continue le workflow)

### 4. France Compétences (Mock)
- **Type**: Function
- Retourne des formations mockées
- **TODO**: Remplacer par l'API France Compétences

### 5. Merge Data
- **Type**: Merge
- Combine les résultats de Pôle Emploi et France Compétences
- **Mode**: Merge by position

### 6. Consolidate Data
- **Type**: Function
- Consolide toutes les données
- Calcule le `reliabilityScore`
- Formate pour MongoDB

### 7. Claude AI Validation (OPTIONNEL)
- **Type**: LangChain - Anthropic Chat
- **Status**: ⚠️ **DÉSACTIVÉ par défaut** (pour MVP)
- Valide et améliore les données
- **Coût**: ~$0.01 par plan
- **Activer** : Décocher "Disabled" dans les paramètres du node

### 8. MongoDB Save
- **Type**: MongoDB
- **Operation**: Insert
- **Collection**: `actionplans`
- Sauvegarde le plan d'action complet

### 9. Callback Backend
- **Type**: HTTP Request
- **URL**: `{BACKEND_URL}/api/action-plan/webhook-complete`
- Notifie le backend que le plan est prêt
- **Continue on Fail**: ✅

### 10. Webhook Response
- **Type**: Respond to Webhook
- Retourne une réponse JSON au backend

## ⚠️ TODOs et Limitations MVP

### À faire avant production

- [ ] **Mapping métiers → codes ROME**
  - Créer une table de mapping
  - Intégrer dans le node "Prepare Data"

- [ ] **Conversion location → INSEE**
  - API de géocodage ou table statique
  - Intégrer dans le node "Prepare Data"

- [ ] **Inscription API Pôle Emploi**
  - S'inscrire sur https://pole-emploi.io/
  - Configurer les credentials OAuth2
  - Remplacer le mock dans le node

- [ ] **API France Compétences**
  - Tester l'API
  - Remplacer le node mock
  - Ou scraping structuré si pas d'API

- [ ] **Gestion d'erreurs**
  - Ajouter des nodes de gestion d'erreur
  - Notifications en cas d'échec

### Limitations actuelles (MVP)

1. **Codes ROME hardcodés**: Seulement `M1805` (Développeur web)
2. **Localisation fixe**: Paris (`75056`)
3. **Formations mockées**: Données statiques pour quelques métiers
4. **Pas de retry**: Si API fail, pas de tentative de relance
5. **Claude AI désactivé**: Pour économiser les coûts en phase de test

## 📊 Monitoring

### Voir l'exécution dans n8n

1. Allez dans **Executions**
2. Vous verrez toutes les exécutions du workflow
3. Cliquez sur une exécution pour voir les détails
4. Debuggez les erreurs node par node

### Logs

Chaque node affiche des `console.log()` dans les executions :
- "Prepare Data": Affiche les données reçues
- "Consolidate Data": Affiche le nombre d'offres et formations

## 💰 Coûts

### MVP (avec Claude AI désactivé)
- n8n Cloud (5000 exec/mois): **Gratuit**
- MongoDB Atlas (512MB): **Gratuit**
- Pôle Emploi API: **Gratuit**
- **TOTAL**: **0€/mois**

### Production (avec Claude AI)
- n8n Cloud ou VPS: **15-25€/mois**
- Claude API (100 plans): **30€/mois**
- MongoDB: **0-10€/mois**
- **TOTAL**: **45-65€/mois**

## 🆘 Dépannage

### Le workflow ne se déclenche pas
- Vérifiez que le workflow est **activé** (toggle vert)
- Vérifiez l'URL du webhook
- Testez avec cURL pour isoler le problème

### Erreur MongoDB
- Vérifiez les credentials
- Vérifiez que l'IP de n8n est whitelistée dans MongoDB Atlas
- Vérifiez le nom de la database et collection

### Erreur Pôle Emploi API
- Pour MVP, le node est en `continueOnFail`, donc il ne bloque pas
- Vérifiez les credentials quand vous aurez l'accès API
- Vérifiez les rate limits (200 req/min)

### Pas de callback reçu
- Vérifiez que `BACKEND_URL` est configuré dans n8n
- Vérifiez que le backend écoute sur le bon port
- Vérifiez les logs du node "Callback Backend"

## 🔗 Ressources

- [n8n Documentation](https://docs.n8n.io/)
- [Pôle Emploi API](https://pole-emploi.io/data/api)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [Claude API](https://www.anthropic.com/api)

---

**Version**: 1.0 MVP
**Dernière mise à jour**: 21 décembre 2025
**Auteur**: Antoine + Claude Sonnet 4.5
