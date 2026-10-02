import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { prisma } from '@football-app/database';
import { createTestApp, uniqueEmail } from './test-app.js';

describe('Reviews (e2e)', () => {
  let app: INestApplication;
  const createdUserIds: string[] = [];
  let matchId: string;

  beforeAll(async () => {
    ({ app } = await createTestApp());
    // Un match "finished" est requis pour logger une review (reviews.service.ts `create`) — on
    // réutilise une donnée réelle déjà synchronisée par le worker plutôt que d'en fabriquer une,
    // cette suite tourne contre la base de dev partagée (voir vitest.config.e2e.ts).
    const finishedMatch = await prisma.match.findFirst({ where: { status: 'finished' } });
    if (!finishedMatch) {
      throw new Error("Aucun match 'finished' en base — lance le worker au moins une fois avant ces tests");
    }
    matchId = finishedMatch.id;
  });

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await app.close();
  });

  async function registeredAgent(prefix: string) {
    const agent = request.agent(app.getHttpServer());
    const res = await agent.post('/auth/register').send({
      email: uniqueEmail(prefix),
      password: 'password123',
      displayName: `E2E ${prefix}`,
      username: `e2e_${prefix}_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`,
    });
    createdUserIds.push(res.body.id);
    return { agent, userId: res.body.id as string };
  }

  it("logge un match, refuse une deuxième review du même utilisateur sur le même match, modifie et supprime", async () => {
    const { agent } = await registeredAgent('author');

    const create = await agent.post('/reviews').send({ matchId, rating: 4, comment: 'Beau match' });
    expect(create.status).toBe(201);
    expect(create.body.matchId).toBe(matchId);
    // `rating` est un Decimal Prisma sérialisé en string (shared-types Review.rating, ex "4.0")
    // — comparaison numérique pour ne pas dépendre du nombre exact de décimales affichées.
    expect(Number(create.body.rating)).toBe(4);
    const reviewId = create.body.id as string;

    const duplicate = await agent.post('/reviews').send({ matchId, rating: 2 });
    expect(duplicate.status).toBe(409);

    const invalidRating = await agent.post('/reviews').send({ matchId: matchId, rating: 3.3 });
    expect(invalidRating.status).toBe(400);

    const update = await agent.patch(`/reviews/${reviewId}`).send({ rating: 5, comment: 'Encore mieux à la relecture' });
    expect(update.status).toBe(200);
    expect(Number(update.body.rating)).toBe(5);

    const del = await agent.delete(`/reviews/${reviewId}`);
    expect(del.status).toBe(204);

    const afterDelete = await request(app.getHttpServer()).get(`/reviews/${reviewId}`);
    expect(afterDelete.status).toBe(404);
  });

  it("aime et commente la review d'un autre utilisateur, les compteurs reflètent l'activité", async () => {
    const { agent: authorAgent } = await registeredAgent('author2');
    const { agent: otherAgent, userId: otherUserId } = await registeredAgent('liker');

    const create = await authorAgent.post('/reviews').send({ matchId, rating: 3.5 });
    expect(create.status).toBe(201);
    const reviewId = create.body.id as string;

    const like = await otherAgent.post(`/reviews/${reviewId}/like`);
    expect(like.status).toBe(200);

    const comment = await otherAgent.post(`/reviews/${reviewId}/comments`).send({ content: 'Bien vu !' });
    expect(comment.status).toBe(201);
    expect(comment.body.userId).toBe(otherUserId);

    const detail = await request(app.getHttpServer()).get(`/reviews/${reviewId}`);
    expect(detail.body._count.likes).toBe(1);
    expect(detail.body._count.comments).toBe(1);

    const comments = await request(app.getHttpServer()).get(`/reviews/${reviewId}/comments`);
    expect(comments.body).toHaveLength(1);
    expect(comments.body[0].content).toBe('Bien vu !');
  });

  it('empêche de liker/commenter après un blocage, dans les deux sens', async () => {
    const { agent: authorAgent, userId: authorId } = await registeredAgent('blockedauthor');
    const { agent: otherAgent } = await registeredAgent('blocker');

    const create = await authorAgent.post('/reviews').send({ matchId, rating: 2 });
    const reviewId = create.body.id as string;

    const blockRes = await otherAgent.post(`/users/${authorId}/block`);
    expect(blockRes.status).toBe(200);

    const like = await otherAgent.post(`/reviews/${reviewId}/like`);
    expect(like.status).toBe(403);

    const comment = await otherAgent.post(`/reviews/${reviewId}/comments`).send({ content: 'Interdit' });
    expect(comment.status).toBe(403);
  });
});
