FROM node:22-alpine AS base
WORKDIR /repo

COPY package.json package-lock.json* ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/config/package.json packages/config/package.json
RUN npm install

COPY packages ./packages
COPY apps/web ./apps/web

ARG NEXT_PUBLIC_API_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build --workspace=@football-app/web

EXPOSE 3000
CMD ["npm", "run", "start", "--workspace=@football-app/web"]
