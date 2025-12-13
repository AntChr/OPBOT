# 🎓 Career Orientation App

Application d'orientation professionnelle avec quiz intelligent et base de données de métiers enrichie par IA.

**Status:** ✅ Production Ready (v2.0)

---

## 🚀 Quick Start

### Prérequis
- **Node.js** >= 14.0
- **MongoDB** (local ou Atlas)

### Installation & Lancement

```bash
# 1. Cloner/Ouvrir le projet
cd career-orientation-app

# 2. Frontend (Vite)
cd frontend
npm install
npm run dev          # http://localhost:5173

# 3. Backend (Express) - Terminal séparé
cd ../backend
npm install
npm run dev          # http://localhost:5000

# 4. Database
# Configurer MONGO_URI dans backend/.env
```

### Configuration

**backend/.env:**
```env
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/career-db
PORT=5000
ANTHROPIC_API_KEY=sk-ant-...
```

**frontend/.env.local:**
```env
VITE_API_URL=http://localhost:5000
```

---

## 📖 Documentation

- **[frontend/README.md](frontend/README.md)** - Tout sur le frontend React
- **[backend/README.md](backend/README.md)** - Tout sur le backend Express

---

## 🎯 Fonctionnalités

- ✅ Quiz RIASEC pour orientation
- ✅ 1,584 métiers ROME en base
- ✅ Enrichissement intelligent par IA (Claude)
- ✅ Interface admin avancée
- ✅ 7 sources web intégrées
- ✅ Filtrage/recherche métiers

---

## 📊 Architecture

```
Frontend (React)     Backend (Express)     Database (MongoDB)
    |----API calls------|
                |--------Queries---------|
```

Voir docs pour détails complets.

---

## 🔧 Commandes Utiles

### Frontend
```bash
cd frontend
npm run dev          # Dev server
npm run build        # Build production
npm run lint         # Vérifier code
```

### Backend
```bash
cd backend
npm run dev          # Dev server
npm run enrich:sample    # Enrichir 10 métiers
npm run enrich:force     # Forcer re-enrichissement
```

---

## 🆘 Aide

**Problème?** Vérifier:
1. MongoDB connecté: `mongo "mongodb+srv://..."`
2. Ports libres: 3000/5000/5173
3. Variables d'env configurées
4. Lire frontend/README.md et backend/README.md

---

**Version:** 2.0 | **Date:** 9 nov 2025 | **Status:** ✅ Production Ready
