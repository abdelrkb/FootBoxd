# Football App — Document d'architecture

> Application type "Letterboxd du sport" : noter/reviewer des matchs de foot, suivre des amis, commenter leurs reviews.

## 1. Concept

- Web-first (v1 sur PC), pensé pour être étendu au mobile (Android/iOS) ensuite.
- Objectif de croissance : <100 utilisateurs au démarrage, mais architecture pensée pour scaler (marketing prévu).

## 2. Contrainte API sportive & stratégie

**Source de données** : TheSportsDB, plan "Single Developer" à $9/mo — 100 requêtes/minute, livescore 2min, JSON premium, liens de highlights YouTube.

⚠️ **Point de vigilance** : TheSportsDB est une base **communautaire/crowd-sourced**. Fiable pour un MVP/petit cercle, mais moins garanti en qualité qu'un provider pro (ex: API-Football, Sportmonks). À réévaluer si la fiabilité des scores/compos devient critique en grandissant. Comme le provider est isolé dans le worker de polling, en changer plus tard ne touche que le mapping de données, pas le reste de l'archi.

**Règle d'or** : aucun client (web/mobile) n'appelle jamais l'API externe directement. Tout passe par un worker de polling qui alimente la base de données interne. Les clients ne lisent que cette base.

### Stratégie de polling

| Type de match | Fréquence | Méthode |
|---|---|---|
| Live | ~60-90s | Endpoint bulk `/livescore/soccer` (1 call = tous les matchs live) |
| À venir (J-1, jour J) | Toutes les 10-15 min | Check heure/statut |
| Terminé | 1 seule fois | Récupération score final, puis plus jamais (sauf edge case) |

Privilégier systématiquement les endpoints "bulk" plutôt que par match individuel.

### Détails techniques d'accès à l'API

- **Base URL v1** : `https://www.thesportsdb.com/api/v1/json/{API_KEY}`
- **Base URL v2** : `https://www.thesportsdb.com/api/v2/json`
- **Auth v2** : header `X-API-KEY: {API_KEY}` (plus propre que v1, réponses en codes HTTP standards)
- Le plan Premium ($9/mo) **débloque v2**, qui est la version activement maintenue par TheSportsDB — à privilégier partout où c'est possible
- **Exception** : la v2 n'a pas d'endpoint "matchs d'un jour donné, filtré par ligue", nécessaire pour le calendrier +5 jours du MVP. Cet endpoint n'existe qu'en **v1** (`eventsday.php`). Le worker devra donc combiner v1 (pour ce cas précis) et v2 (pour tout le reste), avec la même clé premium.
- Rate limit du plan Premium : **100 req/min** (429 renvoyé en cas de dépassement — le worker doit gérer ce code et backoff)

### Mapping endpoints ↔ besoins du worker

**Décision produit (2026-09-16)** : le MVP suit **toutes les ligues de football possibles**, pas une liste restreinte.

**Découverte importante en implémentant le worker** : `eventsday.php` accepte `l={idLeague}` en paramètre **optionnel**. Sans ce paramètre, `GET /v1/json/{KEY}/eventsday.php?d={YYYY-MM-DD}&s=Soccer` renvoie **tous** les matchs de foot du jour, toutes ligues confondues, en un seul appel (testé le 2026-09-16 : 1042 matchs / 225 ligues en un seul call). Conséquences directes sur l'architecture du worker :
- Pas besoin d'une liste de "ligues suivies" ni d'un polling par ligue : **5 appels** (un par jour, sur la fenêtre +5 jours du calendrier) suffisent pour tout couvrir, bien en dessous des 100 req/min.
- Les endpoints `all/leagues` et `list/teams/{idLeague}` (setup initial) deviennent **inutiles** : chaque event du payload `eventsday`/`livescore` embarque déjà `idLeague`/`strLeague`/`strLeagueBadge` et `idHomeTeam`/`strHomeTeam`/`strHomeTeamBadge` (idem away) — assez pour créer/mettre à jour les lignes `leagues`/`teams` à la volée (upsert par `external_id`) sans appel dédié. Limite connue : `strCountry` sur un event est le pays du **lieu du match**, pas forcément le pays de la ligue (ex: finale de C1 à Munich) — `leagues.country` reste donc `null` pour les compétitions internationales tant qu'on n'a pas fait un appel `lookup/league` dédié (pas fait pour le MVP, champ juste informatif).

| Besoin | Endpoint | Fréquence de call |
|---|---|---|
| Matchs live (tous, tous en 1 call) | `GET /v2/json/livescore/soccer` (header `X-API-KEY`) | ~60-90s |
| Matchs des +5 prochains jours, toutes ligues (calendrier) | `GET /v1/json/{KEY}/eventsday.php?d={YYYY-MM-DD}&s=Soccer` (sans `l`) | ~10-15 min, 5 appels (un par jour) |
| Compositions d'un match | `GET /v2/json/lookup/event_lineup/{idEvent}` | 1 fois avant le match (si dispo), refresh si absent |
| Highlights YouTube | *(pas d'appel séparé — voir section mapping champs, `strVideo` déjà présent sur l'event)* | — |

⚠️ **Gap détecté dans le modèle de données (section 6, corrigé)** : `matches` n'avait aucune colonne pour stocker le lien highlight (`strVideo`), pourtant listé comme besoin MVP. Colonne `highlight_url` (nullable) ajoutée. `strVideo` peut être une chaîne vide plutôt qu'absent — normalisé en `null` par le worker.

⚠️ **Second gap détecté en implémentant l'écran Profil (section 7, corrigé)** : la stat "matchs vus cette saison" nécessite de connaître la saison en cours de chaque ligue (section 8 : "pas de calcul de dates fait maison"), mais `leagues` n'avait aucune colonne pour ça. Colonne `current_season` ajoutée, alimentée par le worker avec le `strSeason` du dernier event synchronisé pour cette ligue (le schedule-sync ne portant que sur les +5 prochains jours, c'est de facto la saison en cours).

⚠️ **Bug trouvé et corrigé en conditions réelles (2026-09-16)** : `strSeason` peut être `null` sur des fixtures très en amont (saison pas encore confirmée par l'API, ex: un match "2026-2027" annoncé alors qu'on est en saison 2025-2026). Deux garde-fous ajoutés : (1) le worker n'écrase jamais `leagues.current_season` avec une valeur null/vide (sinon un seul match sans saison assignée corromprait la ligue entière au prochain cycle) ; (2) un event dont `strSeason` est absent est ignoré pour la création/mise à jour du match (`matches.season` est `NOT NULL`), rattrapé automatiquement une fois l'API à jour.

### Mapping champs API → colonnes internes (vérifié par appels réels le 2026-09-16, clé Premium)

| Champ API (event) | Colonne interne | Note |
|---|---|---|
| `idEvent` | `matches.external_id` | ⚠️ retourné en **string** par l'API (ex: `"2267074"`), pas en nombre — `parseInt`/cast requis dans le worker |
| `idLeague` | → résoudre `matches.league_id` via `leagues.external_id` | idem, string |
| `idHomeTeam` / `idAwayTeam` | → résoudre `home_team_id` / `away_team_id` via `teams.external_id` | idem, string |
| `intHomeScore` / `intAwayScore` | `home_score` / `away_score` | string aussi (ex: `"5"`), et `null` tant que le match n'a pas commencé |
| `strTimestamp` | `kickoff_at` | ✅ confirmé en **UTC** (champ ISO déjà combiné, ex: `"2025-08-16T11:30:00"`) — à privilégier quand disponible. ⚠️ **Bug réel trouvé le 2026-09-20** : `strTimestamp` peut être `null` sur des ligues mineures avec des données incomplètes (ex: idEvent 2608123, FA Cup Oman) — ce cas plantait `prisma.match.upsert` (`Invalid Date`) et bloquait tout rafraîchissement de ce match en boucle. Corrigé par repli sur `dateEvent` + `strTime` (traités comme UTC, faute de mieux — l'API ne donne pas le fuseau sur ces fixtures), et le match est ignoré pour ce cycle si aucune des deux sources n'est exploitable (voir `parseKickoff` dans `apps/worker/src/sync/upsert.ts`). `dateEventLocal`/`strTimeLocal` existent aussi mais renvoient l'heure locale du **pays de la rencontre**, pas celle de l'utilisateur — ne pas les utiliser pour `kickoff_at` |
| `strVenue` | `venue` | confirmé tel quel |
| `strSeason` | `matches.season` | confirmé, format `"2025-2026"` tel qu'attendu dans la doc |
| `strStatus` | → mapper vers l'enum interne étendu (section 6) | Table de correspondance complète (décidée le 2026-09-16) :<br>`NS`, `TBD` → `scheduled`<br>`1H`, `HT`, `2H`, `ET`, `BT`, `P` → `live`<br>`FT`, `AET`, `PEN` → `finished`<br>`AWD` (défaite technique), `WO` (walkover) → `finished` (résultat attribué sans jeu normal — pas de valeur dédiée, trop rare pour justifier 2 enum de plus)<br>`PST` → `postponed`<br>`CANC` → `cancelled`<br>`SUSP`, `INT` → `suspended`<br>`ABD` → `abandoned`<br>`""` (vide) et `"null"` (string littérale) → `scheduled` (observés en réel le 2026-09-16 sur des matchs +3/+4 jours, avant que l'API assigne `NS`)<br>Tout code non reconnu (nouveau statut ajouté par TheSportsDB) : le worker doit logger un warning et **ignorer l'event** (ne pas créer/modifier le match) plutôt que planter ou écraser avec une valeur invalide — validé en conditions réelles sur un sync complet (2828 matchs / 348 ligues / 4971 équipes, tous statuts documentés bien représentés y compris les cas rares postponed/cancelled/abandoned) |
| Réponse de `lookup/event_lineup` | `matches.lineups` (jsonb, stocké tel quel) | Ce n'est **pas** un objet structuré `{home: [...], away: [...]}` : c'est un **tableau plat** d'une ligne par joueur, avec un flag `strHome` (`"Yes"/"No"`) et `strSubstitute` (`"Yes"/"No"`) à filtrer côté front. Sur tous les matchs testés (PL, Ligue 1, finale C1 2025), `strFormation` était systématiquement `null` et `strSubstitute` systématiquement `"No"` — **en pratique l'endpoint ne renvoie que les 11 titulaires, jamais la formation ni les remplaçants**. À ne pas présenter comme fiable pour un affichage de compo complète avec banc. |
| Réponse de `lookup/event_highlights` | *(pas de colonne dédiée nécessaire)* | ⚠️ **Écart important** : cet endpoint ne renvoie pas une liste de clips distincte — il renvoie **exactement le même objet event complet** que `lookup/event` (mêmes champs). Le lien YouTube du highlight est simplement le champ `strVideo` déjà présent sur l'event. **Conséquence** : pas besoin d'un appel séparé après un match terminé, `strVideo` est déjà disponible dès `lookup/event` — l'endpoint `event_highlights` semble redondant pour ce cas d'usage (à confirmer si un jour un match a plusieurs highlights, mais aucun cas observé). |

**Endpoint `livescore/soccer` (payload plus léger, pour le polling live)** : contient `idEvent`, `idLeague`, `idHomeTeam`/`idAwayTeam`, `intHomeScore`/`intAwayScore`, `strStatus`, `strTimestamp`, `dateEvent`, ainsi que `strProgress` (minute de jeu — texte libre, pas un entier : `"45"`, `"45+1"` en temps additionnel, `""` en séance de tirs au but) et `updated` (non utilisé). ✅ **`strProgress` est implémenté (2026-09-20)** : stocké tel quel dans `matches.live_minute` (nullable, remis à `null` dès que le match n'est plus `live`), affiché à côté du statut "En direct" sur l'accueil et la page de match.

**Faits de match (buts/cartons/remplacements)** — ajouté le 2026-09-20, vérifié par appel réel :

| Besoin | Endpoint | Fréquence de call |
|---|---|---|
| Timeline d'un match (buts, cartons, remplacements) | `GET /v2/json/lookup/event_timeline/{idEvent}` | Toutes les 2 min, pour chaque match `live` ou `finished` depuis moins de 3h (pas d'endpoint bulk — un call par match) |

Champs réels de `lookup/event_timeline` : `idTimeline` (id stable, sert de clé d'upsert idempotent), `strTimeline` (`"Goal"` / `"Card"` / `"subst"` — mappé vers l'enum interne `match_event_type`), `strTimelineDetail` (texte libre non normalisé, ex `"Normal Goal"`, `"Yellow Card"` — stocké tel quel, pas d'enum fermé côté détail), `intTime` (minute), `strHome` (`"Yes"/"No"`), `idTeam`/`strTeam`, `idPlayer`/`strPlayer`, `idAssist`/`strAssist`. Un type de timeline non reconnu est loggé en warning et ignoré (même stratégie de tolérance que pour `strStatus`, section 2).

## 3. Stack technique

- **Frontend web** : Next.js (React) — priorité v1, SSR/SEO pour pages publiques de matchs
  - **Notes d'implémentation (2026-09-16)** : le scaffold `create-next-app` a généré du **Next.js 16.3.5**, sorti très récemment (cf. `apps/web/AGENTS.md`, régénéré par `next dev`, qui prévient explicitement que cette version a des changements par rapport aux connaissances généralistes — la doc réelle est vérifiée dans `node_modules/next/dist/docs/` avant d'écrire du code).
    - **Cache Components** (nouveau système de cache `use cache`/`cacheLife` remplaçant `revalidate`/`fetchCache`) est **désactivé** (`cacheComponents` absent de `next.config.ts`, comportement par défaut). Ce flag est opt-in et ajoute une contrainte forte (routes qui lisent `cookies()` doivent être wrappées dans `<Suspense>`, `generateStaticParams` ne peut plus renvoyer `[]`, etc.) — sans intérêt pour une appli aussi dynamique/personnalisée (auth par cookie partout, scores live, notifications), donc pas activé.
    - **Convention d'imports différente de l'API/worker** : `apps/web` utilise `moduleResolution: "bundler"` (généré par défaut), qui n'accepte **pas** les imports relatifs avec suffixe `.js` pointant vers un `.tsx`/`.ts` (contrairement à `apps/api`/`apps/worker` en `nodenext`, qui l'exigent). Erreur de build rencontrée puis corrigée : tous les imports relatifs dans `apps/web` sont sans extension.
    - Auth cookie httpOnly : le frontend appelle l'API **directement depuis le navigateur** (`fetch` côté client avec `credentials: 'include'`), pas de proxy via des Server Actions Next.js — voir le point ouvert sur la topologie DNS/reverse-proxy en section 9 (hébergement).
- **Frontend mobile** : React Native (plus tard) — code/logique métier partagés avec le web (types, hooks)
- **Backend** : Node.js + NestJS — structure modulaire (`matches`, `reviews`, `users`, `follows`, `comments`, `notifications`, `polling`)
  - **Note d'implémentation (2026-09-16)** : `@nestjs/cli` générait par défaut du NestJS **v12** (sorti très récemment). Une partie de l'écosystème (`@nestjs/throttler`, entre autres) n'a pas encore de version compatible (peerDependencies limitées à `^11.0.0` max), et un vrai bug de résolution de dépendances est apparu avec `@nestjs/passport@12` (`LocalAuthGuard`/`AuthGuard()` ne se résolvait pas via l'injection de dépendances). **Toutes les briques `@nestjs/*` sont donc pinnées sur la dernière v11 stable**, testée et fonctionnelle de bout en bout (voir module auth). À réévaluer une fois que l'écosystème aura rattrapé la v12.
- **Base de données** : PostgreSQL — **tranché le 2026-09-20 : conteneur Docker sur le VPS** (pas de service managé), avec backups pg_dump quotidiens vers Cloudflare R2, voir section 9. L'option initialement envisagée ici, **Neon** (scaling auto, database branching, tier gratuit), reste une alternative si la charge de gestion des backups devient gênante. Supabase reste une option si on veut déléguer aussi auth/storage/realtime.
- **Cache / temps réel** : Redis — pub/sub pour push aux clients
- **Communication temps réel** : WebSocket (Socket.io ou NestJS Gateway) pour push scores live ET notifications, sans polling côté client
  - ⚠️ **Non implémenté à ce jour (2026-09-20)** : le worker publie déjà les mises à jour de score live sur un canal Redis (`match:live-update`, voir `apps/worker/src/redis.ts` et `live-sync.ts`), mais **rien ne s'y abonne** — pas de `WebSocketGateway` côté API, pas de client Socket.io côté web. En pratique, aujourd'hui, le front récupère l'état d'un match (score, minute, faits de match) uniquement via un `fetch` REST au chargement de la page, **sans rafraîchissement automatique ni polling côté client** (vérifié : aucun `setInterval` dans `apps/web/src`). Un utilisateur qui reste sur une page de match live doit la recharger pour voir le score évoluer. À trancher avant/après le lancement VPS (voir section 11) : brancher le WebSocket promis ici, ou accepter un polling REST simple côté client comme premier palier.
- **Auth** : NestJS + Passport.js — stratégies `passport-local` (email/password) + `passport-google-oauth20` + `passport-apple`, JWT en sortie
  - **Décisions prises à l'implémentation (2026-09-16, non précisées dans la version initiale du doc)** :
    - Transport du JWT : **cookie httpOnly + secure** posé par l'API après login (pas de localStorage/header Authorization côté client) — plus sûr contre le XSS, compatible SSR Next.js. Implique `credentials: 'include'` côté fetch web et une config CORS avec origine explicite (pas de `*`, déjà prévu section 8).
    - Un seul JWT, durée `JWT_EXPIRES_IN=7d` (pas de refresh token séparé pour le MVP) — l'utilisateur se reconnecte simplement après expiration.

## 4. Structure du monorepo (GitHub)

```
football-app/
├── apps/
│   ├── web/              # Next.js
│   ├── mobile/           # React Native (plus tard)
│   ├── api/               # NestJS backend
│   └── worker/            # Service de polling API sportive
├── packages/
│   ├── shared-types/       # Types TS partagés (Match, Review, User...)
│   ├── database/           # Schéma Prisma/Drizzle + client DB partagé
│   └── config/             # ESLint, TS config partagés
├── docker-compose.yml
├── docker-compose.override.yml   # overrides dev local (hot-reload)
├── .env.example
└── turbo.json              # optionnel, ajoutable plus tard sans douleur
```

- Repo GitHub classique, mono-repo (structure interne, aucun impact sur l'usage Git/GitHub au quotidien)
- Turborepo : pas indispensable en solo dev pour démarrer, à ajouter plus tard si besoin (cache de build, gestion de l'ordre des dépendances entre packages)

## 5. Déploiement — Docker Compose

Un seul `docker compose up` lance tout : postgres, redis, api, worker, web. Même fichier utilisé en local et sur le futur VPS.

⚠️ **Correction apportée à l'implémentation (2026-09-16)** : `build: ./apps/api` (contexte = le sous-dossier de l'app) ne fonctionne pas avec des **npm workspaces** — chaque app dépend de `package.json`/`package-lock.json` à la racine et des packages partagés (`packages/database`, `packages/shared-types`, `packages/config`), qui doivent être visibles dans le contexte de build. Chaque service utilise donc `context: .` (racine du repo) + `dockerfile: apps/<app>/Dockerfile` explicite, plutôt qu'un simple `build: ./apps/<app>`.

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: football_app
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    depends_on:
      - postgres
      - redis
    env_file: .env
    ports:
      - "3000:3000"

  worker:
    build:
      context: .
      dockerfile: apps/worker/Dockerfile
    depends_on:
      - postgres
      - redis
    env_file: .env

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    depends_on:
      - api
    env_file: .env
    ports:
      - "3010:3000"

volumes:
  pgdata:
```

⚠️ **Port web changé de 3001 à 3010 le 2026-09-16** : conflit récurrent avec le serveur de dev d'un autre projet du même développeur (`jjb-club`, qui tourne aussi en local sur 3001) — Docker rapportait le mapping de port comme actif sans erreur, mais le trafic était en réalité intercepté par l'autre process déjà en écoute sur ce port au niveau de l'OS (comportement propre au réseau par VM de Colima/Docker Desktop sur macOS, pas une erreur silencieuse de Docker Compose lui-même). Symptôme : conteneurs "Up", mais rien ne répond sur `localhost:3001`.

- `.env.example` versionné, `.env` réel ignoré par git (mêmes clés, valeurs différentes en local/prod : `DATABASE_URL`, `REDIS_URL`, `SPORTS_API_KEY`, etc.)
- `docker-compose.override.yml` : hot-reload + volumes montés sur le code source en dev local (chargé automatiquement par Compose, pas déployé sur le VPS)
- Prod : `docker compose up -d --build` avec le `.env` de prod
- Optionnel plus tard : `Makefile` (`make up`, `make down`, `make logs`) pour simplifier les commandes

## 6. Modèle de données

**Décisions prises à l'implémentation (2026-09-16)** :
- **Type d'ID** : `uuid` partout (pas seulement `users`/`auth_providers`), pour rester cohérent et éviter des IDs devinables même sur les ressources publiques (reviews, matchs...).
- **`UNIQUE(user_id, match_id)` sur `reviews`** : un utilisateur peut re-review un match après avoir supprimé (soft delete) sa review précédente. Implémenté en base comme un **index unique partiel** `WHERE deleted_at IS NULL` (pas exprimable nativement dans `schema.prisma` → ajouté à la main dans la migration SQL générée par Prisma).
- **`CHECK rating BETWEEN 0.5 AND 5 AND rating % 0.5 = 0`** : Prisma n'a pas de syntaxe déclarative pour les contraintes `CHECK` → ajoutée à la main dans la migration SQL générée par Prisma (`prisma migrate dev --create-only`, puis édition du fichier `.sql` avant application).
- **`notifications.reference_id`** : volontairement sans FK (polymorphe — pointe vers une review ou un commentaire selon `type`), donc juste une colonne `uuid` nullable sans contrainte de clé étrangère.

```
users
├── id (uuid, PK)
├── email (unique)
├── password_hash (nullable — null si connexion OAuth uniquement)
├── username (unique — ajouté le 2026-09-20, handle de recherche/@mention, distinct de display_name.
│             3-20 caractères [a-z0-9_], choisi à l'inscription. Pour les comptes OAuth (qui ne
│             passent pas par le formulaire), généré automatiquement à partir du nom affiché.)
├── display_name
├── avatar_url (nullable — avatar par défaut Dicebear si non renseigné, voir section 8)
├── favorite_team_id (FK → teams, nullable — "club de cœur", ajouté le 2026-09-20, une seule
│                      équipe épinglée en haut de l'accueil)
├── notify_on_like / notify_on_comment / notify_on_new_follower (booléens, défaut true)
├── notify_kickoff_reminder / hide_scores_until_click (booléens, défaut false)
│   ⚠️ Stockées mais seule `hide_scores_until_click` a un effet réel pour l'instant (masque le
│   score derrière un clic, purement front). Les autres n'affectent encore ni l'envoi des
│   notifications ni un rappel programmé (nécessiterait une tâche planifiée côté worker,
│   reportée) — décision produit du 2026-09-20.
├── has_completed_onboarding (boolean, défaut false — parcours en 3 étapes après inscription :
│                              choix des ligues suivies, club de cœur + réglages, confirmation)
├── created_at
└── updated_at

favorite_leagues
├── user_id (FK → users)
├── league_id (FK → leagues)
├── created_at
└── PK(user_id, league_id)
-- ligues suivies par un utilisateur (accueil : favoris affichés en priorité, filtrés pour
-- n'afficher une ligue que si elle a au moins un match ce jour-là — décision produit 2026-09-17)

auth_providers
├── id (uuid, PK)
├── user_id (FK → users)
├── provider (enum: 'google' | 'apple' | 'email')
├── provider_user_id
└── created_at

leagues
├── id
├── external_id (id fourni par l'API sportive)
├── name
├── country
├── logo_url
└── current_season (nullable — ajouté le 2026-09-16, alimenté par le worker, cf. section 8)

teams
├── id
├── external_id
├── name
└── logo_url

matches
├── id
├── external_id
├── league_id (FK → leagues)
├── home_team_id (FK → teams)
├── away_team_id (FK → teams)
├── home_score (nullable)
├── away_score (nullable)
├── status (enum: 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled' | 'suspended' | 'abandoned')
├── kickoff_at (timestamp)
├── live_minute (nullable, string — ajouté le 2026-09-20, ex "45", "45+2" ; alimenté par le worker
│                pendant que status='live', remis à null sinon, voir section 2)
├── venue
├── lineups (jsonb, nullable)
├── highlight_url (nullable — lien YouTube, ajouté le 2026-09-16, absent de la version initiale du modèle)
└── updated_at

match_events
├── id
├── match_id (FK → matches)
├── external_id (unique — idTimeline TheSportsDB, clé d'upsert idempotent)
├── type (enum: 'goal' | 'card' | 'substitution')
├── detail (nullable, texte libre API — ex "Normal Goal", "Yellow Card" — pas d'enum fermé)
├── minute
├── is_home (boolean)
├── team_id (FK → teams)
├── player_name (nullable)
├── assist_name (nullable)
└── created_at
-- "faits de match" (ajouté le 2026-09-20), alimenté par le worker via lookup/event_timeline
-- (section 2), affiché en timeline sur la page de détail d'un match

reviews
├── id
├── user_id (FK → users)
├── match_id (FK → matches)
├── rating (numeric(2,1), CHECK rating BETWEEN 0.5 AND 5 AND rating % 0.5 = 0)
├── comment (nullable)
├── created_at
├── deleted_at (nullable — soft delete, review supprimable par son auteur)
└── UNIQUE(user_id, match_id)  ← un seul review par match et par user

comments
├── id
├── review_id (FK → reviews)
├── user_id (FK — auteur du commentaire)
├── content
└── created_at

review_likes
├── user_id (FK → users)
├── review_id (FK → reviews)
├── created_at
└── PK(user_id, review_id)

follows
├── follower_id (FK → users)
├── following_id (FK → users)
├── created_at
└── PK(follower_id, following_id)
-- follow public et instantané (pas de système de demande pour le MVP)

notifications
├── id
├── recipient_id (FK → users)
├── actor_id (FK → users)
├── type (enum: 'comment' | 'like' | 'follow')
├── reference_id (nullable — id de la review/commentaire concerné)
├── is_read (boolean, default false)
└── created_at
```

**Notes** :
- Suppression de review : soft delete (`deleted_at`), gérable par l'auteur.
- Follow : public et instantané pour le MVP.
- Avatar : valeur par défaut au signup, modifiable ensuite via upload.

## 7. Fonctionnalités du MVP

**Mise à jour majeure le 2026-09-20** : un système de design complet a été livré (`design_handoff_footboxd/`, tokens CSS, typographie Archivo/Martian Mono, bibliothèque de composants) et intégré à tout le frontend. Le contenu ci-dessous décrit l'état **réellement implémenté**, pas le plan initial — la nav a par exemple 2 liens (profil via l'avatar, notifications via la cloche) au lieu des 4 initialement esquissés.

### Navigation
2 liens seulement (Accueil, Recherche) + icône notifications (avec pastille de compteur) + avatar/nom (menu profil ou connexion/inscription) — pas de bandeau live global (écart assumé au design d'origine).

### Écran Accueil
- Colonne principale : sélecteur de date (jusqu'à +5 jours), liste des ligues **favoris affichés en priorité** puis le reste, chaque ligue filtrée pour n'apparaître que si elle a au moins un match ce jour-là, badge rouge du nombre de matchs live
- Clic sur une ligue → page dédiée avec ses matchs du jour sélectionné
- Colonne latérale : "Reviews populaires", "Reviews de mes amis" (utilisateurs suivis), "Matchs populaires" — popularité = fenêtre glissante de 48h, score review = likes + commentaires × 2, score match = nombre de reviews sur la fenêtre
- Score/statut d'un match live ou terminé masquable derrière un clic ("Masquer les scores", seul réglage de notification à effet réel, voir `hide_scores_until_click` section 6)

### Page de détail d'un match
- En-tête : crests, score (masquable), statut (7 valeurs, jamais porté par la seule couleur), minute en direct si live, lien highlight YouTube si disponible
- Formulaire de log (étoiles sur 5, demis autorisés) + commentaire optionnel, un seul par utilisateur et par match
- Liste des reviews : like (optimiste), fil de commentaires dépliable, édition et suppression de sa propre review (`PATCH /reviews/:id`)
- **Faits de match** : timeline buts/cartons/remplacements (voir section 2 et 6)
- Compositions (si l'API en fournit — 11 titulaires uniquement, jamais banc ni formation, voir section 2), sinon état vide explicite
- Histogramme de distribution des notes (5 barres, `Math.ceil` regroupe les valeurs par 0,5 dans la barre entière au-dessus)

### Écran "Toutes les ligues"
Page séparée de l'accueil : recherche/filtre texte, section "Tes favoris" / "Tout le reste", ajout/retrait de favori par ligue.

### Écran Recherche
✅ **Implémenté le 2026-09-20** (n'est plus un stub) : recherche d'utilisateurs par pseudo (`username`) ou nom affiché, debounce 300ms, résultats cliquables vers leur profil public. La recherche de match reste non développée.

### Profils publics et follow
- `/profile` (le sien) et `/profile/:id` (celui de quelqu'un d'autre) partagent la même vue : avatar, pseudo, 4 stats (followers/suivis/matchs notés/vus cette saison), 4 "matchs préférés" (meilleures notes de la saison), 4 derniers matchs loggés
- Bouton Suivre/Suivi(e) sur le profil d'autrui (`POST`/`DELETE /users/:id/follow`, `GET /users/:id/am-i-following`)
- Nom/avatar d'un auteur (review, commentaire, notification) cliquable vers son profil depuis n'importe où dans l'app

### Onboarding (après inscription)
Parcours en 3 étapes, une seule fois par compte (`has_completed_onboarding`) : (1) sélection des ligues à suivre, (2) club de cœur (optionnel, parmi les équipes des ligues choisies) + réglages de notification, (3) confirmation. Modifiable ensuite depuis `/settings`.

### Écran Réglages (`/settings`)
Club de cœur + les 5 réglages de notification (voir section 6 pour lesquels ont un effet réel).

### Écran Notifications
Déclencheurs : commentaire sur ma review, like sur ma review, nouveau follower. Bouton "Tout marquer comme lu" (`PATCH /notifications/read-all`). Une notification de type follow propose un bouton "Suivre" en retour si je ne suis pas déjà cette personne (`isFollowingActor`, calculé à la volée, pas stocké).

### Écran Profil (le sien)
- Photo de profil (avatar par défaut Dicebear, pas d'upload implémenté — voir section 8)
- 4 matchs préférés de la saison + 4 derniers matchs loggés
- Nombre de matchs vus cette saison / nombre total de matchs notés (toutes saisons)
- Nombre de follows / nombre de followers
- "Modifier le profil" → `/settings`

## 8. Stockage des images, saison, fuseau horaire, sécurité

### Stockage des avatars
Stockage objet externe requis (pas de disque local, perdu à chaque redeploy Docker) : **Cloudflare R2** (pas de frais de sortie, compatible API S3) — variables d'env `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`.

⚠️ **Non implémenté à ce jour (2026-09-20)** : ces variables existent dans `.env.example` mais rien ne les lit — il n'y a ni intégration R2, ni endpoint d'upload d'avatar. Chaque compte reçoit un avatar par défaut généré par **Dicebear** (`https://api.dicebear.com/9.x/thumbs/svg?seed=...`), fixe, non modifiable par l'utilisateur. À construire si "changer son avatar" doit faire partie du lancement, sinon le placeholder Dicebear suffit pour un premier palier.

### Notion de "saison"
Pas de règle calendaire custom (ex: juillet-juin) : on utilise directement le champ **saison fourni par l'API** pour chaque ligue/événement (ex: `"2025-2026"`), stocké tel quel sur `matches` (colonne `season`, string). Les stats "matchs vus cette saison" du profil filtrent sur la saison en cours de la/les ligue(s) concernée(s), telle que renvoyée par TheSportsDB — pas de calcul de dates fait maison.

```
matches
├── ...
├── season (string, ex: "2025-2026" — valeur brute de l'API)
└── ...
```

### Fuseau horaire
- `kickoff_at` stocké en **UTC** en base (standard)
- Conversion vers l'heure locale faite **côté client** (web/mobile), à partir du fuseau de l'appareil — aucune conversion ni logique de timezone côté backend
- ✅ Confirmé par appels réels (2026-09-16) : `strTimestamp` (et `dateEvent`+`strTime`) sont bien en UTC — aucune conversion nécessaire côté worker, stockage direct. Les champs `dateEventLocal`/`strTimeLocal` (heure locale du pays de la rencontre) doivent être ignorés pour `kickoff_at`.

### Variables d'environnement (`.env.example`)
```
# Database
DATABASE_URL=postgresql://user:password@postgres:5432/football_app

# Redis
REDIS_URL=redis://redis:6379

# API sportive (TheSportsDB)
SPORTS_API_KEY=
SPORTS_API_V1_BASE_URL=https://www.thesportsdb.com/api/v1/json
SPORTS_API_V2_BASE_URL=https://www.thesportsdb.com/api/v2/json

# Auth
JWT_SECRET=
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
APPLE_CLIENT_ID=
APPLE_TEAM_ID=
APPLE_KEY_ID=
APPLE_PRIVATE_KEY=
APPLE_CALLBACK_URL=http://localhost:3000/auth/apple/callback

# Stockage (Cloudflare R2) — non câblé côté code à ce jour, voir note plus haut
STORAGE_ENDPOINT=
STORAGE_BUCKET=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=

# App
NODE_ENV=development
PORT=3000
WEB_URL=http://localhost:3010
# Inliné côté client par Next.js AU BUILD (pas au runtime du conteneur) — doit pointer vers
# l'URL publique de l'API telle qu'un navigateur la verra, donc à fixer selon la topologie de
# prod retenue avant de builder l'image web (voir section 9, point ouvert sur le cookie/domaine).
NEXT_PUBLIC_API_URL=http://localhost:3000
```

⚠️ Les callback URLs OAuth (`GOOGLE_CALLBACK_URL`, `APPLE_CALLBACK_URL`) et `NEXT_PUBLIC_API_URL` sont **spécifiques au domaine** : ceux ci-dessus sont les valeurs de dev local, à remplacer par les URLs publiques du VPS avant de builder/déployer en prod (et à déclarer côté Google Cloud Console / Apple Developer pour les deux premières).

### Sécurité basique de l'API interne
- **Rate-limiting** sur les endpoints NestJS eux-mêmes (module `@nestjs/throttler`, `100 req/min` — voir `apps/api/src/app.module.ts`), indépendant du rate-limit de l'API externe
- **CORS** configuré explicitement pour autoriser web + mobile (origines à whitelister, pas de wildcard `*` en prod) — voir `apps/api/src/main.ts`
- **Validation des inputs** via `class-validator` + `class-transformer` (natif NestJS, DTO validés automatiquement sur chaque endpoint)

⚠️ **`docker-compose.yml` (dev) contient des identifiants Postgres en dur** (`user`/`password`) et publie les ports 5432/6379 sur l'hôte — sans conséquence en local, mais à ne **jamais** reproduire tel quel en prod. `docker-compose.prod.yml` (section 9) corrige les deux : identifiants via variables d'env (`.env`, jamais commité), et postgres/redis sans aucun port publié.

Durcissement du **serveur** lui-même (SSH, pare-feu, mises à jour, rotation des logs) : voir la check-list dans la section 9 (Hébergement) — distincte de la sécurité applicative ci-dessus.

## 9. Hébergement (VPS)

**Décisions prises le 2026-09-20** (revue du plan initial avant premier déploiement — voir aussi section 11) :

**Hetzner Cloud — instance CX23** (renommée depuis CX22 le 15/06/2026, mêmes specs) : 2 vCPU / 4 GB RAM / 40 GB NVMe, **5,49 €/mois** (Allemagne/Finlande, tarif post-15/06/2026, +38% par rapport à l'ancien prix), 20 TB de bande passante inclus, DDoS protection et firewall inclus. Rester sur la gamme **CX** (vCPU partagés) — les gammes CPX/CCX (vCPU dédiés) ont beaucoup plus augmenté et ne se justifient pas pour <100 utilisateurs. 4 Go de RAM suffisent pour faire tourner postgres + redis + api + worker + web ensemble.

Scaling : monter en gamme sur la même famille (CX33, CX43...) tant qu'une seule machine suffit. Ne pas anticiper le multi-serveur/Kubernetes avant que le trafic le justifie réellement.

Alternatives si besoin de support/facturation français : **OVH** ou **Scaleway** (VPS équivalents, un peu plus chers).

**Postgres : conteneur Docker sur le VPS, pas Neon.** Zéro coût supplémentaire ; en contrepartie les backups sont à notre charge — voir `scripts/backup-postgres.sh` (pg_dump quotidien vers Cloudflare R2, à planifier via crontab sur le VPS, pas dans un conteneur). Le plan initial de la section 3 mentionnait Neon : tranché en faveur du conteneur pour un MVP solo, sans dépendance externe ni latence réseau supplémentaire. Neon reste une option de repli si la charge de gestion des backups devient gênante.

**Reverse-proxy et cookie d'auth — point ouvert résolu.** Le plan initial notait qu'un cookie httpOnly sans `domain` explicite ne traverse pas des sous-domaines différents (`api.example.com` / `app.example.com`). Décision : un **reverse-proxy Caddy unique** devant tout, routage par chemin sur un seul domaine (`example.com/` → `web`, `example.com/api/*` → `api`, via `handle_path` qui retire le préfixe `/api` avant de transmettre à NestJS — donc **aucun changement de code côté `apps/api`**, ses routes restent exactes telles quelles). Tout reste same-origin côté navigateur : le cookie httpOnly (déjà `secure` en prod, `sameSite: 'lax'`, sans `domain` — voir `apps/api/src/auth/auth.controller.ts`) fonctionne sans modification. Caddy gère aussi le TLS Let's Encrypt automatiquement. Seuls les ports **80 et 443** doivent être ouverts publiquement sur le VPS (postgres/redis ne publient plus aucun port, même en interne au conteneur — accessibles seulement via le réseau Docker Compose).

Fichiers réels du dépôt pour ce plan (plus un simple exemple dans ce document — à tenir synchronisés s'ils évoluent) :
- [`docker-compose.prod.yml`](./docker-compose.prod.yml) — fichier **autonome** (pas un override de `docker-compose.yml`, voir le commentaire en tête de fichier sur la fusion additive des listes Compose) : images `ghcr.io/...` au lieu de `build:`, postgres/redis sans port publié, service `caddy` en point d'entrée unique (80/443)
- [`Caddyfile`](./Caddyfile) — ⚠️ contient un domaine placeholder `example.com` à remplacer avant le premier déploiement réel (aucun nom de domaine choisi à ce jour) ; le DNS doit pointer vers l'IP du VPS **avant** de démarrer Caddy, sinon la demande de certificat Let's Encrypt échoue
- [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) — pipeline CI/CD, corrigé le 2026-09-20 (voir points 1/2/5 ci-dessous)
- [`scripts/backup-postgres.sh`](./scripts/backup-postgres.sh) — pg_dump quotidien vers R2

**Corrections apportées au pipeline CI/CD initial (2026-09-20)**, avant même sa première implémentation :
1. **Contexte de build cassé** : le plan initial utilisait `context: ./apps/${{ matrix.app }}`, incompatible avec les npm workspaces (section 5 — chaque Dockerfile fait `COPY packages ./packages`, invisible depuis un sous-dossier). Corrigé en `context: .` + `file: apps/${{ matrix.app }}/Dockerfile`.
2. **Tags d'image** : `:latest` seul ne permet pas de rollback ciblé. Chaque build est maintenant taggé à la fois `:${{ github.sha }}` et `:latest`.
3. **Build vs pull en prod** : rebuilder Next.js sur un CX23 (2 vCPU/4 Go) à chaque déploiement serait lent et gourmand — la CI build une fois dans GitHub Actions, le VPS ne fait que `pull` les images déjà construites (`docker-compose.prod.yml`).
4. **Migrations Prisma absentes du pipeline** : ajout de `docker compose -f docker-compose.prod.yml run --rm api npm run migrate:deploy --workspace=@football-app/database` entre le `pull` et le `up -d` final (voir le script SSH dans `deploy.yml`).

⚠️ **État réel (2026-09-20)** : ce pipeline n'a encore jamais tourné en conditions réelles (pas de VPS provisionné à ce jour). Prévoir un **premier déploiement manuel** (SSH direct, en suivant l'ordre décrit dans `deploy.yml`) pour valider la chaîne avant d'activer le déclenchement automatique sur push `main`.

**Durcissement de base du VPS (à faire une fois, avant tout déploiement)** :
- Utilisateur non-root avec authentification par clé SSH uniquement, connexion par mot de passe désactivée (`PasswordAuthentication no`)
- Pare-feu (firewall Hetzner, ou `ufw`) limité aux ports 22, 80, 443
- `unattended-upgrades` (mises à jour de sécurité automatiques) et `fail2ban` (protection brute-force SSH)
- Rotation des logs Docker (`max-size`/`max-file` dans `/etc/docker/daemon.json`) — sans ça, le disque de 40 Go finit par se remplir

Étape préalable côté VPS : cloner le repo une fois dans `/opt/football-app` (pour disposer de `docker-compose.prod.yml`, `Caddyfile` et `.env` de prod), configurer `docker login ghcr.io` avec un token en lecture seule, et laisser le pipeline gérer le reste ensuite.

**Tests avant déploiement** : pour l'instant pas de suite de tests définie — à mettre en place en même temps que le dev démarre (tests unitaires NestJS a minima sur les services critiques : `reviews`, `follows`, `auth`). Le job `build-and-push` peut inclure un step `npm test` qui bloque le déploiement si les tests échouent, dès qu'il y en a.

**Ordre de mise en place recommandé** :
1. Créer le serveur (CX23), le durcir, installer Docker + Docker Compose
2. Choisir un nom de domaine et pointer son DNS vers l'IP du VPS
3. Remplacer `example.com` dans `Caddyfile`, compléter `.env` de prod (voir `.env.example`, section "Prod uniquement")
4. Cloner le repo dans `/opt/football-app`, premier déploiement manuel pour valider
5. Configurer les secrets GitHub (`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` — clé privée SSH dédiée, sans passphrase) et activer le déclenchement automatique sur push `main`
6. Planifier `scripts/backup-postgres.sh` en cron quotidien

## 10. ORM

**Prisma**, retenu pour `packages/database` : meilleure intégration avec NestJS, migrations gérées automatiquement, très bien documenté, schéma déclaratif lisible (`schema.prisma`) qui sert aussi de source de vérité pour générer les types partagés avec `packages/shared-types`.

⚠️ **Bug réel trouvé en testant `docker compose up` de bout en bout (2026-09-16)**, invisible en dev local (macOS) : le moteur Prisma ne démarrait pas dans les conteneurs `api`/`worker` (`node:22-alpine`, Alpine 3.24) — `Error loading shared library libssl.so.1.1: No such file or directory`. Deux causes cumulées :
1. `generator client` dans `schema.prisma` ne déclarait pas `binaryTargets`, donc seul le binaire natif (macOS) était généré, pas celui pour Alpine/musl.
2. Même avec le bon `binaryTargets` (`linux-musl-openssl-3.0.x`, ajouté), Prisma **détecte la version d'OpenSSL à l'exécution** en sondant le système — sans le paquet `openssl` installé dans l'image (Alpine minimal ne l'a pas par défaut), cette détection échoue et Prisma se rabat sur un défaut `openssl-1.1.x` erroné, quel que soit le binaire réellement généré.

Corrigé par : `binaryTargets = ["native", "linux-musl-openssl-3.0.x"]` dans `schema.prisma` **et** `RUN apk add --no-cache openssl` dans `apps/api/Dockerfile` et `apps/worker/Dockerfile`. Les deux étaient nécessaires — l'un sans l'autre ne suffit pas.

## 11. Points restés ouverts (à trancher en cours de dev)

**Restant à faire avant le déploiement VPS (2026-09-20)** — tout le reste du plan (VPS, Postgres, reverse-proxy, pipeline, durcissement) est tranché, voir section 9 :
- **Nom de domaine** — aucun choisi à ce jour. `Caddyfile` contient un placeholder `example.com` à remplacer, et le DNS doit pointer vers l'IP du VPS avant de démarrer Caddy (sinon échec de la demande de certificat TLS).
- **Premier déploiement** — le pipeline CI/CD (`.github/workflows/deploy.yml`) et `docker-compose.prod.yml` existent et sont corrigés (section 9) mais n'ont **jamais tourné en conditions réelles** (pas de VPS provisionné à ce jour) — prévoir un premier déploiement manuel de validation avant d'activer le déclenchement automatique.
- **Temps réel (WebSocket)** — annoncé section 3 mais jamais branché : le worker publie déjà sur Redis, personne ne consomme. Le produit fonctionne aujourd'hui en pur REST sans rafraîchissement automatique des scores live. Décider si c'est un prérequis au lancement ou un palier suivant.
- **Upload d'avatar / Cloudflare R2** — variables d'env prévues (section 8) mais aucune intégration ni endpoint d'upload (R2 n'est utilisé, pour l'instant, que par `scripts/backup-postgres.sh`) ; avatars figés sur un placeholder Dicebear. Pas bloquant pour lancer, mais à assumer explicitement comme limitation connue.
- Modération des commentaires/signalement de contenu — pas traité pour le MVP
- Développement complet de la recherche de **match** (la recherche d'**utilisateur**, elle, est implémentée depuis le 2026-09-20 — voir section 7)
- Suite de tests (unitaires/e2e) — toujours pas construite à ce jour ; le job `build-and-push` de `deploy.yml` n'en bloque donc encore aucun
- ~~Noms exacts des champs JSON retournés par les endpoints TheSportsDB~~ — ✅ vérifié par appels réels le 2026-09-16, voir section 2 (mapping mis à jour)
- ~~Mapping des statuts `strStatus` hors du triptyque `scheduled`/`live`/`finished`~~ — ✅ tranché le 2026-09-16 : enum `matches.status` étendu à 7 valeurs, voir section 6 et section 2 pour la table de correspondance complète
- ~~Topologie DNS/reverse-proxy et cookie d'auth~~ — ✅ tranché le 2026-09-20 : Caddy en reverse-proxy unique, routage par chemin, same-origin (voir section 9)
- ~~Postgres managé (Neon) ou conteneur~~ — ✅ tranché le 2026-09-20 : conteneur sur le VPS + backups pg_dump vers R2 (voir section 3 et 9)

