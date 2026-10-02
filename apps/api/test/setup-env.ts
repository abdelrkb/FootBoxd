// Chargé par vitest AVANT l'import de AppModule dans les specs e2e (voir vitest.config.e2e.ts
// `setupFiles`) — indispensable : `AuthModule` lit `process.env.JWT_SECRET` dans les métadonnées
// de son décorateur `@Module`, évaluées au chargement du module ESM, donc avant tout code exécuté
// en tête d'un fichier de test classique. `??=` : ne touche pas à un vrai `.env` déjà exporté
// (ex: lancé depuis un conteneur Docker).
process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??= 'postgresql://user:password@localhost:5433/football_app';
process.env.JWT_SECRET ??= 'e2e-test-secret';
process.env.JWT_EXPIRES_IN ??= '7d';
process.env.WEB_URL ??= 'http://localhost:3010';
