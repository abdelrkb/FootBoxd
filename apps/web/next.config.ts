import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @football-app/shared-types est un package du monorepo sans étape de build (TS source
  // directement), Next.js doit donc le transpiler comme du code applicatif.
  transpilePackages: ["@football-app/shared-types"],
};

export default nextConfig;
