import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // @football-app/shared-types est un package du monorepo sans étape de build (TS source
  // directement), Next.js doit donc le transpiler comme du code applicatif.
  transpilePackages: ["@football-app/shared-types"],
};

// i18n (issue #27) : pas de routing par préfixe d'URL (décision produit du 2026-10-22) — la
// langue vit dans un cookie, résolue dans i18n/request.ts. withNextIntl se contente de câbler
// ./i18n/request.ts comme config de requête, sans toucher aux routes.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
