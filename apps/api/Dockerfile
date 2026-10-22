FROM node:22-alpine AS base
WORKDIR /repo

# Sans openssl installé, Prisma ne détecte pas la version d'OpenSSL au runtime et se rabat sur
# un défaut "openssl-1.1.x" incorrect (Alpine 3.24 n'a que libssl3) — moteur introuvable au
# démarrage. Trouvé en testant `docker compose up` en réel le 2026-09-16.
RUN apk add --no-cache openssl

COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/config/package.json packages/config/package.json
RUN npm install

COPY packages ./packages
COPY apps/api ./apps/api

RUN npm run generate --workspace=@football-app/database
RUN npm run build --workspace=@football-app/api

EXPOSE 3000
# Le builder SWC (nest-cli.json) imbrique la sortie sous dist/src/ (pas dist/ comme le
# builder tsc par défaut) — vérifié en réel sur le premier déploiement de prod, 2026-10-22 :
# le conteneur crashait en boucle avec "Cannot find module '/repo/apps/api/dist/main.js'".
CMD ["node", "apps/api/dist/src/main.js"]
