# 🎵 Ontologie Musicale - Frontend

Une application React TypeScript moderne pour explorer et gérer l'ontologie des instruments de musique.

## ✨ Fonctionnalités

### 🏠 **Dashboard**
- Vue d'ensemble des statistiques du système
- Recherche rapide avec auto-complétion
- Vérification de l'état du système (API + Base de données)
- Accès rapide aux fonctionnalités principales

### 🔍 **Recherche Avancée**
- **Recherche globale** : Recherche textuelle dans toute l'ontologie
- **Recherche géographique** : Localisation par coordonnées et rayon
- **Analyse de similarité** : Trouver des entités similaires
- **Patterns culturels** : Analyse des tendances culturelles
- **Centralité** : Analyse des entités les plus connectées

### 🎼 **Gestion des Instruments**
- Interface CRUD complète pour les instruments
- Filtrage par famille d'instrument
- Recherche textuelle avec pagination
- Formulaires de création/modification avec validation
- Vue détaillée des instruments

### 🎨 **Interface Utilisateur**
- Design Material-UI moderne et responsive
- Navigation latérale avec icônes expressives
- Thème cohérent avec couleurs personnalisées
- Composants réutilisables et bien documentés

## 🚀 Installation et Démarrage

### Prérequis
- Node.js 16+ 
- npm ou yarn
- Backend API en cours d'exécution sur http://localhost:3001

### Installation
```bash
cd frontend
npm install
```

### Configuration
Créez un fichier `.env` (déjà inclus) :
```bash
REACT_APP_API_URL=http://localhost:3001
REACT_APP_NAME=Ontologie Musicale
REACT_APP_VERSION=1.0.0
```

### Démarrage
```bash
npm start
```

L'application sera disponible sur http://localhost:3000

## 📁 Structure du Projet

```
src/
├── components/          # Composants réutilisables
│   ├── Common/         # Composants génériques
│   │   ├── LoadingSpinner.tsx
│   │   ├── ErrorMessage.tsx
│   │   └── SearchBar.tsx
│   └── Layout/         # Composants de mise en page
│       └── AppLayout.tsx
├── pages/              # Pages principales
│   ├── Dashboard/      # Tableau de bord
│   ├── Search/         # Recherche avancée
│   └── Instruments/    # Gestion des instruments
├── services/           # Services API
│   └── api.ts          # Client API avec tous les endpoints
├── theme/              # Configuration du thème
│   └── theme.ts        # Thème Material-UI personnalisé
└── App.tsx             # Composant racine avec routage
```

## 🔧 Technologies Utilisées

### Core
- **React 18** avec TypeScript
- **React Router** pour la navigation
- **Material-UI (MUI)** pour l'interface utilisateur

### API & État
- **Axios** pour les requêtes HTTP
- **React Hooks** pour la gestion d'état locale

### Développement
- **TypeScript** pour la sécurité des types
- **ESLint** pour la qualité du code
- **Create React App** pour la configuration

## 🎨 Design System

### Palette de Couleurs
- **Primary** : Bleu (#1976d2) - Navigation et actions principales
- **Secondary** : Rouge (#dc004e) - Accents et boutons secondaires
- **Success** : Vert (#2e7d32) - Messages de succès
- **Warning** : Orange (#ed6c02) - Avertissements
- **Error** : Rouge (#d32f2f) - Erreurs

### Composants Stylisés
- **Cards** : Bordures arrondies avec ombres douces
- **Buttons** : Pas de transformation en majuscules, coins arrondis
- **Navigation** : États actifs visuellement distincts
- **Forms** : Validation en temps réel avec messages d'erreur

## 📡 Intégration API

### Service API Complet
Le fichier `services/api.ts` fournit :
- **Client Axios configuré** avec intercepteurs
- **Types TypeScript** pour toutes les entités
- **Services génériques** pour CRUD operations
- **Services spécialisés** pour chaque type d'entité
- **Gestion d'erreur** centralisée

### Endpoints Couverts
- ✅ **Instruments** - CRUD complet + recherche
- ✅ **Familles** - Gestion des familles d'instruments
- ✅ **Groupes Ethniques** - Traditions musicales
- ✅ **Localités** - Géolocalisation
- ✅ **Relations** - Liens sémantiques
- ✅ **Recherche** - Tous types de recherche avancée

## 🔮 Pages Implémentées

### ✅ Complètement Implémentées
1. **Dashboard** - Vue d'ensemble avec statistiques et recherche
2. **Recherche** - 5 types de recherche avancée
3. **Instruments** - CRUD complet avec filtres

### 📋 Pages Placeholder
Les autres pages (Familles, Groupes Ethniques, etc.) affichent des messages informatifs. Elles peuvent être facilement développées en suivant le modèle de la page Instruments.

## 🌟 Fonctionnalités Avancées

### Recherche Intelligente
- **Auto-complétion** en temps réel
- **Recherche multi-entités** simultanée
- **Filtrage dynamique** par critères
- **Géolocalisation** avec cartes

### Interface Responsive
- **Mobile-first** design
- **Navigation adaptive** (drawer mobile/sidebar desktop)
- **Grilles flexibles** pour tous les écrans
- **Composants optimisés** pour le tactile

### Performance
- **Lazy loading** des composants
- **Pagination** intelligente
- **Cache local** pour les recherches fréquentes
- **Optimisation** des re-rendus React

## 🚧 Développement Futur

### Améliorations Prioritaires
1. **Tests unitaires** avec Jest et React Testing Library
2. **Internationalisation** (i18n) multilingue
3. **Mode sombre** avec switch utilisateur
4. **Visualisation graphique** des relations (D3.js)
5. **Export/Import** de données (CSV, JSON)

### Nouvelles Fonctionnalités
1. **Cartes interactives** pour la géolocalisation
2. **Audio intégré** pour les échantillons sonores
3. **Annotations collaboratives** sur les instruments
4. **Recommandations ML** basées sur l'utilisation
5. **API GraphQL** pour optimiser les requêtes

## 🤝 Contribution

### Standards de Code
- **TypeScript strict** activé
- **Commentaires JSDoc** pour tous les composants
- **Props interfaces** bien définies
- **Error boundaries** pour la gestion d'erreurs
- **Accessibility** (ARIA) considérée

### Architecture
- **Composants fonctionnels** avec Hooks
- **Séparation des responsabilités** claire
- **Services réutilisables** pour l'API
- **Thème centralisé** et configurable

---

🎵 **Une interface moderne pour explorer la richesse musicale mondiale** 🌍