# FootBoxd

App type « Letterboxd du sport » : noter/reviewer des matchs de foot, suivre des amis, commenter leurs reviews, suivre les scores en direct.

Détails d'architecture, décisions et historique des bugs : [architecture.md](./architecture.md). Description écran par écran pour le design : [front.md](./front.md) (⚠️ écrit avant l'intégration du design system, en partie périmé).

## Ce que fait l'appli aujourd'hui

### Matchs et ligues
- **Toutes les ligues de football** (~350 ligues, données [TheSportsDB](https://www.thesportsdb.com/) plan Premium), synchronisées par un worker — aucun client n'appelle l'API sportive directement.
- **Accueil** : sélecteur de date sur 7 jours (2 jours passés, aujourd'hui, 4 jours à venir), avec des flèches pour faire glisser la fenêtre d'un jour, sans limite dans les deux sens. Les ligues qui ont un match ce jour-là sont listées, **tes favoris en premier**, avec un badge rouge du nombre de matchs en direct.
- **Page d'une ligue** : ses matchs du jour choisi, score ou heure de coup d'envoi, statut.
- **Toutes les ligues** : recherche par nom/pays, ajout/retrait de favoris (★).
- **Minute en direct** (`45'`, `90+2'`) pour les matchs en cours.
- **7 statuts de match** : à venir, en direct, terminé, reporté, annulé, suspendu, abandonné — toujours écrits en toutes lettres.
- **Masquer les scores** (réglage) : les scores restent cachés derrière un clic « Afficher le score » (accueil, ligue, page de match).

### Page d'un match
- En-tête : écussons, score, statut, minute, stade, date/heure (dans ton fuseau), lien vers les highlights YouTube si disponible.
- **Faits de match** : timeline des buts, cartons et remplacements (mise à jour toutes les 2 min pour les matchs en direct ou terminés depuis moins de 3 h).
- **Compositions** : les 11 titulaires quand l'API les fournit (jamais le banc ni la formation), sinon un état vide explicite.
- **Histogramme des notes** : moyenne + répartition en 5 barres.
- **Log d'un match** : note sur 5 (demi-étoiles) + commentaire optionnel, une seule review par utilisateur et par match.
- **Reviews** : like, fil de commentaires dépliable, modification et suppression de sa propre review ; ta review est mise en avant (« Ta note »).

### Social
- **Inscription** avec un **pseudo unique** (`@handle`, 3-20 caractères : minuscules, chiffres, `_`) en plus d'un nom affiché libre. Connexion email/mot de passe ; Google et Apple sont câblés côté API (nécessitent des identifiants réels).
- **Recherche d'utilisateurs** par pseudo ou nom affiché.
- **Profils publics** (`/profile/:id`) : stats (followers, suivis, matchs notés, vus cette saison), 4 matchs préférés de la saison, 4 derniers matchs loggés. Nom/avatar cliquable depuis les reviews, commentaires et notifications.
- **Follow / unfollow** instantané (pas de demande).
- **Sidebar de l'accueil** : *Reviews populaires* et *Matchs populaires* (fenêtre de 48 h ; review = likes + commentaires × 2 ; match = nombre de reviews), *Reviews de mes amis*.
- **Notifications** : commentaire, like, nouveau follower (avec bouton « Suivre » en retour), « Tout marquer comme lu ».

### Compte
- **Onboarding** en 3 étapes après inscription : ligues à suivre, club de cœur + réglages, confirmation.
- **Club de cœur** : une équipe favorite, modifiable dans les réglages.
- **Réglages** (`/settings`) : club de cœur + 5 interrupteurs (j'aime, réponses, nouveaux abonnés, rappel de coup d'envoi, masquer les scores). ⚠️ Seul « masquer les scores » a un effet réel pour l'instant ; les autres sont enregistrés mais pas encore appliqués.

### Design
Design system complet intégré (`apps/web/src/styles/tokens.css`, polices Archivo + Martian Mono, composants dans `apps/web/src/components/ui/`). Navigation à 2 liens (Accueil, Recherche) + cloche de notifications + avatar.

### Limites connues
- **Pas de temps réel** : le worker publie les scores sur Redis, mais aucun WebSocket ni polling côté client — il faut recharger la page pour voir un score évoluer.
- **Pas d'upload d'avatar** : avatars Dicebear fixes.
- **Recherche de match** non développée (seule la recherche d'utilisateurs l'est).
- Pas de modération/signalement, pas de suite de tests.

## Prérequis

- Docker + Docker Compose
- Une clé API TheSportsDB (plan Premium)

## Lancer en local

1. Copier `.env.example` en `.env` et renseigner au minimum `SPORTS_API_KEY` et `JWT_SECRET`.
2. Lancer toute la stack :

```bash
docker compose up -d --build
```

Ça démarre 5 services : Postgres, Redis, l'API NestJS, le worker de polling, le frontend Next.js.

- **Frontend** : http://localhost:3010
- **API** : http://localhost:3000

Si ces ports sont pris, édite `docker-compose.yml` (`ports` de `web`/`api`) et adapte `WEB_URL` dans `.env` (CORS + redirections OAuth).

### Comptes de test

| Email | Mot de passe | Pseudo |
|---|---|---|
| `alice@test.com` | `password123` | `alice_7f379a` |
| `bob@test.com` | `password123` | `bob_c07e0b` |

Les deux suivent les 7 ligues principales (5 grands championnats + Ligue des Champions + Europa League).

## Développement au quotidien

`docker-compose.override.yml` (chargé automatiquement) monte le code en volume et lance chaque service en mode watch :

```bash
docker compose up -d
```

Le hot-reload ne détecte pas toujours les changements à travers le montage Docker sur macOS, surtout pour un **fichier nouvellement créé** :

```bash
docker compose restart api web worker
```

### Quand un rebuild ou une régénération est nécessaire

- Dépendance npm ajoutée/changée → `docker compose up -d --build`
- Schéma Prisma modifié : le client Prisma est packagé dans **chaque** image (`api` et `worker`), pas monté en volume. Créer/appliquer la migration (`cd packages/database && npx prisma migrate deploy`), puis :
  ```bash
  docker exec appfoot-api-1 sh -c "cd /repo/packages/database && npx prisma generate"
  docker exec appfoot-worker-1 sh -c "cd /repo/packages/database && npx prisma generate"
  docker compose restart api worker web
  ```
- Nouveau fichier dans le **worker** → `docker compose restart worker` (sinon le nouveau sync peut rester silencieux des jours).

### Dépannage macOS / Colima

- **`Failed to fetch` dans le navigateur** : l'API est arrêtée ou en train de redémarrer — attendre quelques secondes, puis recharger. Si elle ne répond pas : `docker compose logs api`.
- **Erreur `Unknown system error -35` / `Resource deadlock would occur (os error 35)`** : problème du montage virtiofs de Colima, souvent quand le disque du Mac est presque plein. Libérer de l'espace (`docker system prune`, puis `colima ssh -- sudo fstrim -av` pour rendre les blocs au Mac). Si un fichier est illisible depuis le conteneur, le réécrire sur l'hôte (`cp f f.tmp && mv f.tmp f`). Puis :
  ```bash
  docker compose stop web && rm -rf apps/web/.next && docker compose start web
  ```

### Commandes utiles

```bash
docker compose ps                    # état des conteneurs
docker compose logs -f api           # logs en direct (ou worker, web)
docker compose down                  # tout arrêter (données Postgres conservées)
docker compose down -v               # tout arrêter ET supprimer les données
```

## Déploiement en production (VPS)

Cible : un VPS Hetzner CX23, Postgres en conteneur, Caddy en reverse-proxy unique (HTTPS automatique), routage par chemin sur un seul domaine (`/` → web, `/api/*` → api) — tout reste same-origin, donc le cookie httpOnly d'auth fonctionne sans configuration de domaine.

- [`.github/workflows/release.yml`](./.github/workflows/release.yml) — versionnage et déploiement (voir « Versions et releases » ci-dessous) : à chaque release, build des images `api`/`worker`/`web` (web buildé avec `NEXT_PUBLIC_API_URL=/api`), push sur ghcr.io (tags `:vX.Y.Z`, `:<sha>` et `:latest`), copie de `docker-compose.prod.yml` sur le VPS, `pull`, migrations Prisma, `up -d`.
- [`docker-compose.prod.yml`](./docker-compose.prod.yml) — autonome, images ghcr.io, aucun port publié ; `api` et `web` rejoignent le réseau externe `proxy` (alias `football-api` / `football-web`). Ne pas le combiner avec `docker-compose.yml`.
- [`deploy/`](./deploy) — fichiers de référence côté VPS : `proxy/` (Caddy partagé dans `/opt/proxy`, un fichier `sites/*.caddy` par site), `env.prod.example` (modèle du `.env` de prod), `backup.sh` (pg_dump quotidien, 14 jours de rétention dans `/opt/backups`).
- Secrets GitHub à définir : `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`.
- Remplacer le domaine placeholder (`foot.tondomaine.com`) dans `deploy/proxy/sites/football.caddy` et `env.prod.example`, et pointer le DNS vers le VPS avant de démarrer Caddy.

### Versions et releases

Une seule version SemVer pour tout le repo (tags `vX.Y.Z`). **Merger dans `main` ne déploie rien** : on déploie en **publiant une Release GitHub** à la main (tag `vX.Y.Z`), ce qui build les images, les pousse sur ghcr.io et déploie ce tag sur le VPS (`TAG=vX.Y.Z` dans le `.env`, `pull`, migrations Prisma, `up -d`).

Guide complet (procédure, milestones, hotfix, rollback, dépannage) : [RELEASE.md](./RELEASE.md).

- **Livrer** : rattacher les PR à une milestone, les merger dans `main`, puis Releases → *Draft a new release* → nouveau tag `vX.Y.Z` (cible `main`) → *Generate release notes* → *Publish*.
- **Hotfix** : partir du tag en prod (`git checkout -b hotfix/vX.Y.Z+1 vX.Y.Z`), publier une Release dont la cible est la branche de hotfix, puis reporter le correctif dans `main`.
- **Rollback** : Actions → *Release* → *Run workflow* → `tag` = version à remettre (sans rebuild). ⚠️ Les migrations Prisma **ne sont pas annulées** : le rollback n'est sûr que si l'ancienne version reste compatible avec le schéma actuel de la base.

Plan complet, durcissement du serveur et points ouverts : [architecture.md](./architecture.md) section 9.

## Structure du monorepo

```
apps/
  web/           # Next.js 16 — frontend
  api/           # NestJS 11 — API REST
  worker/        # Polling TheSportsDB (calendrier, live, compos, faits de match)
  mobile/        # React Native (plus tard)
packages/
  database/      # Schéma Prisma 5 + migrations + client partagé
  shared-types/  # Types TS partagés web/api/worker
  config/        # ESLint / TS config partagés
deploy/          # Fichiers de référence pour le VPS
scripts/         # Scripts utilitaires (backup Postgres vers R2)
```

## Stack

Next.js 16 (App Router) · NestJS 11 (Passport, JWT en cookie httpOnly, throttler) · Prisma 5 + PostgreSQL 16 · Redis 7 · TheSportsDB v1/v2 · Docker Compose · GitHub Actions + ghcr.io · Caddy.
