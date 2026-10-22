import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Authentification facultative : la route reste accessible sans cookie, mais `req.user` est
// renseigné quand il y en a un. Utilisé par les routes dont la RÉPONSE dépend du visiteur sans
// qu'il soit obligatoire — typiquement les profils privés (issue #54), où un visiteur anonyme
// doit recevoir une version réduite plutôt qu'un 401.
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(_err: unknown, user: TUser): TUser | undefined {
    return user || undefined;
  }
}
