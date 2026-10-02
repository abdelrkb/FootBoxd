import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { prisma } from '@football-app/database';
import { createTestApp, uniqueEmail, FakeEmailService } from './test-app.js';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let fakeEmail: FakeEmailService;
  // Par id, pas par email : la suppression de compte change l'email (anonymisation), un
  // nettoyage par email laisserait ces lignes orphelines en base de dev à chaque run.
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    ({ app, fakeEmail } = await createTestApp());
  });

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await app.close();
  });

  async function register(overrides: Partial<{ email: string; password: string; displayName: string; username: string }> = {}) {
    const email = overrides.email ?? uniqueEmail('register');
    const username = overrides.username ?? `e2e_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        password: overrides.password ?? 'password123',
        displayName: overrides.displayName ?? 'Test E2E',
        username,
      });
    if (res.body?.id) createdUserIds.push(res.body.id);
    return { res, email, username, id: res.body?.id as string | undefined };
  }

  it("inscrit un compte email/mot de passe, pose le cookie, et laisse l'email non vérifié", async () => {
    const { res, email } = await register();
    expect(res.status).toBe(201);
    expect(res.body.email).toBe(email);
    expect(res.body.emailVerifiedAt).toBeNull();
    expect(res.body.passwordHash).toBeUndefined();
    expect(res.headers['set-cookie']?.[0]).toMatch(/access_token=/);
  });

  it('refuse un second compte avec le même email', async () => {
    const { email, username } = await register();
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'password123', displayName: 'Autre', username: `${username}_2` });
    expect(res.status).toBe(409);
  });

  it('vérifie un compte avec le bon code, rejette un mauvais code, refuse de le rejouer', async () => {
    const unauth = await request(app.getHttpServer()).post('/auth/verify-email').send({ code: '000000' });
    expect(unauth.status).toBe(401); // pas de cookie attaché

    const agent = request.agent(app.getHttpServer());
    const email = uniqueEmail('verify');
    const registerRes = await agent
      .post('/auth/register')
      .send({ email, password: 'password123', displayName: 'Vérif E2E', username: `e2e_verify_${Date.now()}` });
    createdUserIds.push(registerRes.body.id);

    const badCode = await agent.post('/auth/verify-email').send({ code: '111111' });
    expect(badCode.status).toBe(400);

    const code = fakeEmail.latestCodeFor(email, 'verification');
    const goodCode = await agent.post('/auth/verify-email').send({ code });
    expect(goodCode.status).toBe(200);
    expect(goodCode.body.emailVerifiedAt).not.toBeNull();

    const replay = await agent.post('/auth/verify-email').send({ code });
    expect(replay.status).toBe(400);
  });

  it('login avec les bons identifiants réussit, avec un mauvais mot de passe échoue', async () => {
    const password = 'correct-horse-1';
    const { email } = await register({ password });

    const bad = await request(app.getHttpServer()).post('/auth/login').send({ email, password: 'wrong-password' });
    expect(bad.status).toBe(401);

    const ok = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
    expect(ok.status).toBe(200);
    expect(ok.body.email).toBe(email);
    expect(ok.headers['set-cookie']?.[0]).toMatch(/access_token=/);
  });

  it('réinitialise le mot de passe par code et invalide les anciennes sessions', async () => {
    const oldPassword = 'first-password-1';
    const newPassword = 'second-password-2';
    const { email } = await register({ password: oldPassword });

    const agent = request.agent(app.getHttpServer());
    await agent.post('/auth/login').send({ email, password: oldPassword });
    const meBefore = await agent.get('/auth/me');
    expect(meBefore.status).toBe(200);

    // forgot-password répond pareil que l'email existe ou non (anti-énumération).
    const forgotUnknown = await request(app.getHttpServer()).post('/auth/forgot-password').send({ email: uniqueEmail('nope') });
    expect(forgotUnknown.status).toBe(200);

    const forgot = await request(app.getHttpServer()).post('/auth/forgot-password').send({ email });
    expect(forgot.status).toBe(200);
    const code = fakeEmail.latestCodeFor(email, 'reset');

    const reset = await request(app.getHttpServer()).post('/auth/reset-password').send({ email, code, newPassword });
    expect(reset.status).toBe(200);

    const oldLogin = await request(app.getHttpServer()).post('/auth/login').send({ email, password: oldPassword });
    expect(oldLogin.status).toBe(401);
    const newLogin = await request(app.getHttpServer()).post('/auth/login').send({ email, password: newPassword });
    expect(newLogin.status).toBe(200);

    // Le cookie obtenu AVANT le reset doit être invalidé (tokenVersion bumped) — voir
    // jwt.strategy.ts.
    const meAfter = await agent.get('/auth/me');
    expect(meAfter.status).toBe(401);
  });

  it('anonymise le compte à la suppression et invalide la session', async () => {
    const password = 'delete-me-123';
    const { email, id } = await register({ password });

    const agent = request.agent(app.getHttpServer());
    await agent.post('/auth/login').send({ email, password });

    const del = await agent.delete('/auth/me').send({ password });
    expect(del.status).toBe(200);

    const meAfter = await agent.get('/auth/me');
    expect(meAfter.status).toBe(401);

    const anonymized = await prisma.user.findUnique({ where: { id } });
    expect(anonymized?.email).not.toBe(email);
    expect(anonymized?.displayName).toBe('Utilisateur supprimé');
    expect(anonymized?.passwordHash).toBeNull();
    expect(anonymized?.deletedAt).not.toBeNull();
  });
});
