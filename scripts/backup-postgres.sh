#!/bin/sh
# Backup quotidien de Postgres vers Cloudflare R2 (S3-compatible) — voir architecture.md
# section 9. Décision du 2026-09-20 : Postgres tourne en conteneur sur le VPS (pas Neon), donc
# les backups sont à notre charge.
#
# Prérequis sur le VPS (pas dans le conteneur) : awscli installé (`apt install awscli`).
# À planifier via crontab de l'utilisateur de déploiement, ex (tous les jours à 3h) :
#   0 3 * * * /opt/football-app/scripts/backup-postgres.sh >> /var/log/football-backup.log 2>&1
#
# Variables lues depuis /opt/football-app/.env (mêmes identifiants R2 que STORAGE_* si le même
# bucket est réutilisé, ou un bucket dédié aux backups — au choix).
set -eu

cd "$(dirname "$0")/.."
# shellcheck disable=SC1091
[ -f .env ] && . ./.env

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
DUMP_FILE="/tmp/football-app-${STAMP}.dump"

# awscli attend ces noms précis, différents de nos STORAGE_ACCESS_KEY/STORAGE_SECRET_KEY.
export AWS_ACCESS_KEY_ID="${STORAGE_ACCESS_KEY}"
export AWS_SECRET_ACCESS_KEY="${STORAGE_SECRET_KEY}"

docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB:-football_app}" -F custom > "${DUMP_FILE}"

aws s3 cp "${DUMP_FILE}" "s3://${STORAGE_BUCKET}/postgres-backups/football-app-${STAMP}.dump" \
  --endpoint-url "${STORAGE_ENDPOINT}"

rm -f "${DUMP_FILE}"

echo "[backup-postgres] OK : football-app-${STAMP}.dump envoyé sur ${STORAGE_BUCKET}"
