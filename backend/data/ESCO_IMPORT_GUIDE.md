# Guide d'importation des métiers ESCO

## Qu'est-ce qu'ESCO ?

ESCO (European Skills, Competences, Qualifications and Occupations) est la classification européenne multilingue des professions, compétences, qualifications et aptitudes. Elle fonctionne comme un dictionnaire, décrivant, identifiant et classant les professions et compétences professionnelles pertinentes pour le marché du travail et le domaine de l'éducation et de la formation de l'UE.

## Avantages d'ESCO

- ✅ **Multilingue** : Disponible en 28 langues incluant le français
- ✅ **Métiers pertinents** : Classification européenne adaptée au marché français
- ✅ **Titres en français** : Contrairement à O*NET (anglais uniquement)
- ✅ **Mise à jour régulière** : Version v1.2.0 publiée en mai 2024
- ✅ **Gratuit** : Téléchargement libre et gratuit

## Télécharger les données ESCO

### Étape 1 : Accéder au portail de téléchargement

Rendez-vous sur : [https://esco.ec.europa.eu/en/use-esco/download](https://esco.ec.europa.eu/en/use-esco/download)

### Étape 2 : Configurer les filtres

Dans le formulaire de téléchargement, sélectionnez :

- **Version** : `ESCO dataset – v1.2.0` (ou version plus récente)
- **Content** : `Classification` ⚠️ **IMPORTANT** (PAS "Delta" ni "Local API")
- **Language** : `Français (fr)` 🇫🇷
- **File type** : `CSV` (Comma-Separated Values)

**Note sur les options "Content"** :
- ✅ **Classification** = Données complètes (toutes les occupations) - **C'EST CELUI-CI**
- ❌ **Delta** = Différences entre versions uniquement
- ❌ **Local API** = API à installer localement (pas un fichier de données)

### Étape 3 : Télécharger le fichier

Cliquez sur le bouton de téléchargement. Vous recevrez un fichier ZIP contenant plusieurs fichiers CSV.

### Étape 4 : Extraire le fichier des occupations

Dans le ZIP téléchargé, cherchez le fichier nommé quelque chose comme :
- `occupations_fr.csv`
- `occupationsFr.csv`
- Ou similaire selon la version

### Étape 5 : Placer le fichier

Copiez ce fichier dans le dossier `backend/data/` et renommez-le :

```
backend/data/occupations_fr.csv
```

## Importer les données dans MongoDB

Une fois le fichier CSV en place, exécutez le script d'importation :

```bash
cd backend
node scripts/importESCOJobs.js
```

### Ce que fait le script

1. ✅ Se connecte à MongoDB
2. 📖 Lit le fichier CSV ESCO
3. 🔄 Parcourt chaque occupation
4. 🧮 Génère automatiquement les vecteurs de traits basés sur le titre et la description
5. 💾 Importe les métiers dans la collection `jobs`
6. 📊 Affiche un résumé de l'importation

### Format des données importées

Chaque métier ESCO contiendra :

```javascript
{
  title: "Fleuriste",              // Titre en français
  description: "...",               // Description du métier
  source: "ESCO",                   // Source des données
  escoUri: "http://...",            // URI unique ESCO
  escoCode: "1234",                 // Code ESCO
  iscoGroup: "5",                   // Groupe ISCO
  altLabels: ["..."],               // Titres alternatifs
  traitVector: {                    // Vecteur de traits généré
    creativity: 0.6,
    service: 0.9,
    design: 0.6,
    // ...
  },
  importedAt: Date
}
```

## Structure du fichier CSV ESCO

Le fichier CSV ESCO contient généralement ces colonnes :

| Colonne | Description |
|---------|-------------|
| `conceptUri` | URI unique de l'occupation |
| `conceptType` | Type (Occupation, Skill, etc.) |
| `preferredLabel` | Titre principal du métier |
| `altLabels` | Titres alternatifs (séparés par des retours à la ligne) |
| `description` | Description détaillée |
| `iscoGroup` | Code du groupe ISCO |
| `code` | Code ESCO |

## Génération des vecteurs de traits

Le script analyse automatiquement le titre et la description pour détecter des mots-clés et générer un vecteur de traits. Par exemple :

- "Fleuriste" → détecte `fleur` → traits: `creativity`, `service`, `design`
- "Paysagiste" → détecte `paysag` → traits: `creativity`, `design`, `independent`
- "Développeur logiciel" → détecte `develop`, `software` → traits: `technical`, `problem-solving`

### Traits disponibles

```javascript
[
  'analytical', 'creativity', 'leadership', 'teamwork', 'communication',
  'detail-oriented', 'problem-solving', 'adaptability', 'organizational',
  'technical', 'independent', 'service', 'design'
]
```

## Versions ESCO

| Version | Date de sortie | Notes |
|---------|----------------|-------|
| v1.2.0 | Mai 2024 | Version actuelle recommandée |
| v1.1.1 | 2022 | Ancienne version |
| v1.0.9 | Version par défaut de l'API | |

## Résolution de problèmes

### Le fichier CSV n'est pas trouvé

Vérifiez que :
- Le fichier est bien dans `backend/data/occupations_fr.csv`
- Le chemin est correct (pas de faute de frappe)
- Le fichier n'est pas encore dans un ZIP

### Erreur de parsing CSV

Si le fichier CSV a une structure différente, vous devrez peut-être modifier le script `importESCOJobs.js` pour adapter les noms de colonnes.

### Pas de métiers importés

Vérifiez les colonnes du CSV. Ouvrez le fichier avec Excel ou LibreOffice Calc pour voir la structure.

## Ressources

- [Portail ESCO](https://esco.ec.europa.eu/en)
- [Documentation de l'API ESCO](https://esco.ec.europa.eu/en/use-esco/use-esco-services-api)
- [Structure des datasets ESCO](https://esco.ec.europa.eu/en/structure-esco-downloadable-datasets)
- [ESCO v1.2.0 Release Notes](https://esco.ec.europa.eu/en/news/esco-v12-live)

## Prochaines étapes

Une fois les métiers ESCO importés :

1. ✅ Testez le matching avec les nouveaux métiers français
2. ✅ Améliorez les vecteurs de traits si nécessaire
3. ✅ Ajoutez des paramètres supplémentaires (secteur, employabilité)
4. ✅ Affinez la logique de recommandation

---

**Note** : ESCO est mis à jour régulièrement. Pensez à vérifier les nouvelles versions sur le portail ESCO.
