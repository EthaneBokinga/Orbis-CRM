# 🌐 ORBIS CRM — Force de Vente & Gestion Commerciale

**Orbis CRM** est une solution de gestion de la relation client (CRM) mobile-first, conçue pour les PME africaines. Elle permet de gérer les contacts, les deals (affaires), le pipeline de vente, les performances des agents, la messagerie interne, les notifications temps réel et les rappels automatiques.

> **Stack** : React 18 + Tailwind CSS (Frontend) · Node.js + Express + MongoDB (Backend) · Socket.io (Temps réel)

---

## 📸 Aperçu

| Dashboard Admin | Dashboard Commercial | Messagerie |
|----------------|-------------------|------------|
| Stats globales, objectifs, Top 5 agents, export CSV/PDF | Pipeline deals, activités, notifications | Chat temps réel, statut en ligne |

---

## 🚀 Démarrage Rapide

### 1. Prérequis

- **Node.js** ≥ v18
- **npm** ≥ v9
- Un compte **MongoDB Atlas** (gratuit) — [Créer ici](https://www.mongodb.com/atlas)
- Un compte **Google Cloud Console** (pour OAuth) — optionnel
- Un service **SMTP** (pour les emails) — optionnel

### 2. Installation

```bash
# Cloner le dépôt
git clone <votre-repo>
cd orbis-crm

# Installer les dépendances BACKEND
cd orbis-backend
npm install

# Installer les dépendances FRONTEND
cd ../orbis-frontend
npm install
```

### 3. Configuration des variables d'environnement

Créez un fichier `.env` dans `orbis-backend/` :

```env
# === Base de données ===
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.xxxxx.mongodb.net/orbis-crm?retryWrites=true&w=majority

# === JWT (jetons d'authentification) ===
JWT_ACCESS_SECRET=une_chaine_aleatoire_tres_longue_au_moins_32_caracteres
JWT_REFRESH_SECRET=une_autre_chaine_aleatoire_tres_longue_au_moins_32_caracteres

# === Google OAuth 2.0 (optionnel — pour connexion "Se connecter avec Google") ===
GOOGLE_CLIENT_ID=votre_client_id_google.apps.googleusercontent.com

# === SMTP (optionnel — pour les emails : mot de passe oublié, bienvenue) ===
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre.email@gmail.com
SMTP_PASS=votre_mot_de_passe_application
SMTP_FROM=noreply@orbis-crm.com

# === URLs ===
CLIENT_URL=https://orbis-crm-five.vercel.app
FRONTEND_URL=https://orbis-crm-five.vercel.app

# === Port (optionnel, défaut: 5000) ===
PORT=5000
```

> **SMTP Gmail** : Utilisez un **mot de passe d'application** (Paramètres Google → Sécurité → Mots de passe d'application). Activez l'authentification à 2 facteurs sur votre compte Gmail.

### 4. Lancer l'application

```bash
# Terminal 1 — Backend
cd orbis-backend
npm run dev    # ou : npm start

# Terminal 2 — Frontend
cd orbis-frontend
npm run dev
```

Le backend tourne sur **http://localhost:5000** (ou le port défini dans `.env`).  
Le frontend tourne sur **http://localhost:5173**.

### 5. Comptes administrateurs pré-définis

Au démarrage, le serveur crée automatiquement deux administrateurs si absents :

| Nom | Email | Mot de passe |
|-----|-------|-------------|
| Ethan Bokinga (Admin) | ethanebokinga00@gmail.com | NTHBG1234@ |
| Soise Gallouo (Admin) | soisegallouo@gmail.com | NTHBG1234@ |

> **En production**, changez ces mots de passe immédiatement.

---

## 🧪 Tester l'application

### Backend

```bash
curl http://localhost:5000/health
# → { "status": "API Orbis En Ligne", "timestamp": "2026-..." }
```

### Frontend

Ouvrez **http://localhost:5173** dans votre navigateur.  
Cliquez sur **"Mot de passe oublié"** sur la page de connexion pour tester le flux de réinitialisation.

> **En développement** : Le code de réinitialisation est automatiquement renseigné pour éviter l'envoi SMTP.
> **En production** : Le code est uniquement envoyé par email — aucune fuite via l'API.

---

## 🏗️ Architecture du Projet

```
orbis-crm/
├── orbis-backend/          ← API REST (Express + MongoDB)
│   ├── config/             # Connexion MongoDB
│   ├── controllers/        # Logique métier (auth, admin, crm, notifications)
│   ├── middleware/          # Auth JWT, validation
│   ├── models/             # Schémas Mongoose (11 collections)
│   ├── routes/             # Définition des routes API
│   ├── server.js           # Point d'entrée (Express + Socket.io)
│   └── node_modules/
│
├── orbis-frontend/         ← Application React (Vite + Tailwind)
│   ├── src/
│   │   ├── components/     # Composants réutilisables
│   │   ├── context/        # ThemeContext (dark/light)
│   │   ├── pages/          # Pages (AdminDashboard, CommercialDashboard, AuthPage)
│   │   ├── screens/        # Login, Register
│   │   └── main.jsx        # Point d'entrée React
│   ├── public/             # Manifest PWA
│   └── vite.config.js
│
├── README.md               ← Ce fichier
└── .gitignore
```

### 📦 Modèles de données (Backend — 11 collections)

| Modèle | Description |
|--------|------------|
| `User` | Utilisateurs (admin, commercial, marketing, rh, autre) |
| `Contact` | Contacts CRM (prospects/clients) |
| `Deal` | Affaires en pipeline (étapes : découverte → gagné/perdu) |
| `Interaction` | Interactions avec les contacts (appels, emails, réunions) |
| `Activity` | Activités & timeline des deals |
| `Message` | Messagerie interne entre agents |
| `Notification` | Notifications stockées en base |
| `Reminder` | Rappels automatiques |
| `Settings` | Objectifs (hebdo/mensuel/annuel) — singleton |
| `GoalHistory` | Historique des changements d'objectifs |
| `AuditLog` | Journal d'audit (traçabilité admin) |

---

## 🛠️ Stack Technique

### Frontend
| Technologie | Version | Rôle |
|------------|---------|------|
| React | 18 | UI Components |
| Vite | 5 | Bundler / Build |
| Tailwind CSS | 3 | Styles utilitaires |
| React Router | 7 | Routing SPA |
| Socket.io Client | 4 | Temps réel (chat + notifications) |
| Lucide React | 0.368 | Icônes |
| Axios | 1.6 | HTTP client (fallback) |
| Vite PWA Plugin | 0.19 | Application mobile installable |

### Backend
| Technologie | Version | Rôle |
|------------|---------|------|
| Node.js | ≥18 | Runtime |
| Express | 4 | Framework HTTP |
| MongoDB (Mongoose) | 8 | Base de données NoSQL |
| Socket.io | 4 | WebSocket temps réel |
| JWT (jsonwebtoken) | 9 | Authentification |
| bcryptjs | 2 | Hash des mots de passe |
| Nodemailer | 9 | Envoi d'emails |
| Google Auth Library | 11 | OAuth Google |
| Helmet | 7 | Sécurité HTTP |
| Cookie-Parser | 1.4 | Parsing cookies |

---

## 🔌 API Endpoints

### Authentification (`/api/auth`)
| Méthode | Route | Description |
|---------|-------|------------|
| POST | `/register` | Inscription |
| POST | `/login` | Connexion |
| POST | `/google` | Connexion Google OAuth |
| POST | `/refresh` | Rafraîchir le token |
| POST | `/logout` | Déconnexion |
| POST | `/forgot-password` | Demander code de réinitialisation (5 min) |
| POST | `/reset-password` | Réinitialiser le mot de passe |
| GET | `/profile` | Profil utilisateur (authentifié) |
| PUT | `/profile` | Mettre à jour le profil |

### CRM (`/api/crm`)
| Méthode | Route | Description |
|---------|-------|------------|
| GET | `/deals` | Liste des deals de l'utilisateur |
| POST | `/deals` | Créer un deal |
| PUT | `/deals/:id` | Modifier un deal |
| DELETE | `/deals/:id` | Supprimer un deal |
| GET | `/contacts` | Liste des contacts |
| POST | `/contacts` | Créer un contact |
| GET | `/deals/:id/activities` | Timeline d'un deal |
| POST | `/activities` | Ajouter une activité |
| GET | `/dashboard` | Résumé tableau de bord commercial |
| GET | `/performances` | Performances de l'utilisateur |

### Administration (`/api/admin`) — réservé admin
| Méthode | Route | Description |
|---------|-------|------------|
| GET | `/stats` | Statistiques globales |
| GET | `/commercials` | Liste des agents |
| GET | `/deals/global` | Tous les deals |
| POST | `/deals` | Créer un deal (admin) |
| PUT | `/deals/:id/reassign` | Réassigner un deal |
| DELETE | `/deals/:id` | Supprimer un deal |
| POST | `/users` | Créer un utilisateur + email de bienvenue |
| PUT | `/users/:id/toggle-status` | Activer/désactiver un compte |
| PUT | `/users/:id/role` | Changer le rôle d'un agent |
| GET | `/logs` | Journal d'audit |
| GET | `/settings` | Objectifs actuels |
| PUT | `/settings/goal` | Modifier les objectifs |
| GET | `/deals/stats` | Statistiques des deals par agent |
| GET | `/performances/top` | Top 5 des meilleurs agents |
| GET | `/performances/late-followups` | Relances en retard |
| GET | `/goals/history` | Historique des objectifs |

### Notifications (`/api/notifications`)
| Méthode | Route | Description |
|---------|-------|------------|
| GET | `/` | Notifications de l'utilisateur |
| PUT | `/read/:id` | Marquer comme lue |
| PUT | `/read-all` | Tout marquer comme lu |
| GET | `/unread/count` | Nombre de notifications non lues |

### Messagerie (`/api/messages`)
| Méthode | Route | Description |
|---------|-------|------------|
| GET | `/conversations` | Liste des conversations |
| GET | `/:userId` | Messages avec un utilisateur |
| POST | `/` | Envoyer un message |
| GET | `/unread/count` | Nombre de messages non lus |
| PUT | `/read/:senderId` | Marquer comme lu |

---

## ✅ Fonctionnalités Clés

- **🔐 Authentification sécurisée** : JWT (access + refresh token), httpOnly cookies, Google OAuth
- **📱 Application mobile** : PWA installable (hors-ligne partiel)
- **🌓 Thème Dark/Light** : Bascule en temps réel
- **🔔 Notifications temps réel** : Socket.io (nouveaux messages, changements de rôle, objectifs)
- **💬 Messagerie interne** : Chat entre agents avec indicateur de frappe et statut en ligne
- **📊 Dashboard Admin** : KPIs, objectifs, Top 5 agents, graphiques, export CSV/PDF
- **📈 Dashboard Commercial** : Pipeline deals (drag & drop virtuel), timeline, performances
- **📥 Export** : CSV (Excel) — Deals, Équipe, Performances | PDF — Rapport direction imprimable
- **🔒 Journal d'audit** : Toutes les actions admin tracées (qui, quoi, quand)
- **📧 Emails automatiques** : Bienvenue aux nouveaux agents, réinitialisation mot de passe
- **⏰ Rappels** : Relances automatiques programmées
- **🎯 Objectifs** : Suivi hebdo/mensuel/annuel avec barres de progression

---

## 🔐 Sécurité

- Mots de passe hashés avec **bcrypt** (salt rounds: 12)
- Tokens JWT avec **httpOnly cookies** (pas accessibles en JS)
- **Refresh token rotation** : invalidation après chaque usage
- **CORS** restreint aux origines autorisées
- **Helmet** : protection des en-têtes HTTP
- **Rate limiting** implicite via les timeouts serveur
- **Code de réinitialisation** : 6 chiffres, valable **5 minutes**, non réutilisable
- **Pas de dénombrement d'emails** : message générique "Si cet email existe..."
- **Journal d'audit** complet pour toutes les actions sensibles

---

## 🌍 Déploiement

### Frontend → Vercel
```bash
cd orbis-frontend
npx vercel --prod
```
Variables d'environnement à configurer sur Vercel :
- `VITE_API_URL` → URL du backend (ex: `https://orbis-api.onrender.com/api`)

### Backend → Render
```bash
# Poussez sur GitHub, puis depuis Render :
# → New Web Service
# → Build Command : npm install
# → Start Command : npm start
```
Variables d'environnement à configurer sur Render :
- Toutes celles du `.env` ci-dessus
- `NODE_ENV=production`
- `PORT` automatiquement défini par Render

---

## 📄 Licence

Projet privé — Orbis CRM.

---

## 👨‍💻 Auteur

Développé par **Ethan Bokinga & Soise Gallouo**.
