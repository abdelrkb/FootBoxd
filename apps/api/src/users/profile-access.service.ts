import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

// Droit de voir le CONTENU d'un profil (issue #54) : profil privé non suivi, ou visiteur bloqué
// par le propriétaire. Jusqu'ici la règle n'existait que côté navigateur, donc un appel direct
// à l'API renvoyait le contenu d'un compte privé.
//
// Volontairement sans dépendance à UsersService / FollowsService : ces deux modules s'importent
// déjà mutuellement, et le service est utilisé des deux côtés (profil, abonnés/abonnements,
// matchs notés). En ne dépendant que de Prisma, il reste une feuille — pas de forwardRef.
@Injectable()
export class ProfileAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async canViewContent(viewerId: string | null, targetId: string): Promise<boolean> {
    if (viewerId === targetId) return true;

    const target = await this.prisma.client.user.findUnique({
      where: { id: targetId },
      select: { isPrivate: true, deletedAt: true },
    });
    if (!target || target.deletedAt) throw new NotFoundException('Utilisateur introuvable');

    if (viewerId) {
      const blockedByOwner = await this.prisma.client.block.findUnique({
        where: { blockerId_blockedId: { blockerId: targetId, blockedId: viewerId } },
      });
      if (blockedByOwner) return false;
    }

    if (!target.isPrivate) return true;
    if (!viewerId) return false;

    const follow = await this.prisma.client.follow.findUnique({
      where: { followerId_followingId: { followerId: viewerId, followingId: targetId } },
    });
    return follow !== null;
  }

  async assertCanViewContent(viewerId: string | null, targetId: string): Promise<void> {
    if (!(await this.canViewContent(viewerId, targetId))) {
      throw new ForbiddenException('Ce profil est privé');
    }
  }
}
