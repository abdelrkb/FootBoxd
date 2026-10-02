import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@football-app/database';
import { PrismaService } from '../prisma/prisma.service.js';

const PRISMA_UNIQUE_VIOLATION = 'P2002';
const userSummarySelect = { id: true, username: true, displayName: true, avatarUrl: true } as const;

@Injectable()
export class BlocksService {
  constructor(private readonly prisma: PrismaService) {}

  // Bloquer quelqu'un coupe aussi le lien de follow dans les deux sens (décision produit du
  // 2026-10-02) : on ne peut pas bloquer une personne qu'on suit encore, ni être suivi par
  // quelqu'un qu'on bloque.
  async block(blockerId: string, blockedId: string): Promise<void> {
    if (blockerId === blockedId) {
      throw new BadRequestException('Impossible de se bloquer soi-même');
    }
    const target = await this.prisma.client.user.findUnique({ where: { id: blockedId } });
    if (!target) throw new NotFoundException('Utilisateur introuvable');

    try {
      await this.prisma.client.block.create({ data: { blockerId, blockedId } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === PRISMA_UNIQUE_VIOLATION) {
        return; // déjà bloqué, idempotent
      }
      throw err;
    }
    await this.prisma.client.follow.deleteMany({
      where: { OR: [{ followerId: blockerId, followingId: blockedId }, { followerId: blockedId, followingId: blockerId }] },
    });
  }

  async unblock(blockerId: string, blockedId: string): Promise<void> {
    await this.prisma.client.block.deleteMany({ where: { blockerId, blockedId } });
  }

  // Vérifie un blocage dans N'IMPORTE QUEL sens — utilisé pour interdire une interaction
  // (follow, like, commentaire) entre deux utilisateurs dès qu'un blocage existe entre eux,
  // peu importe qui a bloqué qui.
  async isEitherBlocked(userAId: string, userBId: string): Promise<boolean> {
    const link = await this.prisma.client.block.findFirst({
      where: {
        OR: [
          { blockerId: userAId, blockedId: userBId },
          { blockerId: userBId, blockedId: userAId },
        ],
      },
    });
    return link !== null;
  }

  // Statut affiché sur un profil (handoff produit du 2026-10-02) : si le PROPRIÉTAIRE du
  // profil a bloqué le visiteur, le profil affiche "Vous êtes bloqué par cet utilisateur" et
  // masque les actions d'interaction ; si c'est le visiteur qui a bloqué le propriétaire, le
  // bouton "Suivre" devient "Débloquer".
  async getBlockStatus(viewerId: string, profileOwnerId: string): Promise<{ blockedByOwner: boolean; viewerHasBlocked: boolean }> {
    const [blockedByOwner, viewerHasBlocked] = await Promise.all([
      this.prisma.client.block.findUnique({
        where: { blockerId_blockedId: { blockerId: profileOwnerId, blockedId: viewerId } },
      }),
      this.prisma.client.block.findUnique({
        where: { blockerId_blockedId: { blockerId: viewerId, blockedId: profileOwnerId } },
      }),
    ]);
    return { blockedByOwner: blockedByOwner !== null, viewerHasBlocked: viewerHasBlocked !== null };
  }

  findBlockedUsers(userId: string) {
    return this.prisma.client.block
      .findMany({ where: { blockerId: userId }, include: { blocked: { select: userSummarySelect } } })
      .then((rows) => rows.map((r) => r.blocked));
  }
}
