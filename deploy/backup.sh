#!/usr/bin/env bash
set -euo pipefail
cd /opt/apps/football-app
mkdir -p /opt/backups/football
docker compose -f docker-compose.prod.yml exec -T postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" football_app' \
  | gzip > "/opt/backups/football/$(date +%F).sql.gz"
find /opt/backups/football -name '*.sql.gz' -mtime +14 -delete
