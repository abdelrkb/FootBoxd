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

| Email | Mot de passe |
|---|---|
| `alice@test.com` | `password123` |
| `bob@test.com` | `password123` |

Les deux ont les 7 ligues principales (5 grands championnats + Ligue des Champions + Europa League) en favori.

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
  docker compose restart api worker
  ```
  (le client Prisma généré est packagé dans l'image, pas monté en volume — donc `prisma generate` lancé sur ta machine ne suffit pas, il faut le refaire dans le conteneur)

## Commandes utiles

```bash
docker compose ps                    # état des conteneurs
docker compose logs -f api           # logs en direct (ou worker, web)
docker compose down                  # tout arrêter (les données Postgres restent dans le volume)
docker compose down -v               # tout arrêter ET supprimer les données
```

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
