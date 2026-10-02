import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    setupFiles: ['./test/setup-env.ts'],
    // Un seul worker : les specs e2e partagent la même base Postgres de dev (pas de DB de test
    // dédiée pour l'instant), les lancer en parallèle risquerait des interférences.
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
