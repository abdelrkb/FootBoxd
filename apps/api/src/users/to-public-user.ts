import type { User } from '@football-app/database';

export type PublicUser = Omit<User, 'passwordHash'>;

// Retire le hash de mot de passe avant de renvoyer un User au client — à appeler sur tout
// retour d'un `user.update`/`user.create` Prisma exposé par un contrôleur (sinon le hash part
// tel quel dans le JSON, comme c'était le cas avant sur les routes PATCH /users/me/*).
export function toPublicUser(user: User): PublicUser {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}
