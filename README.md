<p align="center">
  <img src="https://img.shields.io/badge/discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="discord.js v14"/>
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/License-ISC-blue?style=for-the-badge" alt="License"/>
</p>

<h1 align="center">🤖 Discord Bot</h1>

<p align="center">
  <b>Bot Discord modulaire et évolutif — économie, casino, gestion Minecraft et modération.</b><br/>
  <sub>Conçu pour les communautés RP et gaming, avec intégration Pterodactyl et API de monitoring.</sub>
</p>

---

## 🧭 Sommaire

- [Présentation](#-présentation)
- [Fonctionnalités](#-fonctionnalités)
- [Architecture du projet](#-architecture-du-projet)
- [Prérequis](#-prérequis)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Commandes disponibles](#-commandes-disponibles)
- [API de monitoring](#-api-de-monitoring)
- [Contribuer](#-contribuer)

---

## 📋 Présentation

Ce bot Discord est pensé comme une **toolbox communautaire** : il gère un système d'économie complet avec boutique et inventaire, un casino avec système de caisses animées, un panneau de contrôle pour serveur Minecraft via Pterodactyl, ainsi qu'un système de modération par "Goulag" et un mini escape-game par codes.

Le tout est accompagné d'une **API REST intégrée** qui expose les logs et les inventaires pour une intégration directe avec Grafana ou tout autre outil de monitoring.

---

## ✨ Fonctionnalités

### 💰 Économie

Système de monnaie virtuelle complet basé sur l'activité des membres. L'argent est gagné de trois façons : en envoyant des messages dans les salons textuels, en participant à des salons vocaux (gain par minute), et via une récompense journalière (`/daily`). Les gains sont configurables par le serveur (min/max). Un système de rôles d'éligibilité permet de restreindre l'accès à l'économie, et des rôles "éconoadmin" offrent des permissions de gestion avancée.

### 🏪 Boutique & Inventaire

Les éconoadmins configurent des articles avec des prix personnalisés. Les membres peuvent acheter et vendre des objets via un menu interactif paginé avec sélection de quantité (1, 5, 10, 20 ou max). Chaque joueur dispose d'un inventaire consultable, et la commande `/sell-all` permet de liquider tout son inventaire d'un coup. Un dashboard classement affiche les joueurs triés par richesse.

### 🎰 Casino — Système de caisses

Le casino propose des caisses payantes avec une animation GIF d'ouverture et un tirage aléatoire pondéré. Les lots peuvent être des objets d'inventaire ou de l'argent, avec des quantités fixes ou aléatoires (plage min/max). Chaque lot a sa propre image et sa probabilité configurable.

### ⛏️ Minecraft — Intégration Pterodactyl

Le bot se connecte à un panel Pterodactyl pour démarrer et contrôler un serveur Minecraft directement depuis Discord. Un panneau de contrôle interactif avec boutons affiche le statut en temps réel. Une boutique Minecraft dédiée permet aux joueurs d'acheter des cosmétiques en jeu avec leur monnaie Discord : le bot envoie la commande au serveur Minecraft via RCON. Un système de répartition des revenus distribue automatiquement les gains entre les comptes configurés.

### 🔒 Modération — Goulag

Le système de Goulag permet aux administrateurs d'isoler un membre en lui retirant tous ses rôles et en lui attribuant un rôle restrictif. Le bot détecte automatiquement si un membre banni tente de rejoindre à nouveau le serveur et lui réapplique le rôle Goulag. Toutes les actions sont loguées dans un salon admin dédié.

### 🧩 Escape Game par codes

Un mini système d'escape game intégré : les administrateurs configurent des codes secrets associés à des salons et des rôles. Les membres utilisent `/code` dans le bon salon pour débloquer un rôle. Idéal pour des événements communautaires ou des systèmes de progression.

### 📊 API REST & Monitoring

Un serveur Express intégré expose plusieurs endpoints pour le monitoring externe. Les logs de l'économie (daily, messages, vocal) sont sauvegardés en JSONL et accessibles via API avec filtrage par type d'événement et pagination. Un endpoint dédié Grafana fournit les données dans un format directement exploitable. Les inventaires et balances sont également disponibles via API avec filtrage par serveur et par joueur.

---

## 📁 Architecture du projet

```
Discord-Bot/
├── index.js                 # Point d'entrée — charge commandes, events et boutons
├── deploy-commands.js       # Enregistrement des slash commands auprès de Discord
├── package.json
│
├── commands/
│   ├── casino/              # /caisse, /setup-caisseprice
│   ├── economy/             # /daily, /boutique, /dashboard, /inventaire, /sell-all, setup-*
│   ├── minecraft/           # /start-minecraft, /minecraft-panel, /boutique-minecraft, setup-*
│   ├── rmz/                 # /code, /goulag, /list-codes, /permsadmin, setup-*
│   └── utils/               # /help, /ping
│
├── events/
│   ├── ready.js             # Confirmation de connexion
│   ├── messageCreate.js     # Gain d'argent par message
│   ├── voiceActivity.js     # Gain d'argent par activité vocale
│   └── guildMemberAdd.js    # Réapplication auto du Goulag
│
├── buttons/
│   └── minecraftControl.js  # Boutons interactifs du panneau Minecraft
│
├── utils/
│   ├── economy.js           # Helpers économie (load/save JSON, éligibilité, etc.)
│   ├── logger.js            # Logger + serveur API Express intégré
│   ├── minecraftPanel.js    # Génération de l'embed du panneau Minecraft
│   ├── minecraftShop.js     # Envoi de cosmétiques via RCON
│   └── pteroStatus.js       # Récupération du statut Pterodactyl
│
├── data/                    # Données persistantes (JSON)
│   ├── economy/             # balances, config, boutique, logs, econoadmins
│   ├── casino/              # config des caisses
│   ├── minecraft/           # boutique et répartition Minecraft
│   ├── codes.json           # Codes escape game
│   ├── bannedUsers.json     # Liste des membres au Goulag
│   └── adminConfig.json     # Rôles admin, salons de log, rôle Goulag
│
└── src/                     # Assets (images des lots casino, GIF d'animation)
```

---

## 📦 Prérequis

- **Node.js** 18 ou supérieur
- Un **bot Discord** créé sur le [portail développeurs Discord](https://discord.com/developers/applications) avec les intents `Guilds`, `GuildMessages`, `MessageContent`, `GuildVoiceStates` et `GuildMembers` activés
- *(Optionnel)* Un panel **Pterodactyl** pour les fonctionnalités Minecraft
- *(Optionnel)* **Grafana** avec le plugin JSON Datasource pour le monitoring

---

## 🚀 Installation

```bash
# Cloner le dépôt
git clone https://github.com/Emilca1/Discord-Bot.git
cd Discord-Bot

# Installer les dépendances
npm install

# Configurer le bot (voir section suivante)
cp config.example.json config.json

# Enregistrer les slash commands
node deploy-commands.js

# Lancer le bot
node index.js
```

---

## ⚙️ Configuration

Créer un fichier `config.json` à la racine du projet :

```json
{
  "token": "VOTRE_TOKEN_DISCORD",
  "clientId": "VOTRE_CLIENT_ID",
  "guildId": "VOTRE_GUILD_ID",
  "roles": {
    "minecraftAdmin": "ID_DU_ROLE_ADMIN_MINECRAFT"
  },
  "pterodactyl": {
    "panelUrl": "https://panel.example.com",
    "apiKey": "VOTRE_CLE_API_PTERODACTYL",
    "serverId": "ID_DU_SERVEUR"
  }
}
```

> ⚠️ Ne commitez jamais votre `config.json` — il est déjà dans le `.gitignore`.

---

## 📝 Commandes disponibles

| Catégorie       | Commande              | Description                                               |
| --------------- | --------------------- | --------------------------------------------------------- |
| **Économie**    | `/daily`              | Réclamer sa récompense journalière                        |
|                 | `/boutique`           | Parcourir, acheter et vendre des articles                 |
|                 | `/inventaire`         | Consulter son inventaire et son solde                     |
|                 | `/sell-all`           | Vendre tout son inventaire                                |
|                 | `/dashboard`          | Classement des joueurs par richesse                       |
| **Casino**      | `/caisse`             | Ouvrir une caisse (animation + tirage)                    |
| **Minecraft**   | `/start-minecraft`    | Démarrer le serveur Minecraft                             |
|                 | `/minecraft-panel`    | Panneau de contrôle interactif                            |
|                 | `/boutique-minecraft` | Acheter des cosmétiques en jeu                            |
| **Modération**  | `/goulag`             | Envoyer / libérer un membre du Goulag                     |
|                 | `/code`               | Entrer un code escape game                                |
|                 | `/permsadmin`         | Gérer les rôles administrateurs                           |
| **Utilitaires** | `/help`               | Liste de toutes les commandes                             |
|                 | `/ping`               | Vérifier la latence du bot                                |
| **Setup**       | `/setup-*`            | Commandes de configuration (boutique, daily, vocal, etc.) |

---

## 📡 API de monitoring

Le bot embarque un serveur Express (port `22228` par défaut) qui expose les endpoints suivants :

| Endpoint                          | Description                                                      |
| --------------------------------- | ---------------------------------------------------------------- |
| `GET /logs`                       | Logs avec filtrage par `?event=daily\|mess\|voc` et `?limit=N`   |
| `GET /logs/grafana`               | Format optimisé pour Grafana JSON Datasource                     |
| `GET /logs/download`              | Télécharger le fichier de logs complet (JSONL)                   |
| `GET /inventaires`                | Balances et inventaires, avec filtrage `?guildId=` et `?userId=` |
| `GET /inventaires?format=grafana` | Format tabulaire pour Grafana                                    |

---

<p align="center">
  <sub>Fait avec ❤️ par <a href="https://github.com/Emilca1">Emilca1</a></sub>
</p>
