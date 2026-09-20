# Football App

App type "Letterboxd du sport" : noter/reviewer des matchs de foot, suivre des amis, commenter leurs reviews.

Voir [architecture.md](./architecture.md) pour le détail complet (modèle de données, stack, stratégie de polling, décisions prises en cours d'implémentation).

## Prérequis

- Docker + Docker Compose
- Une clé API [TheSportsDB](https://www.thesportsdb.com/) (plan Premium)

## Lancer le projet

1. Copier `.env.example` en `.env` et renseigner au minimum `SPORTS_API_KEY` et `JWT_SECRET`.
2. Lancer toute la stack :

```bash
docker compose up -d --build
```

(`docker-compose` avec un tiret si `docker compose` sans tiret ne fonctionne pas sur ta machine — les deux existent selon les installs)

Ça démarre 5 services : Postgres, Redis, l'API NestJS, le worker de polling TheSportsDB, et le frontend Next.js.

- **Frontend** : http://localhost:3010
- **API** : http://localhost:3000

Si ces ports sont déjà pris par autre chose sur ta machine, édite `docker-compose.yml` (section `ports` des services `web`/`api`) et adapte `WEB_URL` dans `.env` en conséquence (utilisé par le CORS de l'API et les redirections OAuth).

## Comptes de test

| Email | Mot de passe | Pseudo (`username`) |
|---|---|---|
| `alice@test.com` | `password123` | `alice_7f379a` |
| `bob@test.com` | `password123` | `bob_c07e0b` |

Les deux ont les 7 ligues principales (5 grands championnats + Ligue des Champions + Europa League) en favori. Les pseudos ci-dessus ont été générés automatiquement lors de l'ajout de la colonne `username` (2026-09-20, migration de backfill) — pratiques pour tester la recherche d'utilisateur (`/search`).

## Développement au quotidien

Une fois les images buildées une première fois, `docker-compose.override.yml` (chargé automatiquement) monte le code source en volume et lance chaque service en mode watch — donc en théorie, pas besoin de rebuild à chaque modif :

```bash
docker compose up -d
```

**En pratique**, le détecteur de fichiers (Turbopack pour le web, watch mode pour l'API/worker) ne détecte pas toujours les changements à travers le montage Docker sur macOS — en particulier pour un **fichier nouvellement créé**. Si tes changements n'apparaissent pas :

```bash
docker compose restart api web
```

### Quand un vrai rebuild est nécessaire

- Ajout/changement d'une dépendance npm (`package.json`) → `docker compose up -d --build`
- Changement du schéma Prisma (`packages/database/prisma/schema.prisma`) → soit un rebuild complet, soit plus rapide :
  ```bash
  docker exec appfoot-api-1 sh -c "cd /repo/packages/database && npx prisma generate"
  docker exec appfoot-worker-1 sh -c "cd /repo/packages/database && npx prisma generate"
  docker compose restart api worker web
  ```
  (le client Prisma généré est packagé dans **chaque** image — `api` ET `worker`, pas seulement `api` — et n'est pas monté en volume : `prisma generate` lancé sur ta machine ne suffit pas, il faut le refaire dans **les deux** conteneurs, sinon celui qu'on a oublié plante au premier accès à un champ/modèle ajouté. `web` n'a pas de client Prisma mais mérite un restart aussi si tu as ajouté un fichier frontend qui n'apparaît pas — voir juste au-dessus.)
- Nouvelle route/fichier ajouté au **worker** (pas juste une modif d'un fichier existant) → le watch mode ne le détecte pas toujours à travers le montage Docker : `docker compose restart worker` pour être sûr (vécu le 2026-09-20 avec l'ajout du sync des faits de match, resté silencieux 3 jours avant un restart manuel).

## Commandes utiles

```bash
docker compose ps                    # état des conteneurs
docker compose logs -f api           # logs en direct (ou worker, web)
docker compose down                  # tout arrêter (les données Postgres restent dans le volume)
docker compose down -v               # tout arrêter ET supprimer les données
```

## Déploiement en production

Voir [architecture.md](./architecture.md) section 9 pour le plan complet (Hetzner CX23, Postgres en conteneur + backups R2, reverse-proxy Caddy, CI/CD). Fichiers dédiés à la prod, distincts de tout ce qui précède (qui est pour le dev local uniquement) :

- [`docker-compose.prod.yml`](./docker-compose.prod.yml) — autonome, à utiliser seul (`docker compose -f docker-compose.prod.yml ...`), jamais combiné avec `docker-compose.yml`
- [`Caddyfile`](./Caddyfile) — domaine à renseigner avant le premier déploiement
- [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) — build + push ghcr.io + déploiement SSH sur push `main`
- [`scripts/backup-postgres.sh`](./scripts/backup-postgres.sh) — à planifier en cron sur le VPS

⚠️ Jamais testé en conditions réelles à ce jour (pas de VPS provisionné) — prévoir un premier déploiement manuel de validation avant d'activer le déclenchement automatique.

## Structure du monorepo

```
apps/
  web/       # Next.js — frontend
  api/       # NestJS — API REST
  worker/    # Service de polling TheSportsDB
  mobile/    # React Native (plus tard)
packages/
  database/  # Schéma Prisma + client partagé
  shared-types/  # Types TS partagés entre web/api/worker
  config/    # ESLint / TS config partagés
```
