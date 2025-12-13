# 🎨 Frontend - React + Vite

Interface utilisateur pour quiz d'orientation et gestion admin des métiers.

---

## 📁 Structure

```
src/
├── components/
│   ├── AdminPanel.jsx           # Panel admin principal
│   ├── Admin/
│   │   └── JobsList.jsx         # NEW - Gestion métiers
│   ├── Chat/
│   │   ├── ChatInterface.jsx    # Quiz interface
│   │   ├── MessageList.jsx
│   │   ├── MessageInput.jsx
│   │   └── [autres composants]
│   ├── Auth.jsx                 # Login/Register
│   └── Navbar.jsx               # Navigation
├── App.jsx                      # Entry point
└── main.jsx                     # Vite entry
```

---

## 🚀 Lancement

```bash
npm install
npm run dev                    # Dev server (Vite)
npm run build                 # Build production
npm run preview               # Preview build
npm run lint                  # ESLint check
```

---

## 🎯 Pages Principales

### 1. 🔑 **Login/Register**
Authentification utilisateur

### 2. ❓ **Quiz**
Interface conversationnelle avec questions d'orientation

### 3. 📊 **Admin Panel**
5 onglets:
- **📊 Gestion des Métiers** (NEW) - Tableau avec filtres
- **➕ Ajouter Métier** - Formulaire
- **❓ Ajouter Question** - Formulaire
- **📋 Récapitulatif** - Vue d'ensemble
- **👥 Utilisateurs** - Admin only

---

## 🧩 JobsList Component (NEW)

Nouveau composant pour admin.

**Features:**
- Tableau 1,584 métiers ROME
- Stats temps réel (4 cartes)
- Filtres avancés (6 critères)
- Recherche live
- Détails complets
- Enrichissement 1-clic

**Fichier:** `components/Admin/JobsList.jsx`

---

## 🔌 API Integration

**Base URL:** `VITE_API_URL` (défaut: http://localhost:5000)

---

## 🎨 Styling

**Tailwind CSS** + **Bootstrap** (legacy)

---

## 📦 Dépendances

- react ^19.0.0
- axios ^1.4.0
- tailwindcss ^3.0.0
- vite ^4.0.0

---

**Version:** 2.0 | Production Ready ✅
